import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/db";
import { getAuthUser, serializeUser } from "@/lib/auth";

if (!process.env.GOOGLE_WEB_CLIENT_ID) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("GOOGLE_WEB_CLIENT_ID environment variable is not set.");
  } else {
    console.warn("[link-google] WARNING: GOOGLE_WEB_CLIENT_ID is not set — Google linking will not work.");
  }
}

const client = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (user.googleId) {
      return NextResponse.json({ error: "Google account already linked." }, { status: 409 });
    }

    const { idToken } = await req.json();
    if (!idToken) {
      return NextResponse.json({ error: "idToken is required." }, { status: 400 });
    }

    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_WEB_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      return NextResponse.json({ error: "Invalid Google token." }, { status: 401 });
    }
    if (!payload) {
      return NextResponse.json({ error: "Invalid Google token." }, { status: 401 });
    }

    const { sub: googleId, email: googleEmail } = payload;
    if (!googleId) {
      return NextResponse.json({ error: "Invalid Google token (missing sub)." }, { status: 401 });
    }

    if (googleEmail !== user.email) {
      return NextResponse.json(
        {
          error: `Google account email must match your registered email (${user.email}).`,
        },
        { status: 400 }
      );
    }

    const taken = await prisma.user.findUnique({ where: { googleId } });
    if (taken) {
      return NextResponse.json(
        { error: "This Google account is already linked to another user." },
        { status: 409 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: auth.userId },
      data: { googleId },
    });

    return NextResponse.json(serializeUser(updated));
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "This Google account is already linked to another user." },
        { status: 409 }
      );
    }
    console.error("[user/link-google]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
