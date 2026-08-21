import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { pusher, roomChannel } from "@/lib/pusher";

// ── Rate limiter (in-memory token bucket) ─────────────────────
// 5 messages per 5 seconds per (userId, roomId).
// NOTE: backend is single-instance Next.js. If horizontally scaled later,
// move this to Redis.
const RATE_WINDOW_MS = 5_000;
const RATE_MAX = 5;
const rateBuckets = new Map<string, number[]>();

function rateLimitOk(key: string): boolean {
  const now = Date.now();
  const arr = rateBuckets.get(key) ?? [];
  const recent = arr.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    rateBuckets.set(key, recent);
    return false;
  }
  recent.push(now);
  rateBuckets.set(key, recent);
  return true;
}

// Periodic cleanup so the map doesn't grow forever
setInterval(() => {
  const now = Date.now();
  for (const [k, arr] of rateBuckets.entries()) {
    const recent = arr.filter((t) => now - t < RATE_WINDOW_MS);
    if (recent.length === 0) rateBuckets.delete(k);
    else rateBuckets.set(k, recent);
  }
}, 30_000).unref?.();

// ── Profanity filter (kid-safe wordlist, EN + light PH) ───────
const BANNED = [
  "fuck", "shit", "bitch", "asshole", "dick", "pussy", "cunt", "bastard",
  "slut", "whore", "fag", "nigger", "nigga", "retard", "rape",
  "putang", "putangina", "tangina", "gago", "tanga", "bobo", "ulol",
  "puke", "pakyu", "tarantado", "leche",
];

function containsProfanity(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/);
  return normalized.some((w) => BANNED.includes(w));
}

function sanitizeText(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  // Strip control chars, normalize whitespace, trim
  const cleaned = raw.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length === 0) return null;
  if (cleaned.length > 300) return cleaned.slice(0, 300);
  return cleaned;
}

// ── POST /api/multiplayer/chat — send message ─────────────────
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { roomId } = body ?? {};
    if (typeof roomId !== "string" || !roomId) {
      return NextResponse.json({ error: "roomId is required." }, { status: 400 });
    }

    const text = sanitizeText(body?.text);
    if (!text) {
      return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
    }

    if (containsProfanity(text)) {
      return NextResponse.json(
        { error: "Let's keep crew chat friendly — no bad words." },
        { status: 400 }
      );
    }

    // Membership check
    const membership = await prisma.roomPlayer.findUnique({
      where: { roomId_userId: { roomId, userId: auth.userId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "You are not in this room." }, { status: 403 });
    }

    // Rate limit
    if (!rateLimitOk(`${auth.userId}:${roomId}`)) {
      return NextResponse.json(
        { error: "Slow down, sailor — too many messages." },
        { status: 429 }
      );
    }

    // Need username for display
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { username: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const message = await prisma.chatMessage.create({
      data: {
        roomId,
        userId: auth.userId,
        userName: user.username,
        text,
      },
    });

    // Broadcast — failure must NOT 500 the request
    try {
      await pusher.trigger(roomChannel(roomId), "chat:message", {
        id: message.id,
        roomId,
        userId: auth.userId,
        userName: user.username,
        text,
        createdAt: message.createdAt.toISOString(),
      });
    } catch (e) {
      console.warn("[chat] pusher trigger failed:", e);
    }

    return NextResponse.json({
      ok: true,
      message: {
        id: message.id,
        roomId,
        userId: auth.userId,
        userName: user.username,
        text,
        createdAt: message.createdAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("[chat POST] error:", e);
    return NextResponse.json({ error: "Failed to send message." }, { status: 500 });
  }
}

// ── GET /api/multiplayer/chat?roomId=...&before=...&limit=50 ─
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");
    const before = searchParams.get("before");
    const limitParam = parseInt(searchParams.get("limit") ?? "50", 10);
    const limit = Math.min(Math.max(isNaN(limitParam) ? 50 : limitParam, 1), 100);

    if (!roomId) {
      return NextResponse.json({ error: "roomId is required." }, { status: 400 });
    }

    const membership = await prisma.roomPlayer.findUnique({
      where: { roomId_userId: { roomId, userId: auth.userId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "You are not in this room." }, { status: 403 });
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        roomId,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        roomId: true,
        userId: true,
        userName: true,
        text: true,
        createdAt: true,
      },
    });

    // Return in ascending order (oldest first) for easy append in UI
    return NextResponse.json({
      messages: messages.reverse().map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("[chat GET] error:", e);
    return NextResponse.json({ error: "Failed to load messages." }, { status: 500 });
  }
}
