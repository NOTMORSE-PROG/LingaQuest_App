import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { ISLAND_PASS_THRESHOLD, SERVER_ERRORS } from "@/lib/constants";
import { checkAndAwardBadges } from "@/app/api/progress/route";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth)
      return NextResponse.json(
        { error: SERVER_ERRORS.UNAUTHORIZED },
        { status: 401 }
      );

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: SERVER_ERRORS.INVALID_BODY },
        { status: 400 }
      );
    }

    const { items } = body as {
      items: { pinId: string; accuracy: number }[];
    };
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "items array is required and must not be empty." },
        { status: 400 }
      );
    }

    // Cap at 100 items per batch to prevent abuse
    if (items.length > 100) {
      return NextResponse.json(
        { error: "Maximum 100 items per batch." },
        { status: 400 }
      );
    }

    const results = [];

    for (const item of items) {
      const { pinId, accuracy } = item;
      if (!pinId || typeof pinId !== "string") continue;

      const newAccuracy = Math.min(Math.max(accuracy ?? 0, 0), 100);

      // Preserve best score across retries (same logic as single POST)
      const existing = await prisma.progress.findUnique({
        where: { userId_pinId: { userId: auth.userId, pinId } },
      });
      const bestAccuracy = Math.max(existing?.accuracy ?? 0, newAccuracy);

      await prisma.progress.upsert({
        where: { userId_pinId: { userId: auth.userId, pinId } },
        update: {
          isCompleted: true,
          accuracy: bestAccuracy,
          completedAt: new Date(),
        },
        create: {
          userId: auth.userId,
          pinId,
          isCompleted: true,
          accuracy: bestAccuracy,
          completedAt: new Date(),
        },
      });

      results.push({
        pinId,
        accuracy: bestAccuracy,
        isPassed: bestAccuracy >= ISLAND_PASS_THRESHOLD,
      });
    }

    // Badge check once after all progress is synced (best-effort)
    try {
      await checkAndAwardBadges(auth.userId);
    } catch (badgeErr: unknown) {
      console.error(
        "[progress/batch] badge award failed — progress still saved:",
        badgeErr
      );
    }

    return NextResponse.json({ results });
  } catch (err: unknown) {
    console.error("[POST /api/progress/batch]", err);
    return NextResponse.json(
      { error: SERVER_ERRORS.INTERNAL },
      { status: 500 }
    );
  }
}
