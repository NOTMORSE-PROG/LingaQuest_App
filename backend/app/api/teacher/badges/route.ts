import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role === "STUDENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [badges, totalStudents] = await Promise.all([
    prisma.badge.findMany({ include: { user: { select: { id: true, username: true } } } }),
    prisma.user.count({ where: { role: "STUDENT" } }),
  ]);

  // Badge distribution: count per type
  const countByType: Record<string, number> = {};
  for (const b of badges) {
    countByType[b.badgeType] = (countByType[b.badgeType] ?? 0) + 1;
  }
  const distribution = Object.entries(countByType)
    .map(([badgeType, count]) => ({
      badgeType,
      count,
      percentage: totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Top collectors: students ranked by badge count
  const byStudent: Record<string, { username: string; count: number }> = {};
  for (const b of badges) {
    if (!byStudent[b.user.id]) byStudent[b.user.id] = { username: b.user.username, count: 0 };
    byStudent[b.user.id].count++;
  }
  const topCollectors = Object.entries(byStudent)
    .map(([id, { username, count }]) => ({ id, username, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  return NextResponse.json({ totalStudents, distribution, topCollectors });
}
