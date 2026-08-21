import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { pusher, roomChannel } from "@/lib/pusher";

type RoundChallenge = { id: string; shuffledAnswer: string; shuffledChoices: { label: string; text: string }[] };

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomId } = await req.json();
  if (!roomId) return NextResponse.json({ error: "roomId required." }, { status: 400 });

  const room = await prisma.multiplayerRoom.findUnique({ where: { id: roomId } });

  if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
  if (room.hostId !== auth.userId)
    return NextResponse.json({ error: "Only the host can advance questions." }, { status: 403 });
  if (room.status !== "ACTIVE")
    return NextResponse.json({ error: "Room is not active." }, { status: 409 });

  const qIdx = room.currentQuestion;
  if (qIdx < 1 || qIdx > 4) {
    return NextResponse.json({ error: "No next question available." }, { status: 409 });
  }

  const roundChallenges = room.roundChallenges as RoundChallenge[];
  const rc = roundChallenges[qIdx];

  if (!rc) {
    return NextResponse.json({ error: "Challenge not found." }, { status: 500 });
  }

  // Fetch audioUrl and question text from DB (shuffledChoices already stored)
  const challenge = await prisma.multiplayerChallenge.findUnique({
    where: { id: rc.id },
    select: { audioUrl: true, question: true },
  });

  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found." }, { status: 500 });
  }

  await pusher.trigger(roomChannel(roomId), "round:question", {
    round: room.currentRound,
    questionIndex: qIdx,
    totalQuestions: 5,
    audioUrl: challenge.audioUrl,
    question: challenge.question,
    choices: rc.shuffledChoices,
    challengeId: rc.id,
    partToRepair: room.currentPartTarget,
  });

  return NextResponse.json({ ok: true });
}
