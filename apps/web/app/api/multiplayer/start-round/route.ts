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
    return NextResponse.json({ error: "Only the host can start rounds." }, { status: 403 });
  if (room.status === "FINISHED")
    return NextResponse.json({ error: "Game is already finished." }, { status: 409 });

  // Determine which round number we're starting
  const nextRound = room.status === "WAITING" ? 1 : room.currentRound;

  // Idempotency guard: if round already active, don't re-fire the event
  if (nextRound === room.currentRound && room.status === "ACTIVE") {
    return NextResponse.json({ ok: true, round: nextRound });
  }

  if (nextRound > room.roundCount) {
    // All rounds done — end the game
    await prisma.multiplayerRoom.update({
      where: { id: roomId },
      data: { status: "FINISHED" },
    });
    await pusher.trigger(roomChannel(roomId), "game:end", {
      shipHealth: room.shipHealth,
    });
    return NextResponse.json({ ok: true, ended: true });
  }

  // Pick challenge for this round: use full challenge pool ordered deterministically
  const challenges = await prisma.challenge.findMany({
    orderBy: [
      { pin: { island: { number: "asc" } } },
      { pin: { number: "asc" } },
      { sortOrder: "asc" },
    ],
  });

  if (challenges.length === 0) {
    return NextResponse.json({ error: "No challenges in database. Run seed first." }, { status: 500 });
  }

  const challenge = challenges[(nextRound - 1) % challenges.length];

  // Activate the room if it was waiting
  await prisma.multiplayerRoom.update({
    where: { id: roomId },
    data: {
      status: "ACTIVE",
      currentRound: nextRound,
    },
  });

  // Emit round start to all players
  await pusher.trigger(roomChannel(roomId), "round:start", {
    round: nextRound,
    totalRounds: room.roundCount,
    audioUrl: challenge.audioUrl,
    question: challenge.question,
    choices: challenge.choices,
    challengeId: challenge.id, // so clients can identify the challenge
  });

  return NextResponse.json({ ok: true, round: nextRound });
}
