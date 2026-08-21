import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { SERVER_ERRORS } from "@/lib/constants";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: SERVER_ERRORS.UNAUTHORIZED }, { status: 401 });

    const { id } = await params;

    await prisma.ingaySeen.upsert({
      where: { userId_islandId: { userId: auth.userId, islandId: id } },
      update: {},
      create: { userId: auth.userId, islandId: id },
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[POST /api/islands/[id]/seen-ingay]", err);
    return NextResponse.json({ error: SERVER_ERRORS.INTERNAL }, { status: 500 });
  }
}
