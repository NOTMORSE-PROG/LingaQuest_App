import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
    }

    const { userId } = payload;

    // Delete in dependency order to avoid FK violations
    await prisma.voteRecord.deleteMany({ where: { userId } });
    await prisma.roomPlayer.deleteMany({ where: { userId } });
    await prisma.progress.deleteMany({ where: { userId } });
    await prisma.badge.deleteMany({ where: { userId } });

    // Rooms hosted by the user — clean up players/votes/rounds first
    const hostedRooms = await prisma.multiplayerRoom.findMany({
      where: { hostId: userId },
      select: { id: true },
    });
    const hostedRoomIds = hostedRooms.map((r) => r.id);
    if (hostedRoomIds.length > 0) {
      await prisma.voteRecord.deleteMany({ where: { roomId: { in: hostedRoomIds } } });
      await prisma.roomPlayer.deleteMany({ where: { roomId: { in: hostedRoomIds } } });
      await prisma.roundResult.deleteMany({ where: { roomId: { in: hostedRoomIds } } });
      await prisma.multiplayerRoom.deleteMany({ where: { id: { in: hostedRoomIds } } });
    }

    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[user/delete]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
