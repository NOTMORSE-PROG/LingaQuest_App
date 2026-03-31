import { useEffect, useRef, useState } from "react";
import { View, Text, Animated } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio";

function formatSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface AudioPlayerProps {
  audioUrl: string;
  onEnd: () => void;
  autoPlay?: boolean;
  rate?: number;
}

export function AudioPlayer({ audioUrl, onEnd, autoPlay = false, rate = 1.0 }: AudioPlayerProps) {
  const [uiStatus, setUiStatus] = useState<"loading" | "playing" | "done" | "error">("loading");
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulsationRef = useRef<Animated.CompositeAnimation | null>(null);
  // Prevent double-firing onEnd if didJustFinish fires more than once
  const hasStartedRef = useRef(false);
  const hasEndedRef = useRef(false);

  // BUG 2 FIX (callback-ref pattern): always holds the latest onEnd without it being a
  // useEffect dependency. Prevents audio from restarting on parent re-renders.
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onEndRef.current = onEnd;
  });

  // Configure audio mode once per mount
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  const player = useAudioPlayer({ uri: audioUrl }, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);

  // When audio finishes loading, apply rate and start playback
  useEffect(() => {
    if (!status.isLoaded) return;
    player.setPlaybackRate(rate, "high"); // pitch-corrected slow/fast mode
    if (autoPlay) player.play();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.isLoaded]);

  // Apply rate changes dynamically (e.g. slow mode toggled — not currently used mid-listen)
  useEffect(() => {
    if (!status.isLoaded) return;
    player.setPlaybackRate(rate, "high");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate]);

  // React to playback status changes
  useEffect(() => {
    if (status.playing && !hasStartedRef.current) {
      hasStartedRef.current = true;
      setUiStatus("playing");
    }
    if (status.didJustFinish && !hasEndedRef.current) {
      hasEndedRef.current = true;
      pulsationRef.current?.stop();
      setUiStatus("done");
      onEndRef.current();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.playing, status.didJustFinish]);

  // Error detection: if audio hasn't started within 10s, auto-advance.
  // Uses refs (not state) to avoid stale closure — long clips still playing at 10s are unaffected.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasStartedRef.current && !hasEndedRef.current) {
        setUiStatus("error");
        // Auto-advance after 2s so the quest isn't permanently blocked
        setTimeout(() => {
          if (!hasEndedRef.current) onEndRef.current();
        }, 2000);
      }
    }, 10000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pulse animation — stopped on "done" or "error" via pulsationRef.current?.stop()
  useEffect(() => {
    pulsationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulsationRef.current.start();
    return () => {
      pulsationRef.current?.stop();
    };
  }, [pulseAnim]);

  const isPlaying = uiStatus === "playing";
  const progress = status.duration > 0 ? status.currentTime / status.duration : 0;

  const statusEmoji =
    uiStatus === "loading" ? "⏳"
    : uiStatus === "playing" ? "👂"
    : uiStatus === "error" ? "❌"
    : "✓";

  const statusText =
    uiStatus === "loading" ? "Loading audio..."
    : uiStatus === "playing" ? "Listening..."
    : uiStatus === "error" ? "Audio unavailable — moving on..."
    : "Audio complete";

  return (
    <View className="items-center py-8">
      <Animated.View
        style={{ transform: [{ scale: isPlaying ? pulseAnim : 1 }] }}
        className={`w-24 h-24 rounded-full border-4 items-center justify-center ${
          uiStatus === "error" ? "bg-red-900/50 border-coral" : "bg-ocean-light border-gold"
        }`}
      >
        <Text className="text-5xl">{statusEmoji}</Text>
      </Animated.View>
      <Text className={`text-sm mt-4 ${uiStatus === "error" ? "text-coral" : "text-parchment-dark"}`}>
        {statusText}
      </Text>
      {(uiStatus === "playing" || uiStatus === "done") && status.duration > 0 && (
        <View style={{ width: "80%", marginTop: 14 }}>
          <View style={{ height: 6, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 3, overflow: "hidden" }}>
            <View style={{
              height: "100%",
              width: `${Math.round(progress * 100)}%`,
              backgroundColor: "#f5c518",
              borderRadius: 3,
            }} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
            <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>{formatSec(status.currentTime)}</Text>
            <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>{formatSec(status.duration)}</Text>
          </View>
        </View>
      )}
      {uiStatus !== "error" && (
        <Text className="text-parchment-dark/50 text-xs mt-2">No pause. No replay.</Text>
      )}
    </View>
  );
}
