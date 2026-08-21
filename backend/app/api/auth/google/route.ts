import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/db";
import { signToken, serializeUser } from "@/lib/auth";

if (!process.env.GOOGLE_WEB_CLIENT_ID) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("GOOGLE_WEB_CLIENT_ID environment variable is not set.");
  } else {
    console.warn("[auth/google] WARNING: GOOGLE_WEB_CLIENT_ID is not set — Google sign-in will not work.");
  }
}

const client = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);

function sanitizeUsername(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 16)
    .padEnd(3, "x");
}

async function generateUniqueUsername(base: string): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = Math.floor(1000 + Math.random() * 9000).toString();
    const candidate = `${base}${suffix}`;
    const existing = await prisma.user.findUnique({
      where: { username: candidate },
    });
    if (!existing) return candidate;
  }
  // fallback: timestamp suffix
  return `${base}${Date.now().toString().slice(-6)}`;
}

export async function POST(req: NextRequest) {
  try {
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

    const { sub: googleId, email, name } = payload;
    if (!googleId || !email) {
      return NextResponse.json({ error: "Incomplete Google profile." }, { status: 400 });
    }

    // Returning Google user
    const byGoogleId = await prisma.user.findUnique({ where: { googleId } });
    if (byGoogleId) {
      const token = await signToken({ userId: byGoogleId.id, role: byGoogleId.role });
      return NextResponse.json({
        token,
        user: serializeUser(byGoogleId),
        isNewUser: false,
      });
    }

    // Existing email/password account — do not auto-link
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      return NextResponse.json(
        {
          error:
            "An account with this email already exists. Sign in with your password, then connect Google from your profile settings.",
        },
        { status: 409 }
      );
    }

    // Create new Google account
    const base = sanitizeUsername(name ?? email.split("@")[0]);
    const username = await generateUniqueUsername(base);

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        googleId,
        passwordHash: null,
        isOnboarded: false,
        role: "STUDENT",
      },
    });

    const token = await signToken({ userId: newUser.id, role: newUser.role });
    return NextResponse.json({
      token,
      user: serializeUser(newUser),
      isNewUser: true,
    });
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "Account already exists. Please sign in." },
        { status: 409 }
      );
    }
    console.error("[auth/google]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

