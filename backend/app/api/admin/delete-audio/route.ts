import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (auth.role === "STUDENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    let body: { targetType: string; targetId: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const { targetType, targetId } = body;
    if (!targetType || !targetId) {
      return NextResponse.json({ error: "Missing targetType or targetId" }, { status: 400 });
    }

    const validTypes = ["challenge", "challenge-explanation", "island-intro", "island-success", "island-fail", "island-ingay", "island-bgmusic"];
    if (!validTypes.includes(targetType)) {
      return NextResponse.json({ error: "Invalid targetType" }, { status: 400 });
    }

    // Delete from Cloudinary (best-effort — ignore if not found)
    const publicId = `linguaquest/audio/${targetType}-${targetId}`;
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
    } catch {
      // Cloudinary deletion is best-effort
    }

    // Clear the DB field
    try {
      if (targetType === "challenge") {
        await prisma.challenge.update({ where: { id: targetId }, data: { audioUrl: "" } });
      } else if (targetType === "challenge-explanation") {
        await prisma.challenge.update({ where: { id: targetId }, data: { explanationAudioUrl: null } });
      } else if (targetType === "island-intro") {
        await prisma.island.update({ where: { id: targetId }, data: { npcAudioIntro: null } });
      } else if (targetType === "island-success") {
        await prisma.island.update({ where: { id: targetId }, data: { npcAudioSuccess: null } });
      } else if (targetType === "island-fail") {
        await prisma.island.update({ where: { id: targetId }, data: { npcAudioFail: null } });
      } else if (targetType === "island-ingay") {
        await prisma.island.update({ where: { id: targetId }, data: { ingayAudioUrl: null } });
      } else if (targetType === "island-bgmusic") {
        await prisma.island.update({ where: { id: targetId }, data: { bgMusicUrl: null } });
      }
    } catch (err: any) {
      return NextResponse.json(
        { error: `Database update failed: ${err.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
