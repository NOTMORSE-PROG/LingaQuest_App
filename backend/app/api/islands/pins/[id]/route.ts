import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { ISLAND_PASS_THRESHOLD, SERVER_ERRORS } from "@/lib/constants";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: SERVER_ERRORS.UNAUTHORIZED }, { status: 401 });

    const { id } = await params;
    const pin = await prisma.pin.findUnique({
      where: { id },
      include: {
        challenges: { orderBy: { sortOrder: "asc" } },
        island: {
          select: {
            number: true,
            name: true,
            skillFocus: true,
            npcDialogueIntro: true,
            npcDialogueSuccess: true,
            npcDialogueFail: true,
            npcAudioIntro: true,
            npcAudioSuccess: true,
            npcAudioFail: true,
            ingayAudioUrl: true,
            ingayDialogue: true,
          },
        },
      },
    });

    if (!pin) {
      return NextResponse.json({ error: SERVER_ERRORS.NOT_FOUND("Pin") }, { status: 404 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { email: true },
    });
    const devEmails = (process.env.DEV_EMAILS ?? "andreicondino2@gmail.com")
      .split(",")
      .map((e) => e.trim());
    const isDevUser = devEmails.includes(dbUser?.email ?? "");

    // BUG 21 FIX: verify this pin's island is unlocked for the requesting user
    if (pin.island.number > 1 && !isDevUser) {
      const precedingIslands = await prisma.island.findMany({
        where: { number: { lt: pin.island.number } },
        include: { pins: { select: { id: true } } },
        orderBy: { number: "asc" },
      });
      const allProgress = await prisma.progress.findMany({
        where: { userId: auth.userId, isCompleted: true },
        select: { pinId: true, accuracy: true },
      });
      const completedPinIds = new Set(allProgress.map((p) => p.pinId));
      const accuracyMap = new Map(allProgress.map((p) => [p.pinId, p.accuracy]));
      const isUnlocked = precedingIslands.every((prev) => {
        if (!prev.pins.every((p) => completedPinIds.has(p.id))) return false;
        if (prev.pins.length === 0) return true;
        const avg =
          prev.pins.reduce((sum, p) => sum + (accuracyMap.get(p.id) ?? 0), 0) /
          prev.pins.length;
        return avg >= ISLAND_PASS_THRESHOLD;
      });
      if (!isUnlocked) {
        return NextResponse.json({ error: SERVER_ERRORS.FORBIDDEN }, { status: 403 });
      }
    }

    const userProgress = await prisma.progress.findUnique({
      where: { userId_pinId: { userId: auth.userId, pinId: id } },
      select: { isCompleted: true, accuracy: true },
    });

    return NextResponse.json({
      ...pin,
      isCompleted: userProgress?.isCompleted ?? false,
      accuracy: userProgress?.accuracy ?? null,
      isDevUser,
    });
  } catch (err: unknown) {
    console.error("[GET /api/islands/pins/[id]]", err);
    return NextResponse.json({ error: SERVER_ERRORS.INTERNAL }, { status: 500 });
  }
}
