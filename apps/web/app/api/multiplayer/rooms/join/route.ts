import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { pusher, roomChannel } from "@/lib/pusher";

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json();
  if (!code) {
    return NextResponse.json({ error: "Room code is required." }, { status: 400 });
  }

  const room = await prisma.multiplayerRoom.findUnique({
    where: { code: code.toUpperCase() },
    include: { players: true },
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  if (room.status !== "WAITING") {
    return NextResponse.json({ error: "Game already started." }, { status: 409 });
  }

  if (room.players.length >= 6) {
    return NextResponse.json({ error: "Room is full (max 6 players)." }, { status: 409 });
  }

  // Add player (idempotent)
  await prisma.roomPlayer.upsert({
    where: { roomId_userId: { roomId: room.id, userId: auth.userId } },
    update: {},
    create: { roomId: room.id, userId: auth.userId },
  });

  // Notify room of update
  const updatedRoom = await prisma.multiplayerRoom.findUnique({
    where: { id: room.id },
    include: {
      players: { include: { user: { select: { id: true, username: true } } } },
    },
  });

  await pusher.trigger(roomChannel(room.id), "room:updated", {
    ...updatedRoom,
    players: updatedRoom?.players.map((p) => ({
      userId: p.user.id,
      username: p.user.username,
      joinedAt: p.joinedAt,
    })),
  });

  return NextResponse.json({ roomId: room.id });
}
