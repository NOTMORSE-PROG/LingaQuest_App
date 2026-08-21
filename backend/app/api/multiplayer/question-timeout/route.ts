import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { pusher, roomChannel } from "@/lib/pusher";

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
    return NextResponse.json({ error: "Only the host can trigger a timeout." }, { status: 403 });
  if (room.status !== "ACTIVE")
    return NextResponse.json({ error: "Room is not active." }, { status: 409 });

  const currentRound = room.currentRound;
  const qIdx = room.currentQuestion;

  // Guard: if already resolved, do nothing
  const existing = await prisma.roundResult.findUnique({
    where: { roomId_round_questionIndex: { roomId, round: currentRound, questionIndex: qIdx } },
  });
  if (existing) return NextResponse.json({ ok: true });

  // Get existing votes (may be partial or empty)
  const votes = await prisma.voteRecord.findMany({
    where: { roomId, round: currentRound, questionIndex: qIdx },
  });

  const roundChallenges = room.roundChallenges as { id: string; shuffledAnswer: string; shuffledChoices: { label: string; text: string }[] }[];
  const correctAnswer = roundChallenges[qIdx]?.shuffledAnswer ?? "A";

  let crewAnswer: string;
  let isCorrect: boolean;

  if (votes.length === 0) {
    // No votes = automatic wrong
    crewAnswer = "TIMEOUT";
    isCorrect = false;
  } else {
    // Majority of what exists
    const tally: Record<string, number> = {};
    for (const v of votes) {
      tally[v.chosenAnswer] = (tally[v.chosenAnswer] ?? 0) + 1;
    }
    crewAnswer = Object.entries(tally).reduce((a, b) => (a[1] >= b[1] ? a : b))[0];
    isCorrect = crewAnswer === correctAnswer;
  }

  const isGameOver = qIdx === 4;

  await prisma.$transaction([
    prisma.roundResult.upsert({
      where: { roomId_round_questionIndex: { roomId, round: currentRound, questionIndex: qIdx } },
      update: { crewAnswer, correctAnswer, isCorrect, healthDelta: isCorrect ? 1 : 0, partTarget: "hull" },
      create: { roomId, round: currentRound, questionIndex: qIdx, crewAnswer, correctAnswer, isCorrect, healthDelta: isCorrect ? 1 : 0, partTarget: "hull" },
    }),
    prisma.multiplayerRoom.update({
      where: { id: roomId },
      data: {
        currentQuestion: qIdx + 1,
        ...(isGameOver ? { status: "FINISHED" } : {}),
      },
    }),
  ]);

  await pusher.trigger(roomChannel(roomId), "round:result", {
    crewAnswer,
    correctAnswer,
    isCorrect,
    questionIndex: qIdx,
    isGameOver,
  });

  if (isGameOver) {
    const results = await prisma.roundResult.findMany({
      where: { roomId, round: currentRound },
    });
    const correctCount = results.filter((r) => r.isCorrect).length;

    await pusher.trigger(roomChannel(roomId), "game:end", {
      correctCount,
      totalQuestions: 5,
    });
  }

  return NextResponse.json({ ok: true });
}
