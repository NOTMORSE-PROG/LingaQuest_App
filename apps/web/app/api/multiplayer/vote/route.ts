import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { pusher, roomChannel } from "@/lib/pusher";
import { applyHealthDelta, isShipSunk, getMostDamagedPart } from "@/lib/ship";
import { ShipHealth, ShipPart } from "@linguaquest/shared";

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
    include: { players: true, rounds: { orderBy: { round: "desc" }, take: 1 } },
  });

  if (!room || room.status !== "ACTIVE") {
    return NextResponse.json({ error: "Room not active." }, { status: 409 });
  }

  const currentRound = room.currentRound;
  const playerCount = room.players.length;

  // Record vote (upsert — player can change vote within window)
  await prisma.voteRecord.upsert({
    where: {
      roomId_round_questionIndex_userId: {
        roomId,
        round: currentRound,
        questionIndex: 0, // simplified; extend with question tracking
        userId: auth.userId,
      },
    },
    update: { chosenAnswer: answer },
    create: {
      roomId,
      round: currentRound,
      questionIndex: 0,
      userId: auth.userId,
      chosenAnswer: answer,
    },
  });

  // Broadcast vote count update
  const votes = await prisma.voteRecord.findMany({
    where: { roomId, round: currentRound, questionIndex: 0 },
  });

  await pusher.trigger(roomChannel(roomId), "vote:update", {
    userId: auth.userId,
    hasVoted: true,
    totalVotes: votes.length,
    totalPlayers: playerCount,
  });

  // If all players voted, resolve the round
  if (votes.length >= playerCount) {
    await resolveRound(roomId, room, votes, currentRound);
  }

  return NextResponse.json({ ok: true });
}

async function resolveRound(
  roomId: string,
  room: any,
  votes: any[],
  round: number
) {
  // Majority vote — most common answer wins
  const tally: Record<string, number> = {};
  for (const v of votes) {
    tally[v.chosenAnswer] = (tally[v.chosenAnswer] ?? 0) + 1;
  }

  const crewAnswer = Object.entries(tally).reduce((a, b) =>
    a[1] >= b[1] ? a : b
  )[0];

  // Get the correct answer from the current challenge
  // (In production, track which challenge is active per round/question)
  const partTarget: ShipPart = getMostDamagedPart(room.shipHealth as ShipHealth);

  // Fetch correct answer using the same deterministic challenge pool as start-round
  const challengePool = await prisma.challenge.findMany({
    orderBy: [
      { pin: { island: { number: "asc" } } },
      { pin: { number: "asc" } },
      { sortOrder: "asc" },
    ],
    select: { id: true, answer: true },
  });
  const challenge = challengePool.length > 0
    ? challengePool[(round - 1) % challengePool.length]
    : null;
  const correctAnswer = (challenge?.answer as string) ?? "B";
  const isCorrect = crewAnswer === correctAnswer;
  const healthDelta = isCorrect ? 25 : -25;

  const newHealth = applyHealthDelta(
    room.shipHealth as ShipHealth,
    partTarget,
    healthDelta
  );

  // Save result and update room
  await prisma.$transaction([
    prisma.roundResult.upsert({
      where: { roomId_round: { roomId, round } },
      update: { crewAnswer, correctAnswer, isCorrect, healthDelta, partTarget },
      create: {
        roomId,
        round,
        crewAnswer,
        correctAnswer,
        isCorrect,
        healthDelta,
        partTarget,
      },
    }),
    prisma.multiplayerRoom.update({
      where: { id: roomId },
      data: {
        shipHealth: newHealth as object,
        status: isShipSunk(newHealth) || round >= room.roundCount ? "FINISHED" : "ACTIVE",
        currentRound: round + 1,
      },
    }),
  ]);

  const gameOver = isShipSunk(newHealth) || round >= room.roundCount;

  await pusher.trigger(roomChannel(roomId), "round:result", {
    crewAnswer,
    correctAnswer,
    isCorrect,
    healthDelta,
    partTarget,
    newShipHealth: newHealth,
    isLastRound: gameOver,
  });

  // Broadcast game end so all clients navigate to results
  if (gameOver) {
    await pusher.trigger(roomChannel(roomId), "game:end", {
      shipHealth: newHealth,
    });
  }
}
