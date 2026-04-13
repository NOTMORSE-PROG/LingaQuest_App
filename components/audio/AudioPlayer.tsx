import { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, Animated, Pressable } from "react-native";
import { useFocusEffect } from "expo-router";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer as ExpoAudioPlayer, AudioStatus } from "expo-audio";
import { resolveAudioSource } from "@/lib/audio-assets";

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
  allowSkip?: boolean;
}

export function AudioPlayer({ audioUrl, onEnd, autoPlay = false, rate = 1.0, allowSkip = false }: AudioPlayerProps) {
  const [uiStatus, setUiStatus] = useState<"loading" | "playing" | "done" | "error">("loading");
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulsationRef = useRef<Animated.CompositeAnimation | null>(null);
  // Prevent double-firing onEnd if didJustFinish fires more than once
  const hasStartedRef = useRef(false);
  const hasEndedRef = useRef(false);
  // Stores last known duration so timer shows correctly after audio ends (currentTime resets to 0)
  const durRef = useRef(0);

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

  const playerRef = useRef<ExpoAudioPlayer | null>(null);
  const [status, setStatus] = useState<AudioStatus>({
    id: "", currentTime: 0, playbackState: "", timeControlStatus: "",
    reasonForWaitingToPlay: "", mute: false, duration: 0, playing: false,
    loop: false, didJustFinish: false, isBuffering: false, isLoaded: false,
    playbackRate: 1, shouldCorrectPitch: true,
  });

  // Pause audio when the screen loses focus (tabs navigator reuses this component,
  // so useEffect cleanup alone doesn't fire on navigation away)
  useFocusEffect(
    useCallback(() => {
      return () => {
        const p = playerRef.current;
        if (p) {
          try { p.pause(); } catch { /* ignore */ }
        }
      };
    }, [])
  );

  // Own the full player lifecycle manually so cleanup runs pause() before any expo-audio teardown
  useEffect(() => {
    const source = resolveAudioSource(audioUrl);
    const p = createAudioPlayer(source, { updateInterval: 100 });
    playerRef.current = p;
    const sub = p.addListener("playbackStatusUpdate", (s: AudioStatus) => {
      setStatus(s);
    });
    return () => {
      sub.remove();
      playerRef.current = null;
      try { p.pause(); } catch { /* ignore */ }
      try { p.remove(); } catch { /* ignore */ }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  // When audio finishes loading, apply rate and start playback
  useEffect(() => {
    const p = playerRef.current;
    if (!p || !status.isLoaded) return;
    p.setPlaybackRate(rate, "high"); // pitch-corrected slow/fast mode
    if (autoPlay) p.play();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.isLoaded]);

  // Apply rate changes dynamically (e.g. slow mode toggled — not currently used mid-listen)
  useEffect(() => {
    const p = playerRef.current;
    if (!p || !status.isLoaded) return;
    p.setPlaybackRate(rate, "high");
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
      pulsationRef.current = null;
    };
  }, [pulseAnim]);

  if (status.duration > 0) durRef.current = status.duration;

  const isPlaying = uiStatus === "playing";
  const knownDuration = durRef.current || status.duration;
  const progress = uiStatus === "done" ? 1.0 : (knownDuration > 0 ? status.currentTime / knownDuration : 0);
  const displayCurrentTime = uiStatus === "done" ? knownDuration : status.currentTime;

  const statusEmoji = uiStatus === "loading" ? "⏳" : uiStatus === "playing" ? "👂" : uiStatus === "error" ? "❌" : "✓";

  const statusText =
    uiStatus === "loading" ? "Loading audio..."
    : uiStatus === "playing" ? "Listening..."
    : uiStatus === "error" ? "Audio unavailable — moving on..."
    : "Audio complete";

  return (
    <View className="items-center py-8">
      {/* Pulsing emoji circle */}
      <Animated.View
        style={{ transform: [{ scale: isPlaying ? pulseAnim : 1 }] }}
        className={`w-24 h-24 rounded-full border-4 items-center justify-center ${
          uiStatus === "error" ? "bg-red-900/50 border-coral" : "bg-ocean-light border-gold"
        }`}
      >
        <Text className="text-5xl">{statusEmoji}</Text>
      </Animated.View>
      <Text className={`text-sm mt-2 ${uiStatus === "error" ? "text-coral" : "text-parchment-dark"}`}>
        {statusText}
      </Text>
      {(uiStatus === "playing" || uiStatus === "done") && knownDuration > 0 && (
        <View style={{ width: "80%", marginTop: 14 }}>
          <View style={{ height: 6, backgroundColor: "rgba(180,230,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
            <View style={{
              position: "absolute", top: 0, left: 0, bottom: 0,
              width: `${Math.round(progress * 100)}%`,
              backgroundColor: "#f5c518",
              borderRadius: 3,
            }} />
            <View style={{
              position: "absolute", top: 0, left: 0,
              width: `${Math.round(progress * 100)}%`,
              height: 1.5,
              backgroundColor: "rgba(220,245,255,0.3)",
              borderRadius: 1,
            }} />
          </View>
          <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, textAlign: "center", marginTop: 4 }}>
            {formatSec(displayCurrentTime)} / {formatSec(knownDuration)}
          </Text>
        </View>
      )}
      {uiStatus !== "error" && !allowSkip && (
        <Text className="text-parchment-dark/50 text-xs mt-2">No pause. No replay.</Text>
      )}
      {allowSkip && uiStatus !== "done" && uiStatus !== "error" && (
        <Pressable
          onPress={() => {
            if (hasEndedRef.current) return;
            hasEndedRef.current = true;
            try { playerRef.current?.pause(); } catch { /* ignore */ }
            pulsationRef.current?.stop();
            setUiStatus("done");
            onEndRef.current();
          }}
          className="mt-3 px-4 py-2 rounded-full bg-gold/20 border border-gold"
        >
          <Text className="text-gold text-xs font-bold">Skip ▶▶ (dev)</Text>
        </Pressable>
      )}
    </View>
  );
}
