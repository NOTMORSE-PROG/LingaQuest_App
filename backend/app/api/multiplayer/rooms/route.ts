import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { pusher, roomChannel } from "@/lib/pusher";
import { generateRoomCode, INITIAL_SHIP_HEALTH } from "@/lib/ship";

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roundCount = 5 } = await req.json();

  if (roundCount < 1 || roundCount > 7) {
    return NextResponse.json({ error: "Round count must be 1–7." }, { status: 400 });
  }

  // Generate unique room code
  let code = generateRoomCode();
  let attempts = 0;
  while (await prisma.multiplayerRoom.findUnique({ where: { code } })) {
    code = generateRoomCode();
    if (++attempts > 10) {
      return NextResponse.json({ error: "Failed to generate room code." }, { status: 500 });
    }
  }

  const room = await prisma.multiplayerRoom.create({
    data: {
      code,
      hostId: auth.userId,
      roundCount,
      shipHealth: INITIAL_SHIP_HEALTH as object,
      players: {
        create: { userId: auth.userId },
      },
    },
    include: { players: { include: { user: { select: { id: true, username: true } } } } },
  });

  return NextResponse.json({
    code: room.code,
    roomId: room.id,
    room: {
      ...room,
      players: room.players.map((p) => ({
        userId: p.user.id,
        username: p.user.username,
        joinedAt: p.joinedAt,
      })),
    },
  });
}
