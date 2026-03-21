import { useEffect, useRef, useState } from "react";
import { View, Text, Animated } from "react-native";
import { Audio } from "expo-av";

interface AudioPlayerProps {
  audioUrl: string;
  onEnd: () => void;
  autoPlay?: boolean;
}

export function AudioPlayer({ audioUrl, onEnd, autoPlay = false }: AudioPlayerProps) {
  const [status, setStatus] = useState<"loading" | "playing" | "done" | "error">("loading");
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const soundRef = useRef<Audio.Sound | null>(null);
  const pulsationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadAndPlay() {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: autoPlay },
          (playbackStatus) => {
            if (!mounted) return;
            if (playbackStatus.isLoaded) {
              if (playbackStatus.isPlaying) {
                setStatus("playing");
              }
              if (playbackStatus.didJustFinish) {
                pulsationRef.current?.stop();
                setStatus("done");
                onEnd();
              }
            }
          }
        );
        soundRef.current = sound;
        if (mounted) setStatus(autoPlay ? "playing" : "loading");
      } catch {
        if (!mounted) return;
        setStatus("error");
        // Auto-advance after 2s so the quest isn't permanently blocked
        setTimeout(() => { if (mounted) onEnd(); }, 2000);
      }
    }

    loadAndPlay();

    // Pulse animation — stopped on "done" or "error" via pulsationRef.current?.stop()
    pulsationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulsationRef.current.start();

    return () => {
      mounted = false;
      pulsationRef.current?.stop();
      soundRef.current?.unloadAsync();
    };
  }, [audioUrl, autoPlay, onEnd, pulseAnim]);

  const isPlaying = status === "playing";

  const statusEmoji =
    status === "loading" ? "⏳"
    : status === "playing" ? "👂"
    : status === "error" ? "❌"
    : "✓";

  const statusText =
    status === "loading" ? "Loading audio..."
    : status === "playing" ? "Listening..."
    : status === "error" ? "Audio unavailable — moving on..."
    : "Audio complete";

  return (
    <View className="items-center py-8">
      <Animated.View
        style={{ transform: [{ scale: isPlaying ? pulseAnim : 1 }] }}
        className={`w-24 h-24 rounded-full border-4 items-center justify-center ${
          status === "error" ? "bg-red-900/50 border-coral" : "bg-ocean-light border-gold"
        }`}
      >
        <Text className="text-5xl">{statusEmoji}</Text>
      </Animated.View>
      <Text className={`text-sm mt-4 ${status === "error" ? "text-coral" : "text-parchment-dark"}`}>
        {statusText}
      </Text>
      {status !== "error" && (
        <Text className="text-parchment-dark/50 text-xs mt-2">No pause. No replay.</Text>
      )}
    </View>
  );
}
