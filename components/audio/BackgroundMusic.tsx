import { useEffect, useRef, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer } from "expo-audio";
import { useAudioStore } from "@/stores/audio";

const ISLAND_MUSIC: Record<number, string> = {
  1: "https://assets.mixkit.co/music/188/188.mp3",   // Echoes — slow ethereal ice ambience
  2: "https://assets.mixkit.co/music/167/167.mp3",   // Brainiac — fast electronic urgency
  3: "https://assets.mixkit.co/music/612/612.mp3",   // Selpan — eerie misty mystery
  4: "https://assets.mixkit.co/music/614/614.mp3",   // Silent Descent — melancholic hollow
  5: "https://assets.mixkit.co/music/615/615.mp3",   // Tapis — tense investigative
  6: "https://assets.mixkit.co/music/795/795.mp3",   // Far From Home — warm folk storytelling
  7: "https://assets.mixkit.co/music/80/80.mp3",     // Daredevil — intense dramatic storm
};

interface Props {
  islandNumber: number;
  bgMusicUrl?: string | null;
  volume?: number;
}

export function BackgroundMusic({ islandNumber, bgMusicUrl, volume }: Props) {
  const { isMuted } = useAudioStore();
  const isMutedRef = useRef(isMuted);
  const playerRef = useRef<AudioPlayer | null>(null);

  // Keep ref in sync so the load callback can read latest muted state,
  // and update a live player if mute toggles while music is playing.
  useEffect(() => {
    isMutedRef.current = isMuted;
    if (playerRef.current) {
      playerRef.current.muted = isMuted;
    }
  }, [isMuted]);

  useFocusEffect(
    useCallback(() => {
      const url = bgMusicUrl ?? ISLAND_MUSIC[islandNumber];
      if (!url) return;

      let cancelled = false;

      let rampTimer: ReturnType<typeof setTimeout> | null = null;

      async function startMusic() {
        try {
          await setAudioModeAsync({
            playsInSilentMode: true,
            shouldPlayInBackground: false,
          });
          if (cancelled) return;
          const p = createAudioPlayer({ uri: url });
          p.loop = true;
          // Start silent to prevent the initial volume spike that can occur
          // while expo-audio is buffering before our volume assignment lands.
          p.volume = 0;
          p.muted = isMutedRef.current;
          p.play();
          playerRef.current = p;
          // Ramp to target volume after audio has had time to settle
          const targetVolume = volume ?? 0.2;
          rampTimer = setTimeout(() => {
            if (!cancelled && playerRef.current === p) {
              p.volume = targetVolume;
            }
          }, 250);
        } catch {
          // No music is fine — the UI must not break
        }
      }

      startMusic();

      return () => {
        cancelled = true;
        if (rampTimer !== null) clearTimeout(rampTimer);
        const p = playerRef.current;
        playerRef.current = null;
        if (p) {
          p.pause();
          p.remove();
        }
      };
    }, [islandNumber, bgMusicUrl, volume])
  );

  return null;
}
