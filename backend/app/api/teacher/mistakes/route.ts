import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role === "STUDENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const islandFilter = req.nextUrl.searchParams.get("islandNumber");

  // Get all completed progress with pin + island info
  const progress = await prisma.progress.findMany({
    where: { isCompleted: true },
    include: { pin: { include: { island: true } }, user: { select: { id: true, username: true } } },
  });

  // Filter by island if requested
  const filtered = islandFilter
    ? progress.filter((p) => p.pin.island.number === parseInt(islandFilter))
    : progress;

  // Group by island
  const islandMap: Record<number, { name: string; skillFocus: string; accuracies: number[] }> = {};
  for (const p of filtered) {
    const isl = p.pin.island;
    if (!islandMap[isl.number]) islandMap[isl.number] = { name: isl.name, skillFocus: isl.skillFocus, accuracies: [] };
    islandMap[isl.number].accuracies.push(p.accuracy);
  }
  const byIsland = Object.entries(islandMap)
    .map(([num, data]) => ({
      islandNumber: parseInt(num),
      name: data.name,
      skillFocus: data.skillFocus,
      avgAccuracy: Math.round(data.accuracies.reduce((a, b) => a + b, 0) / data.accuracies.length),
      attempts: data.accuracies.length,
    }))
    .sort((a, b) => a.avgAccuracy - b.avgAccuracy);

  // Worst pins (below 60% average)
  const pinMap: Record<string, { pinNumber: number; islandNumber: number; islandName: string; accuracies: number[] }> = {};
  for (const p of filtered) {
    if (!pinMap[p.pinId]) {
      pinMap[p.pinId] = {
        pinNumber: p.pin.number,
        islandNumber: p.pin.island.number,
        islandName: p.pin.island.name,
        accuracies: [],
      };
    }
    pinMap[p.pinId].accuracies.push(p.accuracy);
  }
  const worstPins = Object.values(pinMap)
    .map((data) => ({
      ...data,
      avgAccuracy: Math.round(data.accuracies.reduce((a, b) => a + b, 0) / data.accuracies.length),
      attempts: data.accuracies.length,
      accuracies: undefined,
    }))
    .filter((p) => p.avgAccuracy < 60)
    .sort((a, b) => a.avgAccuracy - b.avgAccuracy)
    .slice(0, 15);

  // Struggling students (overall avg < 60%)
  const studentMap: Record<string, { username: string; accuracies: number[] }> = {};
  for (const p of progress) {
    if (!studentMap[p.user.id]) studentMap[p.user.id] = { username: p.user.username, accuracies: [] };
    studentMap[p.user.id].accuracies.push(p.accuracy);
  }
  const studentsStruggling = Object.entries(studentMap)
    .map(([id, data]) => ({
      id,
      username: data.username,
      avgAccuracy: Math.round(data.accuracies.reduce((a, b) => a + b, 0) / data.accuracies.length),
      completedPins: data.accuracies.length,
    }))
    .filter((s) => s.avgAccuracy < 60)
    .sort((a, b) => a.avgAccuracy - b.avgAccuracy)
    .slice(0, 15);

  return NextResponse.json({ byIsland, worstPins, studentsStruggling });
}
