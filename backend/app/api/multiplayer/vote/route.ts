import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { pusher, roomChannel } from "@/lib/pusher";

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomId, answer } = await req.json();

  if (!roomId || !answer) {
    return NextResponse.json({ error: "roomId and answer are required." }, { status: 400 });
  }

  if (!["A", "B", "C", "D"].includes(answer)) {
    return NextResponse.json({ error: "answer must be A, B, C, or D." }, { status: 400 });
  }

  const room = await prisma.multiplayerRoom.findUnique({
    where: { id: roomId },
    include: { players: true },
  });

  if (!room || room.status !== "ACTIVE") {
    return NextResponse.json({ error: "Room not active." }, { status: 409 });
  }

  const currentRound = room.currentRound;
  const qIdx = room.currentQuestion;
  const playerCount = room.players.length;

  // Upsert vote + count inside a transaction to prevent race conditions
  const { votes, allVoted } = await prisma.$transaction(async (tx) => {
    await tx.voteRecord.upsert({
      where: {
        roomId_round_questionIndex_userId: {
          roomId,
          round: currentRound,
          questionIndex: qIdx,
          userId: auth.userId,
        },
      },
      update: { chosenAnswer: answer },
      create: {
        roomId,
        round: currentRound,
        questionIndex: qIdx,
        userId: auth.userId,
        chosenAnswer: answer,
      },
    });

    const allVotes = await tx.voteRecord.findMany({
      where: { roomId, round: currentRound, questionIndex: qIdx },
    });

    return { votes: allVotes, allVoted: allVotes.length >= playerCount };
  });

  await pusher.trigger(roomChannel(roomId), "vote:update", {
    userId: auth.userId,
    hasVoted: true,
    totalVotes: votes.length,
    totalPlayers: playerCount,
  });

  if (allVoted) {
    await resolveQuestion(roomId, room, votes, currentRound, qIdx);
  }

  return NextResponse.json({ ok: true });
}

async function resolveQuestion(
  roomId: string,
  room: any,
  votes: any[],
  round: number,
  qIdx: number
) {
  // Majority vote
  const tally: Record<string, number> = {};
  for (const v of votes) {
    tally[v.chosenAnswer] = (tally[v.chosenAnswer] ?? 0) + 1;
  }
  const crewAnswer = Object.entries(tally).reduce((a, b) => (a[1] >= b[1] ? a : b))[0];

  // Get correct answer from the shuffled challenge data
  const roundChallenges = room.roundChallenges as { id: string; shuffledAnswer: string; shuffledChoices: { label: string; text: string }[] }[];
  const correctAnswer = roundChallenges[qIdx]?.shuffledAnswer ?? "A";
  const isCorrect = crewAnswer === correctAnswer;

  const isGameOver = qIdx === 4; // Last question (0-indexed)

  // Guard + write inside a transaction to prevent double-resolve
  const resolved = await prisma.$transaction(async (tx) => {
    const existing = await tx.roundResult.findUnique({
      where: { roomId_round_questionIndex: { roomId, round, questionIndex: qIdx } },
    });
    if (existing) return false;

    await tx.roundResult.create({
      data: { roomId, round, questionIndex: qIdx, crewAnswer, correctAnswer, isCorrect, healthDelta: isCorrect ? 1 : 0, partTarget: "hull" },
    });
    await tx.multiplayerRoom.update({
      where: { id: roomId },
      data: {
        currentQuestion: qIdx + 1,
        ...(isGameOver ? { status: "FINISHED" } : {}),
      },
    });
    return true;
  });

  // Only send Pusher events if this call actually resolved (not a duplicate)
  if (!resolved) return;

  await pusher.trigger(roomChannel(roomId), "round:result", {
    crewAnswer,
    correctAnswer,
    isCorrect,
    questionIndex: qIdx,
    isGameOver,
  });

  if (isGameOver) {
    const results = await prisma.roundResult.findMany({
      where: { roomId, round },
    });
    const correctCount = results.filter((r) => r.isCorrect).length;

    await pusher.trigger(roomChannel(roomId), "game:end", {
      correctCount,
      totalQuestions: 5,
    });
  }
}
