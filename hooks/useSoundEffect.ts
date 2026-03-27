import { useCallback } from "react";
import { Audio } from "expo-av";
import { useAudioStore } from "@/stores/audio";

const CORRECT_SFX = "https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3";
const WRONG_SFX   = "https://assets.mixkit.co/active_storage/sfx/948/948-preview.mp3";

async function playSfx(source: string) {
  try {
    const { sound } = await Audio.Sound.createAsync({ uri: source }, { shouldPlay: true, volume: 0.8 });
    // Unload after playback finishes
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
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
