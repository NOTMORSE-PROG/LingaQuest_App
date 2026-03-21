import { useEffect, useRef, useState } from "react";
import { View, Text, Animated } from "react-native";
import { Audio } from "expo-av";

interface AudioPlayerProps {
  audioUrl: string;
  onEnd: () => void;
  autoPlay?: boolean;
}

export function AudioPlayer({ audioUrl, onEnd, autoPlay = false }: AudioPlayerProps) {
  const [status, setStatus] = useState<"loading" | "playing" | "done">("loading");
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const soundRef = useRef<Audio.Sound | null>(null);
  const pulsationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadAndPlay() {
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
              setStatus("done");
              onEnd();
            }
          }
        }
      );
      soundRef.current = sound;
      if (mounted) setStatus(autoPlay ? "playing" : "loading");
    }

    loadAndPlay();

    // Pulse animation
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
  }, [audioUrl]);

  const isPlaying = status === "playing";

  return (
    <View className="items-center py-8">
      <Animated.View
        style={{ transform: [{ scale: isPlaying ? pulseAnim : 1 }] }}
        className="w-24 h-24 rounded-full bg-ocean-light border-4 border-gold items-center justify-center"
      >
        <Text className="text-5xl">
          {status === "loading" ? "⏳" : status === "playing" ? "👂" : "✓"}
        </Text>
      </Animated.View>
      <Text className="text-parchment-dark text-sm mt-4">
        {status === "loading"
          ? "Loading audio..."
          : status === "playing"
          ? "Listening..."
          : "Audio complete"}
      </Text>
      <Text className="text-coral text-xs mt-2">No pause. No replay.</Text>
    </View>
  );
}
