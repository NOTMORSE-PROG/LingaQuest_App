import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { SERVER_ERRORS } from "@/lib/constants";

/**
 * GET /api/progress/sync
 *
 * Returns pin-level progress + badges for the authenticated user.
 * Used by the mobile sync engine to PULL server state into local SQLite.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth)
      return NextResponse.json(
        { error: SERVER_ERRORS.UNAUTHORIZED },
        { status: 401 }
      );

    const progress = await prisma.progress.findMany({
      where: { userId: auth.userId, isCompleted: true },
      select: { pinId: true, accuracy: true },
    });

    const badges = await prisma.badge.findMany({
      where: { userId: auth.userId },
      select: { badgeType: true, earnedAt: true },
    });

    return NextResponse.json({
      progress: progress.map((p) => ({ pinId: p.pinId, accuracy: p.accuracy })),
      badges: badges.map((b) => ({
        type: b.badgeType,
        earnedAt: b.earnedAt.toISOString(),
      })),
    });
  } catch (err: unknown) {
    console.error("[GET /api/progress/sync]", err);
    return NextResponse.json(
      { error: SERVER_ERRORS.INTERNAL },
      { status: 500 }
    );
  }
}
