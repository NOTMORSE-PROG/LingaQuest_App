import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { pusher, roomChannel } from "@/lib/pusher";
import { resolveRepairVote } from "@/lib/ship";
import { ShipHealth, ShipPart } from "../../../../types/multiplayer";

type RoundChallenge = { id: string; shuffledAnswer: string; shuffledChoices: { label: string; text: string }[] };

const VALID_PARTS: ShipPart[] = ["hull", "mast", "sails", "anchor", "rudder"];

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomId, part } = await req.json();

  if (!roomId || !part) {
    return NextResponse.json({ error: "roomId and part are required." }, { status: 400 });
  }

  if (!VALID_PARTS.includes(part as ShipPart)) {
    return NextResponse.json({ error: "part must be hull, mast, sails, anchor, or rudder." }, { status: 400 });
  }

  const room = await prisma.multiplayerRoom.findUnique({
    where: { id: roomId },
    include: { players: true },
  });

  if (!room || room.status !== "ACTIVE") {
    return NextResponse.json({ error: "Room not active." }, { status: 409 });
  }

  const currentRound = room.currentRound;
  const playerCount = room.players.length;

  // Upsert repair vote
  await prisma.repairVoteRecord.upsert({
    where: { roomId_round_userId: { roomId, round: currentRound, userId: auth.userId } },
    update: { chosenPart: part },
    create: { roomId, round: currentRound, userId: auth.userId, chosenPart: part },
  });

  const repairVotes = await prisma.repairVoteRecord.findMany({
    where: { roomId, round: currentRound },
  });

  await pusher.trigger(roomChannel(roomId), "repair:vote:update", {
    userId: auth.userId,
    hasVoted: true,
    totalVotes: repairVotes.length,
    totalPlayers: playerCount,
  });

  // Resolve when all players voted
  if (repairVotes.length >= playerCount) {
    const chosenPart = resolveRepairVote(
      repairVotes.map((v) => v.chosenPart),
      room.shipHealth as unknown as ShipHealth
    );

    await prisma.multiplayerRoom.update({
      where: { id: roomId },
      data: { currentPartTarget: chosenPart },
    });

    await pusher.trigger(roomChannel(roomId), "repair:vote:result", {
      chosenPart,
      shipHealth: room.shipHealth,
    });

    // Auto-broadcast first question using shuffled choices
    const roundChallenges = room.roundChallenges as RoundChallenge[];
    const rc = roundChallenges[0];

    if (rc) {
      const firstChallenge = await prisma.multiplayerChallenge.findUnique({
        where: { id: rc.id },
        select: { audioUrl: true, question: true },
      });

      if (firstChallenge) {
        await pusher.trigger(roomChannel(roomId), "round:question", {
          round: currentRound,
          questionIndex: 0,
          totalQuestions: 5,
          audioUrl: firstChallenge.audioUrl,
          question: firstChallenge.question,
          choices: rc.shuffledChoices,
          challengeId: rc.id,
          partToRepair: chosenPart,
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
