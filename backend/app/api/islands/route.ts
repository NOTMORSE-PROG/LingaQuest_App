import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { ISLAND_PASS_THRESHOLD, SERVER_ERRORS } from "@/lib/constants";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: SERVER_ERRORS.UNAUTHORIZED }, { status: 401 });

    const islands = await prisma.island.findMany({
      orderBy: { number: "asc" },
      include: {
        pins: {
          orderBy: { sortOrder: "asc" },
          include: { challenges: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });

    // Fetch all completed progress with accuracy for cumulative calculations
    const allProgress = await prisma.progress.findMany({
      where: { userId: auth.userId, isCompleted: true },
      select: { pinId: true, accuracy: true },
    });
    const completedPinIds = new Set(allProgress.map((p) => p.pinId));
    const accuracyMap = new Map(allProgress.map((p) => [p.pinId, p.accuracy]));

    const dbUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { email: true },
    });
    const devEmails = (process.env.DEV_EMAILS ?? "andreicondino2@gmail.com")
      .split(",")
      .map((e) => e.trim());
    const isDevUser = devEmails.includes(dbUser?.email ?? "");

    const islandsWithLock = islands.map((island, idx) => {
      // Island 1 always unlocked; others unlock when all pins of ALL previous islands are completed
      // AND each previous island's cumulative average accuracy is ≥ ISLAND_PASS_THRESHOLD
      const isLocked =
        isDevUser || idx === 0
          ? false
          : !islands.slice(0, idx).every((prev) => {
              if (!prev.pins.every((p) => completedPinIds.has(p.id))) return false;
              // BUG 7 FIX: island with 0 pins passes vacuously — don't divide by zero
              if (prev.pins.length === 0) return true;
              const avg =
                prev.pins.reduce((sum, p) => sum + (accuracyMap.get(p.id) ?? 0), 0) /
                prev.pins.length;
              return avg >= ISLAND_PASS_THRESHOLD;
            });

      // Compute cumulative progress for this island (for display)
      const completedCount = island.pins.filter((p) => completedPinIds.has(p.id)).length;
      const allPinsCompleted = completedCount === island.pins.length;
      const cumulativeAccuracy =
        completedCount > 0
          ? Math.round(
              island.pins
                .filter((p) => completedPinIds.has(p.id))
                .reduce((sum, p) => sum + (accuracyMap.get(p.id) ?? 0), 0) / completedCount
            )
          : null;
      const islandPassed = allPinsCompleted && (cumulativeAccuracy ?? 0) >= ISLAND_PASS_THRESHOLD;

      return { ...island, isLocked, cumulativeAccuracy, allPinsCompleted, islandPassed };
    });

    return NextResponse.json(islandsWithLock);
  } catch (err: unknown) {
    console.error("[GET /api/islands]", err);
    return NextResponse.json({ error: SERVER_ERRORS.INTERNAL }, { status: 500 });
  }
}
