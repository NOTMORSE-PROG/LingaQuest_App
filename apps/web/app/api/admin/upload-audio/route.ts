import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name:  process.env.CLOUDINARY_CLOUD_NAME,
  api_key:     process.env.CLOUDINARY_API_KEY,
  api_secret:  process.env.CLOUDINARY_API_SECRET,
});

function uploadToCloudinary(buffer: Buffer, publicId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        resource_type: "video",
        public_id: `linguaquest/audio/${publicId}`,
        format: "mp3",
        overwrite: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result!.secure_url);
      }
    ).end(buffer);
  });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role === "STUDENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const targetType = formData.get("targetType") as string | null;
  const targetId = formData.get("targetId") as string | null;

  if (!file || !targetType || !targetId) {
    return NextResponse.json({ error: "Missing file, targetType, or targetId" }, { status: 400 });
  }

  const validTypes = ["challenge", "island-intro", "island-success", "island-fail", "island-ingay"];
  if (!validTypes.includes(targetType)) {
    return NextResponse.json({ error: "Invalid targetType" }, { status: 400 });
  }

  if (!file.type.includes("audio") && !file.name.endsWith(".mp3")) {
    return NextResponse.json({ error: "File must be an MP3 audio file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const publicId = `${targetType}-${targetId}`;

  let url: string;
  try {
    url = await uploadToCloudinary(buffer, publicId);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Cloudinary upload failed: ${err.message}` },
      { status: 500 }
    );
  }

  // Update the correct DB field based on targetType
  if (targetType === "challenge") {
    await prisma.challenge.update({ where: { id: targetId }, data: { audioUrl: url } });
  } else if (targetType === "island-intro") {
    await prisma.island.update({ where: { id: targetId }, data: { npcAudioIntro: url } });
  } else if (targetType === "island-success") {
    await prisma.island.update({ where: { id: targetId }, data: { npcAudioSuccess: url } });
  } else if (targetType === "island-fail") {
    await prisma.island.update({ where: { id: targetId }, data: { npcAudioFail: url } });
  } else if (targetType === "island-ingay") {
    await prisma.island.update({ where: { id: targetId }, data: { ingayAudioUrl: url } });
  }

  return NextResponse.json({ url });
}
