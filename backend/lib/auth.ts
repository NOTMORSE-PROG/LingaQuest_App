import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { User, UserRole } from "@prisma/client";

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is not set. Cannot start in production without it.");
  } else {
    console.warn("[auth] WARNING: JWT_SECRET is not set. Using insecure default — set this before deploying.");
  }
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "change-me-in-production"
);

export async function signToken(payload: {
  userId: string;
  role: UserRole;
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

export async function verifyToken(
  token: string
): Promise<{ userId: string; role: UserRole } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: string; role: UserRole };
  } catch {
    return null;
  }
}

export async function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  return verifyToken(token);
}

export function serializeUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role.toLowerCase(),
    characterModeEnabled: user.characterModeEnabled,
    isOnboarded: user.isOnboarded,
    hasPassword: !!user.passwordHash,
    googleId: user.googleId ?? undefined,
    createdAt: user.createdAt.toISOString(),
  };
}

export function requireAuth(role?: UserRole) {
  return async function (req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return { error: "Unauthorized", status: 401 };
    if (role && user.role !== role && user.role !== "ADMIN") {
      return { error: "Forbidden", status: 403 };
    }
    return { user };
  };
}
