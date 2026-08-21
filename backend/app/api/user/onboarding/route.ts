import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: auth.userId },
      data: { isOnboarded: true },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[user/onboarding]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
