/**
 * LinguaQuest — Character TTS Audio Generation Script
 *
 * Generates MP3 audio for all challenge scripts + NPC dialogues using ElevenLabs,
 * uploads to Cloudinary, and updates the database with real audio URLs.
 *
 * SETUP (one-time):
 *   1. Create free ElevenLabs account at elevenlabs.io
 *   2. Browse Voice Library → pick 3 voices and note their voice_id strings:
 *        NARRATOR_VOICE_ID   — clear, natural narrator (search "narrator" or "news")
 *        SALITA_VOICE_ID     — old, raspy, slow male (search "old raspy" or "elder")
 *        INGAY_VOICE_ID      — dramatic, echoing female (search "villain" or "dramatic")
 *   3. Create free Cloudinary account at cloudinary.com
 *   4. Add to apps/web/.env:
 *        ELEVENLABS_API_KEY=your_key
 *        NARRATOR_VOICE_ID=abc123...
 *        SALITA_VOICE_ID=def456...
 *        INGAY_VOICE_ID=ghi789...
 *        CLOUDINARY_CLOUD_NAME=your_cloud_name
 *        CLOUDINARY_API_KEY=your_api_key
 *        CLOUDINARY_API_SECRET=your_api_secret
 *
 * RUN (Month 1 — challenge audio, ~9,000 chars):
 *   npx ts-node --compiler-options {"module":"CommonJS"} scripts/generate-audio.ts --target challenges
 *
 * RUN (Month 2 — NPC + Ingay audio, ~3,700 chars):
 *   npx ts-node --compiler-options {"module":"CommonJS"} scripts/generate-audio.ts --target npc
 *
 * RUN (everything at once if you have enough credits):
 *   npx ts-node --compiler-options {"module":"CommonJS"} scripts/generate-audio.ts --target all
 */

import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";

const prisma = new PrismaClient();

// ── ElevenLabs config ──────────────────────────────────────────────────────
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY ?? "";
const NARRATOR_VOICE_ID  = process.env.NARRATOR_VOICE_ID  ?? "";
const SALITA_VOICE_ID    = process.env.SALITA_VOICE_ID    ?? "";
const INGAY_VOICE_ID     = process.env.INGAY_VOICE_ID     ?? "";

// ── Cloudinary config ──────────────────────────────────────────────────────
cloudinary.config({
  cloud_name:  process.env.CLOUDINARY_CLOUD_NAME  ?? "",
  api_key:     process.env.CLOUDINARY_API_KEY     ?? "",
  api_secret:  process.env.CLOUDINARY_API_SECRET  ?? "",
});

// ── Ingay warning texts per island (dramatic taunt, 1 per island) ──────────
// These replace the hardcoded dialogue in IngayWarning.tsx
const INGAY_WARNINGS: Record<number, string> = {
  1: "Words... such fragile, slippery things. I have scrambled them all. Can your ears find meaning in the chaos I have made?",
  2: "I have stolen time itself on this island. Everything speaks too fast now. Try to keep up, little sailor. I dare you.",
  3: "Fog. Beautiful, thick fog. The main idea is buried so deep, you will never find it. I promise you that.",
  4: "Feeling? I have taken all of it. Every voice here is flat, empty, dead. You cannot hear what doesn't exist.",
  5: "Names. Dates. Numbers. I have scattered them like shells on the ocean floor. Good luck finding the right one.",
  6: "The storytellers lost their memories because of me. The narrative is broken. Can you find a story in the ruins?",
  7: "This is MY stronghold. Every skill you think you have — I will test it all here. This is where sailors break.",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateTTS(text: string, voiceId: string): Promise<Buffer> {
  if (!ELEVENLABS_API_KEY || !voiceId) {
    throw new Error("Missing ELEVENLABS_API_KEY or voice ID. Check your .env file.");
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2", // 0.5 chars/credit — doubles your free quota
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ElevenLabs error ${response.status}: ${err}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function uploadToCloudinary(buffer: Buffer, publicId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video",      // Cloudinary treats audio as "video" resource type
        public_id: `linguaquest/audio/${publicId}`,
        format: "mp3",
        overwrite: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result!.secure_url);
      }
    );
    stream.end(buffer);
  });
}

// ── Main generation functions ──────────────────────────────────────────────

async function generateChallengeAudio() {
  console.log("\n🎙️  Generating challenge audio (Narrator voice)...\n");

  const challenges = await prisma.challenge.findMany({
    where: { audioScript: { not: null } },
    select: { id: true, audioScript: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });

  if (challenges.length === 0) {
    console.log("  No challenges with audioScript found. Run the seed first.");
    return;
  }

  let totalChars = 0;
  let success = 0;

  for (const challenge of challenges) {
    const script = challenge.audioScript!;
    totalChars += script.length;

    try {
      process.stdout.write(`  Challenge ${challenge.id.slice(-8)}… `);
      const buffer = await generateTTS(script, NARRATOR_VOICE_ID);
      const url = await uploadToCloudinary(buffer, `challenge-${challenge.id}`);
      await prisma.challenge.update({
        where: { id: challenge.id },
        data: { audioUrl: url },
      });
      console.log(`✓ ${url.split("/").pop()}`);
      success++;
    } catch (err: any) {
      console.log(`✗ ${err.message}`);
    }

    await sleep(600); // Stay within rate limits
  }

  console.log(`\n  ✅ ${success}/${challenges.length} challenge clips generated (~${totalChars} chars used)\n`);
}

async function generateNpcAudio() {
  console.log("\n🎙️  Generating NPC audio (Captain Salita + Ingay voices)...\n");

  const islands = await prisma.island.findMany({
    select: {
      id: true,
      number: true,
      name: true,
      npcDialogueIntro: true,
      npcDialogueSuccess: true,
      npcDialogueFail: true,
    },
    orderBy: { number: "asc" },
  });

  let success = 0;
  let total = 0;

  for (const island of islands) {
    console.log(`  Island ${island.number}: ${island.name}`);

    const tasks: Array<{
      label: string;
      text: string;
      voiceId: string;
      field: "npcAudioIntro" | "npcAudioSuccess" | "npcAudioFail" | "ingayAudioUrl";
      publicId: string;
    }> = [];

    if (island.npcDialogueIntro) {
      tasks.push({
        label: "  Salita intro",
        text: island.npcDialogueIntro,
        voiceId: SALITA_VOICE_ID,
        field: "npcAudioIntro",
        publicId: `salita-intro-island${island.number}`,
      });
    }
    if (island.npcDialogueSuccess) {
      tasks.push({
        label: "  Salita success",
        text: island.npcDialogueSuccess,
        voiceId: SALITA_VOICE_ID,
        field: "npcAudioSuccess",
        publicId: `salita-success-island${island.number}`,
      });
    }
    if (island.npcDialogueFail) {
      tasks.push({
        label: "  Salita fail",
        text: island.npcDialogueFail,
        voiceId: SALITA_VOICE_ID,
        field: "npcAudioFail",
        publicId: `salita-fail-island${island.number}`,
      });
    }

    const ingayText = INGAY_WARNINGS[island.number];
    if (ingayText) {
      tasks.push({
        label: "  Ingay warning",
        text: ingayText,
        voiceId: INGAY_VOICE_ID,
        field: "ingayAudioUrl",
        publicId: `ingay-island${island.number}`,
      });
    }

    for (const task of tasks) {
      total++;
      try {
        process.stdout.write(`  ${task.label}… `);
        const buffer = await generateTTS(task.text, task.voiceId);
        const url = await uploadToCloudinary(buffer, task.publicId);
        await prisma.island.update({
          where: { id: island.id },
          data: { [task.field]: url },
        });
        console.log(`✓`);
        success++;
      } catch (err: any) {
        console.log(`✗ ${err.message}`);
      }
      await sleep(600);
    }

    console.log("");
  }

  console.log(`  ✅ ${success}/${total} NPC clips generated\n`);
}

// ── Entry point ────────────────────────────────────────────────────────────

async function main() {
  const target = process.argv.find((a) => a.startsWith("--target="))?.split("=")[1]
    ?? process.argv[process.argv.indexOf("--target") + 1]
    ?? "challenges";

  console.log("🌊 LinguaQuest Audio Generator");
  console.log(`   Target: ${target}`);
  console.log("   Make sure ELEVENLABS_API_KEY and Cloudinary env vars are set in .env\n");

  if (!ELEVENLABS_API_KEY) {
    console.error("❌ ELEVENLABS_API_KEY is not set. Aborting.");
    process.exit(1);
  }
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.error("❌ CLOUDINARY_CLOUD_NAME is not set. Aborting.");
    process.exit(1);
  }

  if (target === "challenges" || target === "all") {
    if (!NARRATOR_VOICE_ID) {
      console.error("❌ NARRATOR_VOICE_ID is not set. Aborting.");
      process.exit(1);
    }
    await generateChallengeAudio();
  }

  if (target === "npc" || target === "all") {
    if (!SALITA_VOICE_ID || !INGAY_VOICE_ID) {
      console.error("❌ SALITA_VOICE_ID or INGAY_VOICE_ID is not set. Aborting.");
      process.exit(1);
    }
    await generateNpcAudio();
  }

  console.log("✅ Done! Check your Cloudinary dashboard for uploaded files.");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
