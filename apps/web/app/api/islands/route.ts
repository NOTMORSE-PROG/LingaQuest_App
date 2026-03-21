import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const islands = await prisma.island.findMany({
    orderBy: { number: "asc" },
    include: {
      pins: {
        orderBy: { sortOrder: "asc" },
        include: { challenges: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  // Determine locked status based on user's progress
  const completedPinIds = await prisma.progress
    .findMany({
      where: { userId: auth.userId, isCompleted: true },
      select: { pinId: true },
    })
    .then((rows) => new Set(rows.map((r) => r.pinId)));

  const islandsWithLock = islands.map((island, idx) => {
    const allPinsComplete = island.pins.every((p) => completedPinIds.has(p.id));
    // Island 1 always unlocked; others unlock when previous island is fully complete
    const isLocked =
      idx === 0
        ? false
        : !islands
            .slice(0, idx)
            .every((prev) => prev.pins.every((p) => completedPinIds.has(p.id)));

    return { ...island, isLocked };
  });

  return NextResponse.json(islandsWithLock);
}
