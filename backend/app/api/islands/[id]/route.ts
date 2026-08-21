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
    const island = await prisma.island.findUnique({
      where: { id },
      include: {
        pins: {
          orderBy: { sortOrder: "asc" },
          include: {
            challenges: { orderBy: { sortOrder: "asc" } },
            progress: { where: { userId: auth.userId } },
          },
        },
      },
    });

    if (!island) {
      return NextResponse.json({ error: SERVER_ERRORS.NOT_FOUND("Island") }, { status: 404 });
    }

    const islandWithProgress = {
      ...island,
      pins: island.pins.map((pin) => ({
        ...pin,
        isCompleted: pin.progress[0]?.isCompleted ?? false,
        accuracy: pin.progress[0]?.accuracy ?? null,
        progress: undefined,
      })),
    };

    const completedPins = island.pins.filter((pin) => pin.progress[0]?.isCompleted);
    const allPinsCompleted = completedPins.length === island.pins.length;
    const cumulativeAccuracy =
      completedPins.length > 0
        ? Math.round(
            completedPins.reduce((sum, pin) => sum + (pin.progress[0]?.accuracy ?? 0), 0) /
              completedPins.length
          )
        : null;
    const islandPassed = allPinsCompleted && (cumulativeAccuracy ?? 0) >= ISLAND_PASS_THRESHOLD;

    const dbUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { email: true },
    });
    const devEmails = (process.env.DEV_EMAILS ?? "andreicondino2@gmail.com")
      .split(",")
      .map((e) => e.trim());
    const isDevUser = devEmails.includes(dbUser?.email ?? "");

    const ingaySeenRecord = await prisma.ingaySeen.findUnique({
      where: { userId_islandId: { userId: auth.userId, islandId: id } },
    });

    return NextResponse.json({
      ...islandWithProgress,
      allPinsCompleted,
      cumulativeAccuracy,
      islandPassed,
      ingaySeen: !!ingaySeenRecord,
      isDevUser,
    });
  } catch (err: unknown) {
    console.error("[GET /api/islands/[id]]", err);
    return NextResponse.json({ error: SERVER_ERRORS.INTERNAL }, { status: 500 });
  }
}
