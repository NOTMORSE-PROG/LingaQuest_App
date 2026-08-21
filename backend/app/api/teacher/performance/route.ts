import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role === "STUDENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [islands, totalStudents] = await Promise.all([
    prisma.island.findMany({
      include: {
        pins: {
          include: {
            progress: { where: { isCompleted: true } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { number: "asc" },
    }),
    prisma.user.count({ where: { role: "STUDENT" } }),
  ]);

  // Collect all pin stats for bestPins
  const allPinStats: {
    pinNumber: number;
    islandNumber: number;
    islandName: string;
    avgAccuracy: number;
    completionCount: number;
  }[] = [];

  const islandStats = islands.map((island) => {
    const allAccuracies: number[] = [];

    const pins = island.pins.map((pin) => {
      const accuracies = pin.progress.map((p) => p.accuracy);
      const avg = accuracies.length > 0
        ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length)
        : null;

      if (avg !== null) allAccuracies.push(...accuracies);

      const pinStat = {
        pinNumber: pin.number,
        islandNumber: island.number,
        islandName: island.name,
        avgAccuracy: avg ?? 0,
        completionCount: accuracies.length,
      };
      if (accuracies.length > 0) allPinStats.push(pinStat);

      return {
        pinNumber: pin.number,
        type: pin.type,
        avgAccuracy: avg,
        completionCount: accuracies.length,
        completionRate: totalStudents > 0 ? Math.round((accuracies.length / totalStudents) * 100) : 0,
      };
    });

    const islandAvg = allAccuracies.length > 0
      ? Math.round(allAccuracies.reduce((a, b) => a + b, 0) / allAccuracies.length)
      : null;
    const studentsWhoCompleted = new Set(
      island.pins.flatMap((pin) => pin.progress.map((p) => p.userId))
    ).size;

    return {
      islandNumber: island.number,
      name: island.name,
      skillFocus: island.skillFocus,
      avgAccuracy: islandAvg,
      completionRate: totalStudents > 0 ? Math.round((studentsWhoCompleted / totalStudents) * 100) : 0,
      totalPins: island.pins.length,
      pins,
    };
  });

  // Best performing pins (highest accuracy, min 1 attempt)
  const bestPins = allPinStats
    .sort((a, b) => b.avgAccuracy - a.avgAccuracy)
    .slice(0, 10);

  return NextResponse.json({ totalStudents, islands: islandStats, bestPins });
}
