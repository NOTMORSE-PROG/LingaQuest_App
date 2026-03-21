import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const progress = await prisma.progress.findMany({
    where: { userId: auth.userId },
    include: { pin: { include: { island: true } } },
  });

  // Aggregate to island-level progress
  const islands = await prisma.island.findMany({
    include: { pins: { select: { id: true } } },
    orderBy: { number: "asc" },
  });

  const completedPinIds = new Set(
    progress.filter((p) => p.isCompleted).map((p) => p.pinId)
  );

  const islandProgress = islands.map((island) => ({
    islandId: island.id,
    completedPins: island.pins.filter((p) => completedPinIds.has(p.id)).length,
    totalPins: island.pins.length,
    isUnlocked: island.number === 1,
    isCompleted: island.pins.every((p) => completedPinIds.has(p.id)),
  }));

  return NextResponse.json(islandProgress);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pinId, hintsUsed, accuracy } = await req.json();

  if (!pinId) {
    return NextResponse.json({ error: "pinId is required." }, { status: 400 });
  }

  const progress = await prisma.progress.upsert({
    where: { userId_pinId: { userId: auth.userId, pinId } },
    update: {
      isCompleted: true,
      accuracy: Math.max(accuracy ?? 0, 0),
      hintsUsed: hintsUsed ?? 0,
      completedAt: new Date(),
    },
    create: {
      userId: auth.userId,
      pinId,
      isCompleted: true,
      accuracy: accuracy ?? 0,
      hintsUsed: hintsUsed ?? 0,
      completedAt: new Date(),
    },
  });

  // Auto-award badges
  await checkAndAwardBadges(auth.userId);

  return NextResponse.json(progress);
}

async function checkAndAwardBadges(userId: string) {
  const progress = await prisma.progress.findMany({
    where: { userId, isCompleted: true },
    include: { pin: { include: { island: true } } },
  });

  const existingBadges = await prisma.badge.findMany({
    where: { userId },
    select: { badgeType: true },
  });
  const earned = new Set(existingBadges.map((b) => b.badgeType));

  const toAward: string[] = [];

  // First Steps: completed at least 1 pin
  if (progress.length >= 1 && !earned.has("first_steps")) {
    toAward.push("first_steps");
  }

  // Sharp Ear: 100% accuracy on any pin
  if (
    progress.some((p) => p.accuracy === 100) &&
    !earned.has("sharp_ear")
  ) {
    toAward.push("sharp_ear");
  }

  // Never Lost: completed a pin with 0 hints
  if (
    progress.some((p) => p.hintsUsed === 0 && p.isCompleted) &&
    !earned.has("never_lost")
  ) {
    toAward.push("never_lost");
  }

  // Island badges: check if all pins on an island are done
  const islands = await prisma.island.findMany({
    include: { pins: { select: { id: true } } },
  });
  const completedPinIds = new Set(progress.map((p) => p.pinId));

  for (const island of islands) {
    const badgeKey = `island_${island.number}` as const;
    if (
      island.pins.every((p) => completedPinIds.has(p.id)) &&
      !earned.has(badgeKey)
    ) {
      toAward.push(badgeKey);
    }
  }

  // The Captain: all 7 islands done
  if (
    islands.every((island) => island.pins.every((p) => completedPinIds.has(p.id))) &&
    !earned.has("the_captain")
  ) {
    toAward.push("the_captain");
    toAward.push("island_conqueror");
  }

  if (toAward.length > 0) {
    await prisma.badge.createMany({
      data: toAward.map((badgeType) => ({ userId, badgeType })),
      skipDuplicates: true,
    });
  }
}
