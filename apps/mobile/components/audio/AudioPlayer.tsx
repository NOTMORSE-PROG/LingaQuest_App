import { useEffect, useRef, useState } from "react";
import { View, Text, Animated } from "react-native";
import TrackPlayer, { State, usePlaybackState } from "react-native-track-player";

interface AudioPlayerProps {
  audioUrl: string;
  onEnd: () => void;
  autoPlay?: boolean;
}

export function AudioPlayer({ audioUrl, onEnd, autoPlay = false }: AudioPlayerProps) {
  const [loaded, setLoaded] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const playbackState = usePlaybackState();

  useEffect(() => {
    let animation: Animated.CompositeAnimation;

    async function load() {
      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: "quest-audio",
        url: audioUrl,
        title: "Listening Challenge",
        artist: "LinguaQuest",
      });
      setLoaded(true);
      if (autoPlay) {
        await TrackPlayer.play();
      }
    }
    load();

    // Pulse animation while playing
    animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    animation.start();

    return () => {
      animation.stop();
      TrackPlayer.reset();
    };
  }, [audioUrl]);

  // Detect when audio ends
  useEffect(() => {
    if (playbackState.state === State.Ended) {
      onEnd();
    }
  }, [playbackState.state]);

  const isPlaying = playbackState.state === State.Playing;

  return (
    <View className="items-center py-8">
      <Animated.View
        style={{ transform: [{ scale: isPlaying ? pulseAnim : 1 }] }}
        className="w-24 h-24 rounded-full bg-ocean-light border-4 border-gold items-center justify-center"
      >
        <Text className="text-5xl">{isPlaying ? "👂" : loaded ? "✓" : "⏳"}</Text>
      </Animated.View>
      <Text className="text-parchment-dark text-sm mt-4">
        {isPlaying ? "Listening..." : loaded ? "Audio complete" : "Loading audio..."}
      </Text>
      <Text className="text-coral text-xs mt-2">No pause. No replay.</Text>
    </View>
  );
}
