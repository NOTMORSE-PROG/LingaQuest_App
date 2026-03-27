import { useEffect, useRef } from "react";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Audio } from "expo-av";
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
}

export function BackgroundMusic({ islandNumber, bgMusicUrl }: Props) {
  const { isMuted } = useAudioStore();
  const soundRef = useRef<Audio.Sound | null>(null);
  const isMutedRef = useRef(isMuted);

  // Keep ref in sync so the load callback can read latest muted state
  useEffect(() => {
    isMutedRef.current = isMuted;
    soundRef.current?.setIsMutedAsync(isMuted).catch(() => {});
  }, [isMuted]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      async function startMusic() {
        const url = bgMusicUrl ?? ISLAND_MUSIC[islandNumber];
        if (!url) return;
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
          });
          const { sound } = await Audio.Sound.createAsync(
            { uri: url },
            { isLooping: true, volume: 0.35, isMuted: isMutedRef.current }
          );
          if (!mounted) {
            sound.unloadAsync();
            return;
          }
          soundRef.current = sound;
          await sound.playAsync();
        } catch {
          // No music is fine — the UI must not break
        }
      }

      startMusic();

      return () => {
        mounted = false;
        const s = soundRef.current;
        soundRef.current = null;
        s?.stopAsync()
          .then(() => s.unloadAsync())
          .catch(() => {});
      };
    }, [islandNumber, bgMusicUrl])
  );

  return null;
}
