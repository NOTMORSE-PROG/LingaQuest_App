import { NextRequest, NextResponse } from "next/server";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/db";
import { getAuthUser, serializeUser } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { username } = await req.json();

    if (!username || typeof username !== "string") {
      return NextResponse.json({ error: "Username is required." }, { status: 400 });
    }

    const trimmed = username.trim();
    if (!/^[a-zA-Z0-9_ ]{3,20}$/.test(trimmed)) {
      return NextResponse.json(
        { error: "Name must be 3–20 characters (letters, numbers, spaces, or underscores)." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { username: trimmed } });
    if (existing && existing.id !== auth.userId) {
      return NextResponse.json({ error: "Username is already taken." }, { status: 409 });
    }

    const updated = await prisma.user.update({
      where: { id: auth.userId },
      data: { username: trimmed },
    });

    return NextResponse.json(serializeUser(updated));
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Username is already taken." }, { status: 409 });
    }
    console.error("[user/profile]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
