import { useCallback } from "react";
import { createAudioPlayer } from "expo-audio";
import type { AudioStatus } from "expo-audio";
import { useAudioStore } from "@/stores/audio";

const CORRECT_SFX = "https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3";
const WRONG_SFX   = "https://assets.mixkit.co/active_storage/sfx/948/948-preview.mp3";

function playSfx(source: string) {
  try {
    const player = createAudioPlayer({ uri: source });
    player.play();
    // Auto-remove when playback finishes
    const sub = player.addListener("playbackStatusUpdate", (status: AudioStatus) => {
      if (status.didJustFinish) {
        sub.remove();
        player.remove();
      }
    });
  } catch {
    // SFX failure must never block the UI
  }
}

export function useSoundEffect() {
  const { isMuted } = useAudioStore();

  const playCorrect = useCallback(() => {
    if (isMuted) return;
    playSfx(CORRECT_SFX);
  }, [isMuted]);

  const playWrong = useCallback(() => {
    if (isMuted) return;
    playSfx(WRONG_SFX);
  }, [isMuted]);

  return { playCorrect, playWrong };
}
