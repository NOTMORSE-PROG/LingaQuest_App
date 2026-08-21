import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { SERVER_ERRORS } from "@/lib/constants";
import { checkAndAwardBadges } from "@/app/api/progress/route";

async function assertDevUser(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return { error: NextResponse.json({ error: SERVER_ERRORS.UNAUTHORIZED }, { status: 401 }) };
  const dbUser = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { email: true },
  });
  const devEmails = (process.env.DEV_EMAILS ?? "andreicondino2@gmail.com")
    .split(",")
    .map((e) => e.trim());
  const isDevUser = devEmails.includes(dbUser?.email ?? "");
  if (!isDevUser) {
    return { error: NextResponse.json({ error: SERVER_ERRORS.FORBIDDEN }, { status: 403 }) };
  }
  return { userId: auth.userId };
}

async function readIslandId(req: NextRequest): Promise<string | null> {
  const fromQuery = req.nextUrl.searchParams.get("islandId");
  if (fromQuery) return fromQuery;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const id = body?.islandId;
    return typeof id === "string" && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await assertDevUser(req);
    if (guard.error) return guard.error;
    const islandId = await readIslandId(req);
    if (!islandId) {
      return NextResponse.json({ error: "islandId is required." }, { status: 400 });
    }

    const island = await prisma.island.findUnique({
      where: { id: islandId },
      include: { pins: { select: { id: true } } },
    });
    if (!island) {
      return NextResponse.json({ error: SERVER_ERRORS.NOT_FOUND("Island") }, { status: 404 });
    }

    const now = new Date();
    await Promise.all(
      island.pins.map((pin) =>
        prisma.progress.upsert({
          where: { userId_pinId: { userId: guard.userId, pinId: pin.id } },
          update: { isCompleted: true, accuracy: 100, completedAt: now },
          create: {
            userId: guard.userId,
            pinId: pin.id,
            isCompleted: true,
            accuracy: 100,
            completedAt: now,
          },
        })
      )
    );

    try {
      await checkAndAwardBadges(guard.userId);
    } catch (badgeErr: unknown) {
      console.error("[dev island-complete] badge award failed:", badgeErr);
    }

    return NextResponse.json({ ok: true, completed: island.pins.length });
  } catch (err: unknown) {
    console.error("[POST /api/dev/island-complete]", err);
    return NextResponse.json({ error: SERVER_ERRORS.INTERNAL }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const guard = await assertDevUser(req);
    if (guard.error) return guard.error;
    const islandId = await readIslandId(req);
    if (!islandId) {
      return NextResponse.json({ error: "islandId is required." }, { status: 400 });
    }

    const island = await prisma.island.findUnique({
      where: { id: islandId },
      include: { pins: { select: { id: true } } },
    });
    if (!island) {
      return NextResponse.json({ error: SERVER_ERRORS.NOT_FOUND("Island") }, { status: 404 });
    }

    const pinIds = island.pins.map((p) => p.id);
    const result = await prisma.progress.deleteMany({
      where: { userId: guard.userId, pinId: { in: pinIds } },
    });

    return NextResponse.json({ ok: true, removed: result.count });
  } catch (err: unknown) {
    console.error("[DELETE /api/dev/island-complete]", err);
    return NextResponse.json({ error: SERVER_ERRORS.INTERNAL }, { status: 500 });
  }
}
