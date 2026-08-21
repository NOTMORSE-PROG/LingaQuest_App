import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role === "STUDENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [students, totalPins] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STUDENT" },
      include: {
        progress: {
          where: { isCompleted: true },
          include: { pin: { include: { island: true } } },
        },
        badges: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pin.count(),
  ]);

  const result = students.map((s) => {
    const completedPins = s.progress.length;
    const avgAccuracy =
      completedPins > 0
        ? Math.round(s.progress.reduce((sum, p) => sum + p.accuracy, 0) / completedPins)
        : 0;
    const completedIslands = new Set(
      s.progress.map((p) => p.pin.island.number)
    );
    const lastActivity = s.progress.length > 0
      ? s.progress.reduce((latest, p) =>
          p.completedAt && (!latest || p.completedAt > latest) ? p.completedAt : latest,
          null as Date | null
        )
      : null;

    return {
      id: s.id,
      username: s.username,
      email: s.email,
      createdAt: s.createdAt.toISOString(),
      isOnboarded: s.isOnboarded,
      completedPins,
      totalPins,
      averageAccuracy: avgAccuracy,
      badgeCount: s.badges.length,
      islandsReached: completedIslands.size,
      lastActivity: lastActivity?.toISOString() ?? null,
    };
  });

  return NextResponse.json({ totalPins, students: result });
}
