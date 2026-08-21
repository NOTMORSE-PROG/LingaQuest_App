import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { pusher, roomChannel } from "@/lib/pusher";

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomId } = await req.json();
  if (!roomId) {
    return NextResponse.json({ error: "roomId is required." }, { status: 400 });
  }

  const room = await prisma.multiplayerRoom.findUnique({
    where: { id: roomId },
    include: { players: { orderBy: { joinedAt: "asc" } } },
  });

  if (!room) {
    // Already gone — treat as success so the client can clean up.
    return NextResponse.json({ ok: true });
  }

  // Idempotent: only act if the user is actually in the room.
  const isMember = room.players.some((p) => p.userId === auth.userId);
  if (!isMember) {
    return NextResponse.json({ ok: true });
  }

  // Remove the player.
  await prisma.roomPlayer.deleteMany({
    where: { roomId, userId: auth.userId },
  });

  const remaining = room.players.filter((p) => p.userId !== auth.userId);

  // If the room is now empty, mark it FINISHED so it can't be re-used.
  if (remaining.length === 0) {
    await prisma.multiplayerRoom.update({
      where: { id: roomId },
      data: { status: "FINISHED" },
    });
    return NextResponse.json({ ok: true });
  }

  // If the host left, transfer host to the next-joined player so the game can continue.
  let newHostId = room.hostId;
  if (room.hostId === auth.userId) {
    newHostId = remaining[0].userId;
    await prisma.multiplayerRoom.update({
      where: { id: roomId },
      data: { hostId: newHostId },
    });
  }

  // Notify the rest of the room with the updated player list (and possibly new host).
  const updatedRoom = await prisma.multiplayerRoom.findUnique({
    where: { id: roomId },
    include: {
      players: { include: { user: { select: { id: true, username: true } } } },
    },
  });

  await pusher.trigger(roomChannel(roomId), "room:updated", {
    ...updatedRoom,
    players: updatedRoom?.players.map((p) => ({
      userId: p.user.id,
      username: p.user.username,
      joinedAt: p.joinedAt,
    })),
  });

  return NextResponse.json({ ok: true });
}
