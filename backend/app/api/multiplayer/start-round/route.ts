import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { pusher, roomChannel } from "@/lib/pusher";
import { shuffleChoices } from "@/lib/ship";

type RoundChallenge = { id: string; shuffledAnswer: string; shuffledChoices: { label: string; text: string }[] };

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomId } = await req.json();
  if (!roomId) return NextResponse.json({ error: "roomId required." }, { status: 400 });

  const room = await prisma.multiplayerRoom.findUnique({
    where: { id: roomId },
    include: { players: true },
  });

  if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
  if (room.hostId !== auth.userId)
    return NextResponse.json({ error: "Only the host can start." }, { status: 403 });
  if (room.status === "FINISHED")
    return NextResponse.json({ error: "Game is already finished." }, { status: 409 });

  const nextRound = room.currentRound + 1;

  if (nextRound > room.roundCount) {
    await prisma.multiplayerRoom.update({
      where: { id: roomId },
      data: { status: "FINISHED" },
    });
    await pusher.trigger(roomChannel(roomId), "game:end", {
      correctCount: 0,
      totalQuestions: 5,
    });
    return NextResponse.json({ ok: true, ended: true });
  }

  // Pick 5 random challenges from the multiplayer-only pool
  const allChallenges = await prisma.multiplayerChallenge.findMany({
    select: { id: true, choices: true, answer: true },
  });

  if (allChallenges.length === 0) {
    return NextResponse.json(
      { error: "No multiplayer challenges in database. Run seed first." },
      { status: 500 }
    );
  }

  // Fisher-Yates shuffle, take first 5
  const pool = [...allChallenges];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picked = pool.slice(0, Math.min(5, pool.length));

  const roundChallenges = picked.map((c) => {
    const { shuffledChoices, shuffledAnswer } = shuffleChoices(
      c.choices as { label: string; text: string }[],
      c.answer
    );
    return { id: c.id, shuffledAnswer, shuffledChoices };
  });

  await prisma.multiplayerRoom.update({
    where: { id: roomId },
    data: {
      status: "ACTIVE",
      currentRound: nextRound,
      currentQuestion: 0,
      currentPartTarget: null,
      roundChallenges: roundChallenges as any,
    },
  });

  // Directly emit the first question (no repair vote phase)
  const rc = roundChallenges[0];
  const firstChallenge = await prisma.multiplayerChallenge.findUnique({
    where: { id: rc.id },
    select: { audioUrl: true, question: true },
  });

  if (firstChallenge) {
    await pusher.trigger(roomChannel(roomId), "round:question", {
      round: nextRound,
      questionIndex: 0,
      totalQuestions: 5,
      audioUrl: firstChallenge.audioUrl,
      question: firstChallenge.question,
      choices: rc.shuffledChoices,
      challengeId: rc.id,
    });
  }

  return NextResponse.json({ ok: true, round: nextRound });
}
