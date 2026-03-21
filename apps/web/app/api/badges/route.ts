import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const badges = await prisma.badge.findMany({
    where: { userId: auth.userId },
    orderBy: { earnedAt: "asc" },
  });

  return NextResponse.json(badges);
}
