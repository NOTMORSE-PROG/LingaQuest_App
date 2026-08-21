import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get("username");

    if (!raw) {
      return NextResponse.json({ error: "username query param required." }, { status: 400 });
    }

    const username = raw.trim();

    // Reject invalid format immediately — no need to hit DB
    if (!/^[a-zA-Z0-9_ ]{3,20}$/.test(username)) {
      return NextResponse.json({ available: false });
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    return NextResponse.json({ available: !existing });
  } catch (err) {
    console.error("[user/check-username]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
