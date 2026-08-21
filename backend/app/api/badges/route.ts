import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { SERVER_ERRORS } from "@/lib/constants";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: SERVER_ERRORS.UNAUTHORIZED }, { status: 401 });

    const badges = await prisma.badge.findMany({
      where: { userId: auth.userId },
      orderBy: { earnedAt: "asc" },
    });

    return NextResponse.json(badges);
  } catch (err: unknown) {
    console.error("[GET /api/badges]", err);
    return NextResponse.json({ error: SERVER_ERRORS.INTERNAL }, { status: 500 });
  }
}
