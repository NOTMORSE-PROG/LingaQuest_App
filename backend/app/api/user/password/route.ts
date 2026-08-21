import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "Google accounts cannot set a password." },
        { status: 403 }
      );
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "currentPassword and newPassword are required." },
        { status: 400 }
      );
    }

    if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
      return NextResponse.json(
        { error: "currentPassword and newPassword must be strings." },
        { status: 400 }
      );
    }

    const trimmedNew = newPassword.trim();
    const trimmedCurrent = currentPassword.trim();

    if (trimmedNew.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (trimmedNew === trimmedCurrent) {
      return NextResponse.json(
        { error: "New password must be different from current password." },
        { status: 400 }
      );
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: auth.userId },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[user/password]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
