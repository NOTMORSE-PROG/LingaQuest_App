import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withSpring, cancelAnimation, Easing } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { usePin, useSubmitProgress } from "@/hooks/useOfflineData";
import { AudioPlayer } from "@/components/audio/AudioPlayer";
import { DagatCharacter, DagatState } from "@/components/characters/DagatCharacter";
import { CaptainSalita } from "@/components/characters/CaptainSalita";
import { QuestSceneOverlay } from "@/components/scene/QuestSceneOverlay";
import { ShardClaimCinematic } from "@/components/scene/ShardClaimCinematic";
import { CertificateModal } from "@/components/scene/CertificateModal";
import { useAuthStore } from "@/stores/auth";
import { MuteButton } from "@/components/audio/MuteButton";
import { useSoundEffect } from "@/hooks/useSoundEffect";
import { Challenge } from "@/types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const LABELS = ["A", "B", "C", "D"] as const;


// Shuffle choices and reassign labels A→D in display order.
// Also updates `answer` so it still points to the correct choice.
function shuffleChallenge(c: Challenge): Challenge {
  const correctChoice = c.choices.find((ch) => ch.label === c.answer);
  const shuffled = shuffle(c.choices); // same object refs, new array
  // Find the correct choice's new position by reference before relabeling
  const shuffledIdx = correctChoice ? shuffled.indexOf(correctChoice) : -1;
  const relabeled = shuffled.map((ch, i) => ({ ...ch, label: LABELS[i] }));
  const newAnswer = shuffledIdx >= 0 ? LABELS[shuffledIdx] : c.answer;
  return { ...c, choices: relabeled, answer: newAnswer };
}

type Phase = "intro" | "listening" | "answering" | "result" | "submitting" | "claimShard" | "certificate" | "pinComplete";

// ─── Island 1 animated components ────────────────────────────────────────────

function FrostBorderCard({ children }: { children: ReactNode }) {
  const shimmer = useSharedValue(0);
  useEffect(() => {
    shimmer.value = withRepeat(withSequence(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
    ), -1, false);
    return () => cancelAnimation(shimmer);
  }, [shimmer]);
  const borderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(100,200,230,${0.25 + shimmer.value * 0.15})`,
  }));
  return (
    <Animated.View style={[{
      backgroundColor: "rgba(0,0,0,0.45)",
      borderRadius: 14, borderWidth: 1,
      paddingHorizontal: 18, paddingVertical: 14, marginBottom: 20,
    }, borderStyle]}>
      {children}
    </Animated.View>
  );
}

function FrostBurst() {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0.6);
  useEffect(() => {
    scale.value = withTiming(2.0, { duration: 800, easing: Easing.out(Easing.quad) });
    opacity.value = withTiming(0, { duration: 800 });
  }, [opacity, scale]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: "absolute", alignSelf: "center",
        width: 120, height: 120, borderRadius: 60,
        borderWidth: 2, borderColor: "rgba(100,200,230,0.7)",
      }, style]}
    />
  );
}

function ThawRing({ delay }: { delay: number }) {
  const scale = useSharedValue(0.2);
  const opacity = useSharedValue(0);
  useEffect(() => {
    const t = setTimeout(() => {
      opacity.value = withTiming(0.7, { duration: 200 });
      scale.value = withTiming(2.5, { duration: 1200, easing: Easing.out(Easing.quad) });
      opacity.value = withSequence(
        withTiming(0.7, { duration: 200 }),
        withTiming(0, { duration: 1000 }),
      );
    }, delay);
    return () => clearTimeout(t);
  }, [delay, opacity, scale]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: "absolute", alignSelf: "center",
        width: 80, height: 80, borderRadius: 40,
        borderWidth: 1.5, borderColor: "rgba(100,200,230,0.6)",
      }, style]}
    />
  );
}

// ─── Island 2 animated components ────────────────────────────────────────────

function ElectricBorderCard({ children }: { children: ReactNode }) {
  const shimmer = useSharedValue(0);
  useEffect(() => {
    shimmer.value = withRepeat(withSequence(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
    ), -1, false);
    return () => cancelAnimation(shimmer);
  }, [shimmer]);
  const borderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(142,68,173,${0.30 + shimmer.value * 0.20})`,
  }));
  return (
    <Animated.View style={[{
      backgroundColor: "rgba(0,0,0,0.45)",
      borderRadius: 14, borderWidth: 1,
      paddingHorizontal: 18, paddingVertical: 14, marginBottom: 20,
    }, borderStyle]}>
      {children}
    </Animated.View>
  );
}

function SpeedBurst() {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0.6);
  useEffect(() => {
    scale.value = withTiming(2.2, { duration: 700, easing: Easing.out(Easing.quad) });
    opacity.value = withTiming(0, { duration: 700 });
  }, [opacity, scale]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }], opacity: opacity.value,
  }));
  return (
    <Animated.View pointerEvents="none" style={[{
      position: "absolute", alignSelf: "center",
      width: 120, height: 120, borderRadius: 60,
      borderWidth: 2, borderColor: "rgba(195,155,211,0.75)",
    }, style]} />
  );
}

function LightningRing({ delay }: { delay: number }) {
  const scale = useSharedValue(0.2);
  const opacity = useSharedValue(0);
  useEffect(() => {
    const t = setTimeout(() => {
      opacity.value = withTiming(0.7, { duration: 200 });
      scale.value = withTiming(2.5, { duration: 1000, easing: Easing.out(Easing.quad) });
      opacity.value = withSequence(
        withTiming(0.7, { duration: 200 }),
        withTiming(0, { duration: 800 }),
      );
    }, delay);
    return () => clearTimeout(t);
  }, [delay, opacity, scale]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }], opacity: opacity.value,
  }));
  return (
    <Animated.View pointerEvents="none" style={[{
      position: "absolute", alignSelf: "center",
      width: 80, height: 80, borderRadius: 40,
      borderWidth: 1.5, borderColor: "rgba(195,155,211,0.65)",
    }, style]} />
  );
}

// ─── Island 3 animated components ────────────────────────────────────────────


function MistBorderCard({ children }: { children: ReactNode }) {
  const shimmer = useSharedValue(0);
  useEffect(() => {
    shimmer.value = withRepeat(withSequence(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
    ), -1, false);
    return () => cancelAnimation(shimmer);
  }, [shimmer]);
  const borderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(52,152,219,${0.25 + shimmer.value * 0.18})`,
  }));
  return (
    <Animated.View style={[{
      backgroundColor: "rgba(0,0,0,0.45)",
      borderRadius: 14, borderWidth: 1,
      paddingHorizontal: 18, paddingVertical: 14, marginBottom: 20,
    }, borderStyle]}>
      {children}
    </Animated.View>
  );
}

function ClarityBurst() {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0.6);
  useEffect(() => {
    scale.value = withTiming(2.1, { duration: 900, easing: Easing.out(Easing.quad) });
    opacity.value = withTiming(0, { duration: 900 });
  }, [opacity, scale]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }], opacity: opacity.value,
  }));
  return (
    <Animated.View pointerEvents="none" style={[{
      position: "absolute", alignSelf: "center",
      width: 120, height: 120, borderRadius: 60,
      borderWidth: 2, borderColor: "rgba(52,152,219,0.70)",
    }, style]} />
  );
}

function FogRing({ delay }: { delay: number }) {
  const scale = useSharedValue(0.2);
  const opacity = useSharedValue(0);
  useEffect(() => {
    const t = setTimeout(() => {
      opacity.value = withTiming(0.7, { duration: 200 });
      scale.value = withTiming(2.5, { duration: 1100, easing: Easing.out(Easing.quad) });
      opacity.value = withSequence(
        withTiming(0.7, { duration: 200 }),
        withTiming(0, { duration: 900 }),
      );
    }, delay);
    return () => clearTimeout(t);
  }, [delay, opacity, scale]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }], opacity: opacity.value,
  }));
  return (
    <Animated.View pointerEvents="none" style={[{
      position: "absolute", alignSelf: "center",
      width: 80, height: 80, borderRadius: 40,
      borderWidth: 1.5, borderColor: "rgba(52,152,219,0.60)",
    }, style]} />
  );
}

// ─── Island 4 animated components ────────────────────────────────────────────

function EmberBorderCard({ children }: { children: ReactNode }) {
  const shimmer = useSharedValue(0);
  useEffect(() => {
    shimmer.value = withRepeat(withSequence(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
    ), -1, false);
    return () => cancelAnimation(shimmer);
  }, [shimmer]);
  const borderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(231,76,60,${0.28 + shimmer.value * 0.20})`,
  }));
  return (
    <Animated.View style={[{
      backgroundColor: "rgba(0,0,0,0.45)",
      borderRadius: 14, borderWidth: 1,
      paddingHorizontal: 18, paddingVertical: 14, marginBottom: 20,
    }, borderStyle]}>
      {children}
    </Animated.View>
  );
}

function PassionBurst() {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0.6);
  useEffect(() => {
    scale.value = withTiming(2.2, { duration: 900, easing: Easing.out(Easing.quad) });
    opacity.value = withTiming(0, { duration: 900 });
  }, [opacity, scale]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }], opacity: opacity.value,
  }));
  return (
    <Animated.View pointerEvents="none" style={[{
      position: "absolute", alignSelf: "center",
      width: 120, height: 120, borderRadius: 60,
      borderWidth: 2, borderColor: "rgba(231,76,60,0.72)",
    }, style]} />
  );
}

function EmberRing({ delay }: { delay: number }) {
  const scale = useSharedValue(0.2);
  const opacity = useSharedValue(0);
  useEffect(() => {
    const t = setTimeout(() => {
      opacity.value = withTiming(0.7, { duration: 200 });
      scale.value = withTiming(2.5, { duration: 1100, easing: Easing.out(Easing.quad) });
      opacity.value = withSequence(
        withTiming(0.7, { duration: 200 }),
        withTiming(0, { duration: 900 }),
      );
    }, delay);
    return () => clearTimeout(t);
  }, [delay, opacity, scale]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }], opacity: opacity.value,
  }));
  return (
    <Animated.View pointerEvents="none" style={[{
      position: "absolute", alignSelf: "center",
      width: 80, height: 80, borderRadius: 40,
      borderWidth: 1.5, borderColor: "rgba(231,76,60,0.62)",
    }, style]} />
  );
}

// ─── Island 5 animated components ────────────────────────────────────────────

function BeamBorderCard({ children }: { children: ReactNode }) {
  const shimmer = useSharedValue(0);
  useEffect(() => {
    shimmer.value = withRepeat(withSequence(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
    ), -1, false);
    return () => cancelAnimation(shimmer);
  }, [shimmer]);
  const borderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(230,126,34,${0.28 + shimmer.value * 0.20})`,
  }));
  return (
    <Animated.View style={[{
      backgroundColor: "rgba(0,0,0,0.45)",
      borderRadius: 14, borderWidth: 1,
      paddingHorizontal: 18, paddingVertical: 14, marginBottom: 20,
    }, borderStyle]}>
      {children}
    </Animated.View>
  );
}

function PrecisionBurst() {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0.6);
  useEffect(() => {
    scale.value = withTiming(2.2, { duration: 850, easing: Easing.out(Easing.quad) });
    opacity.value = withTiming(0, { duration: 850 });
  }, [opacity, scale]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }], opacity: opacity.value,
  }));
  return (
    <Animated.View pointerEvents="none" style={[{
      position: "absolute", alignSelf: "center",
      width: 120, height: 120, borderRadius: 60,
      borderWidth: 2, borderColor: "rgba(230,126,34,0.72)",
    }, style]} />
  );
}

function HarborRing({ delay }: { delay: number }) {
  const scale = useSharedValue(0.2);
  const opacity = useSharedValue(0);
  useEffect(() => {
    const t = setTimeout(() => {
      opacity.value = withTiming(0.7, { duration: 200 });
      scale.value = withTiming(2.5, { duration: 1100, easing: Easing.out(Easing.quad) });
      opacity.value = withSequence(
        withTiming(0.7, { duration: 200 }),
        withTiming(0, { duration: 900 }),
      );
    }, delay);
    return () => clearTimeout(t);
  }, [delay, opacity, scale]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }], opacity: opacity.value,
  }));
  return (
    <Animated.View pointerEvents="none" style={[{
      position: "absolute", alignSelf: "center",
      width: 80, height: 80, borderRadius: 40,
      borderWidth: 1.5, borderColor: "rgba(230,126,34,0.62)",
    }, style]} />
  );
}

// ─── Island 6 animated components ────────────────────────────────────────────

function NarrativeBorderCard({ children }: { children: ReactNode }) {
  const shimmer = useSharedValue(0);
  useEffect(() => {
    shimmer.value = withRepeat(withSequence(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
    ), -1, false);
    return () => cancelAnimation(shimmer);
  }, [shimmer]);
  const borderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(26,188,156,${0.28 + shimmer.value * 0.22})`,
  }));
  return (
    <Animated.View style={[{
      backgroundColor: "rgba(0,0,0,0.45)",
      borderRadius: 14, borderWidth: 1,
      paddingHorizontal: 18, paddingVertical: 14, marginBottom: 20,
    }, borderStyle]}>
      {children}
    </Animated.View>
  );
}

function NarrativeBurst() {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0.6);
  useEffect(() => {
    scale.value = withTiming(2.2, { duration: 850, easing: Easing.out(Easing.quad) });
    opacity.value = withTiming(0, { duration: 850 });
  }, [opacity, scale]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }], opacity: opacity.value,
  }));
  return (
    <Animated.View pointerEvents="none" style={[{
      position: "absolute", alignSelf: "center",
      width: 120, height: 120, borderRadius: 60,
      borderWidth: 2, borderColor: "rgba(26,188,156,0.72)",
    }, style]} />
  );
}

function StoryRing({ delay }: { delay: number }) {
  const scale = useSharedValue(0.2);
  const opacity = useSharedValue(0);
  useEffect(() => {
    const t = setTimeout(() => {
      opacity.value = withSequence(
        withTiming(0.7, { duration: 200 }),
        withTiming(0, { duration: 900 }),
      );
      scale.value = withTiming(2.5, { duration: 1100, easing: Easing.out(Easing.quad) });
    }, delay);
    return () => clearTimeout(t);
  }, [delay, opacity, scale]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }], opacity: opacity.value,
  }));
  return (
    <Animated.View pointerEvents="none" style={[{
      position: "absolute", alignSelf: "center",
      width: 80, height: 80, borderRadius: 40,
      borderWidth: 1.5, borderColor: "rgba(26,188,156,0.62)",
    }, style]} />
  );
}

// ─── Island 7 animated components ────────────────────────────────────────────

function EchoBorderCard({ children }: { children: ReactNode }) {
  const shimmer = useSharedValue(0);
  useEffect(() => {
    shimmer.value = withRepeat(withSequence(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
    ), -1, false);
    return () => cancelAnimation(shimmer);
  }, [shimmer]);
  const borderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(245,197,24,${0.30 + shimmer.value * 0.22})`,
  }));
  return (
    <Animated.View style={[{
      backgroundColor: "rgba(0,0,0,0.45)",
      borderRadius: 14, borderWidth: 1,
      paddingHorizontal: 18, paddingVertical: 14, marginBottom: 20,
    }, borderStyle]}>
      {children}
    </Animated.View>
  );
}

function EchoBurst() {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0.6);
  useEffect(() => {
    scale.value = withTiming(2.4, { duration: 900, easing: Easing.out(Easing.quad) });
    opacity.value = withTiming(0, { duration: 900 });
  }, [opacity, scale]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: "absolute", alignSelf: "center",
        width: 120, height: 120, borderRadius: 60,
        borderWidth: 2, borderColor: "rgba(245,197,24,0.75)",
      }, style]}
    />
  );
}

function EchoShockRing({ delay }: { delay: number }) {
  const scale = useSharedValue(0.2);
  const opacity = useSharedValue(0);
  useEffect(() => {
    const t = setTimeout(() => {
      opacity.value = withTiming(0.7, { duration: 200 });
      scale.value = withTiming(2.5, { duration: 1000, easing: Easing.out(Easing.quad) });
      opacity.value = withSequence(
        withTiming(0.7, { duration: 200 }),
        withTiming(0, { duration: 800 }),
      );
    }, delay);
    return () => clearTimeout(t);
  }, [delay, opacity, scale]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return (
    <Animated.View pointerEvents="none" style={[{
      position: "absolute", alignSelf: "center",
      width: 80, height: 80, borderRadius: 40,
      borderWidth: 1.5, borderColor: "rgba(245,197,24,0.65)",
    }, style]} />
  );
}

function QuestBonusTimer({ seconds }: { seconds: number }) {
  const expired = seconds === 0;
  const barColor =
    expired         ? "#ef4444"
    : seconds <= 10 ? "#ef4444"
    : seconds <= 15 ? "#f97316"
    : seconds <= 30 ? "#eab308"
    : "#14b8a6";
  const displaySec = seconds < 10 ? `0:0${seconds}` : `0:${seconds}`;
  return (
    <View style={{
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(10,14,26,0.88)",
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: expired ? "rgba(239,68,68,0.7)" : "rgba(245,197,24,0.45)",
      paddingHorizontal: 20,
      paddingVertical: 8,
      marginBottom: 14,
      gap: 12,
    }}>
      <Text style={{
        color: barColor,
        fontSize: 20,
        fontWeight: "800",
        fontVariant: ["tabular-nums"],
        letterSpacing: 1,
      }}>
        {expired ? "⏰" : "⏱"} {displaySec}
      </Text>
      <View style={{
        flex: 1,
        height: 6,
        backgroundColor: "rgba(255,255,255,0.12)",
        borderRadius: 3,
        overflow: "hidden",
      }}>
        <View style={{
          height: "100%",
          width: `${Math.round((seconds / 60) * 100)}%` as unknown as number,
          backgroundColor: barColor,
          borderRadius: 3,
        }} />
      </View>
    </View>
  );
}

export default function QuestScreen() {
  const { pinId, mode, nextPinId } = useLocalSearchParams<{ pinId: string; mode?: string; nextPinId?: string }>();
  const [isResultMode, setIsResultMode] = useState(mode === "result");
  const { user } = useAuthStore();
  const characterMode = true;
  const { playCorrect, playWrong } = useSoundEffect();

  const [phase, setPhase] = useState<Phase>("intro");
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [selected, setSelected] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [bonusTime, setBonusTime] = useState(60);
  const [correctCount, setCorrectCount] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [pinScore, setPinScore] = useState(0);
  const [shuffledChallenges, setShuffledChallenges] = useState<Challenge[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [slowMode, setSlowMode] = useState(false);
  // Track if pin was already completed when loaded — used to skip shard cinematic on retry
  const wasAlreadyCompleted = useRef(false);

  // Island 1 — shake animation for wrong result card
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  // Island 1 — score emoji spring-in
  const scoreScale = useSharedValue(0);
  const scoreOpacity = useSharedValue(0);
  const scoreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scoreScale.value }],
    opacity: scoreOpacity.value,
  }));

  // Island 1 — track whether FrostBurst should be shown
  const [showFrostBurst, setShowFrostBurst] = useState(false);
  // Island 2 — track whether SpeedBurst should be shown
  const [showSpeedBurst, setShowSpeedBurst] = useState(false);
  // Island 3 — track whether ClarityBurst should be shown
  const [showClarityBurst, setShowClarityBurst] = useState(false);
  // Island 4 — track whether PassionBurst should be shown
  const [showPassionBurst, setShowPassionBurst] = useState(false);
  // Island 5 — track whether PrecisionBurst should be shown
  const [showPrecisionBurst, setShowPrecisionBurst] = useState(false);
  // Island 6 — track whether NarrativeBurst should be shown
  const [showNarrativeBurst, setShowNarrativeBurst] = useState(false);
  // Island 7 — track whether EchoBurst should be shown
  const [showEchoBurst, setShowEchoBurst] = useState(false);

  // Reset all per-pin state when navigating to a different pin.
  // The (main) layout uses a Tabs navigator which REUSES this component instance across
  // router.replace() calls — useState initialises only once on mount, so stale values
  // (especially isResultMode=true) would bleed into the next pin without this reset.
  const prevPinIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (prevPinIdRef.current === undefined) {
      prevPinIdRef.current = pinId;
      return; // initial mount — useState already set correctly
    }
    if (prevPinIdRef.current === pinId) return;
    prevPinIdRef.current = pinId;

    setIsResultMode(mode === "result");
    setPhase("intro");
    setChallengeIndex(0);
    setSelected(null);
    setCorrectCount(0);
    setPinScore(0);
    setShowHint(false);
    setBonusTime(60);
    setSubmitError(null);
    setSlowMode(false);
    wasAlreadyCompleted.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinId]);

  const { data: pin, isLoading, isError: isPinError, error: pinError, refetch: refetchPin } = usePin(pinId);
  const isPinLocked = isPinError && (pinError as Error)?.message?.includes("permission");

  const submitMutation = useSubmitProgress();
  // Wire up phase transitions that the original onSuccess/onError handled
  const originalSubmitMutate = submitMutation.mutate;
  submitMutation.mutate = ((data: { pinId: string; accuracy: number }, options?: any) => {
    originalSubmitMutate(data, {
      ...options,
      onSuccess: (...args: any[]) => {
        setSubmitError(null);
        setPhase((prev) => (prev === "submitting" ? "pinComplete" : prev));
        options?.onSuccess?.(...args);
      },
      onError: (err: unknown, ...rest: any[]) => {
        setSubmitError(
          err instanceof Error ? err.message : "Progress could not be saved. Please retry."
        );
        setPhase((prev) => (prev === "submitting" ? "pinComplete" : prev));
        options?.onError?.(err, ...rest);
      },
    });
  }) as typeof submitMutation.mutate;

  // Shuffle challenges and choices once per pin load
  useEffect(() => {
    if (!pin?.challenges?.length) return;
    const shuffled = shuffle(pin.challenges).map(shuffleChallenge);
    setShuffledChallenges(shuffled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin?.id]); // intentional: only re-shuffle when pin changes, not on every challenges reference update

  // Mark if pin was already completed when first loaded (skip shard cinematic on retry)
  useEffect(() => {
    if (pin?.isCompleted) {
      wasAlreadyCompleted.current = true;
    }
  }, [pin?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Result mode: jump straight to score page if pin is already completed
  useEffect(() => {
    if (isResultMode && pin?.isCompleted && pin?.accuracy !== undefined && phase === "intro") {
      setPinScore(pin.accuracy ?? 0);
      setPhase("pinComplete");
    }
  }, [isResultMode, pin?.isCompleted, pin?.accuracy, pin?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Play correct/wrong SFX when result is revealed
  useEffect(() => {
    if (phase !== "result" || selected === null) return;
    if (selected === current?.answer) playCorrect();
    else playWrong();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // 4-second countdown when result is shown — forces student to read explanation
  useEffect(() => {
    if (phase !== "result") return;
    setCountdown(4);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Auto-show hint after 30s of no answer
  useEffect(() => {
    if (phase !== "answering" || selected !== null || showHint) return;
    const timer = setTimeout(() => setShowHint(true), 30000);
    return () => clearTimeout(timer);
  }, [phase, selected, showHint]);

  // 60-second bonus timer — visual pressure during answering, non-blocking
  useEffect(() => {
    if (phase !== "answering") {
      setBonusTime(60);
      return;
    }
    setBonusTime(60);
    const interval = setInterval(() => {
      setBonusTime((t) => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, challengeIndex]);

  // Island 1-7 — shake on wrong result, burst on correct
  useEffect(() => {
    if (phase !== "result" || selected === null) return;
    const islandN = pin?.island?.number ?? 0;
    if (islandN !== 1 && islandN !== 2 && islandN !== 3 && islandN !== 4 && islandN !== 5 && islandN !== 6 && islandN !== 7) return;
    if (selected !== current?.answer) {
      // Shake wrong card
      shakeX.value = withSequence(
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(-4, { duration: 50 }),
        withTiming(4, { duration: 50 }),
        withTiming(-2, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    } else {
      if (islandN === 1) {
        setShowFrostBurst(true);
        setTimeout(() => setShowFrostBurst(false), 900);
      } else if (islandN === 2) {
        setShowSpeedBurst(true);
        setTimeout(() => setShowSpeedBurst(false), 800);
      } else if (islandN === 3) {
        setShowClarityBurst(true);
        setTimeout(() => setShowClarityBurst(false), 1000);
      } else if (islandN === 4) {
        setShowPassionBurst(true);
        setTimeout(() => setShowPassionBurst(false), 1000);
      } else if (islandN === 5) {
        setShowPrecisionBurst(true);
        setTimeout(() => setShowPrecisionBurst(false), 950);
      } else if (islandN === 6) {
        setShowNarrativeBurst(true);
        setTimeout(() => setShowNarrativeBurst(false), 950);
      } else if (islandN === 7) {
        setShowEchoBurst(true);
        setTimeout(() => setShowEchoBurst(false), 1000);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Island 1-7 — spring-in score emoji on pinComplete
  useEffect(() => {
    if (phase !== "pinComplete") return;
    const islandN = pin?.island?.number ?? 0;
    if (islandN !== 1 && islandN !== 2 && islandN !== 3 && islandN !== 4 && islandN !== 5 && islandN !== 6 && islandN !== 7) return;
    scoreScale.value = 0;
    scoreOpacity.value = 0;
    scoreScale.value = withSpring(1, { damping: 8, stiffness: 100 });
    scoreOpacity.value = withTiming(1, { duration: 300 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function resetToIntro() {
    setPhase("intro");
    setChallengeIndex(0);
    setSelected(null);
    setCorrectCount(0);
    setPinScore(0);
    setShowHint(false);
    setSubmitError(null);
    setSlowMode(false);
    if (pin?.challenges?.length) {
      setShuffledChallenges(shuffle(pin.challenges).map(shuffleChallenge));
    }
  }

  function confirmExit() {
    const dest = `/(main)/island/${pin?.islandId}` as const;
    if (phase === "intro" || phase === "submitting" || phase === "pinComplete" || phase === "claimShard" || phase === "certificate") {
      router.replace(dest);
      return;
    }
    Alert.alert(
      "Abandon this pin?",
      "Your progress will be lost to the sea.",
      [
        { text: "Stay", style: "cancel" },
        {
          text: "Exit", style: "destructive", onPress: () => {
            resetToIntro(); // ensure re-entry starts from the beginning
            router.replace(dest);
          }
        },
      ]
    );
  }

  // Must be declared before any early returns — Rules of Hooks
  const handleAudioEnd = useCallback(() => {
    setPhase("answering");
  }, []);

  if (isLoading) {
    return (
      <View className="flex-1 bg-ocean-deep items-center justify-center">
        <ActivityIndicator color="#f5c518" size="large" />
      </View>
    );
  }

  if (isPinLocked) {
    return (
      <View className="flex-1 bg-ocean-deep items-center justify-center px-8">
        <Text className="text-5xl mb-4">🔒</Text>
        <Text className="text-gold text-xl font-bold text-center mb-2">Island Locked</Text>
        <Text className="text-parchment text-sm text-center mb-8">
          Complete and pass all previous islands to unlock this quest.
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="bg-gold rounded-xl px-8 py-3 w-full items-center">
          <Text className="text-ocean-deep font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isPinError || !pin) {
    return (
      <View className="flex-1 bg-ocean-deep items-center justify-center px-8">
        <Text className="text-5xl mb-4">🌊</Text>
        <Text className="text-gold text-xl font-bold text-center mb-2">The sea is rough</Text>
        <Text className="text-parchment text-sm text-center mb-8">
          Could not load this quest. Check your connection and try again.
        </Text>
        <TouchableOpacity
          onPress={() => refetchPin()}
          className="bg-gold rounded-xl px-8 py-3 mb-4 w-full items-center"
        >
          <Text className="text-ocean-deep font-bold">Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} className="items-center">
          <Text className="text-parchment/60 text-sm">← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const challenges: Challenge[] = shuffledChallenges.length > 0 ? shuffledChallenges : (pin.challenges ?? []);
  const current = challenges[challengeIndex];
  const isLastChallenge = challengeIndex === challenges.length - 1;

  if (!current) {
    return (
      <View className="flex-1 bg-ocean-deep items-center justify-center px-8">
        <Text className="text-6xl mb-4">🏴‍☠️</Text>
        <Text className="text-gold text-xl font-bold text-center mb-2">No Challenges Yet</Text>
        <Text className="text-parchment text-sm text-center mb-8">
          The captain hasn't added content to this pin.
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="bg-gold rounded-xl px-8 py-3">
          <Text className="text-ocean-deep font-bold">← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const isCorrect = selected === current?.answer;

  // Island + pin scene config
  const ISLAND_ACCENT = ["#27ae60","#8e44ad","#3498db","#e74c3c","#e67e22","#1abc9c","#f5c518"];
  const islandNum = pin.island?.number ?? 1;
  const accentColor = ISLAND_ACCENT[islandNum - 1] ?? "#27ae60";
  const islandName = pin.island?.name ?? "";
  const islandSkill = pin.island?.skillFocus ?? "";
  const npcIntro = pin.island?.npcDialogueIntro ?? "Listen carefully, young sailor. The audio plays once. Trust what you hear.";
  const npcFail = pin.island?.npcDialogueFail ?? "Even seasoned sailors mishear. The sea will test you again.";
  const npcAudioIntro = (pin.island as any)?.npcAudioIntro ?? undefined;
  const npcAudioFail = (pin.island as any)?.npcAudioFail ?? undefined;
  const npcAudioSuccess = (pin.island as any)?.npcAudioSuccess ?? undefined;
  const pinSortOrder: number = pin.sortOrder;
  const questBg =
    islandNum === 1 ? { backgroundColor: "#071a0b" } :
    islandNum === 2 ? { backgroundColor: "#0d0519" } :
    islandNum === 3 ? { backgroundColor: "#06101e" } :
    islandNum === 4 ? { backgroundColor: "#180505" } :
    islandNum === 5 ? { backgroundColor: "#180c00" } :
    islandNum === 6 ? { backgroundColor: "#021512" } :
    islandNum === 7 ? { backgroundColor: "#120f00" } :
    {};

  // Island 1 per-pin story intro cards (Dagat's POV moment before each challenge)
  const PIN_STORY_I1: Record<number, string> = {
    1: "On the dock, an old navigator had unrolled his map — but every word was frozen solid. Dagat knelt beside him and listened.",
    2: "Young Mando had failed again. The sailors' laughter hung frozen in the cold air. Dagat waited for the words to break free.",
    3: "Halfway through the frozen dock, Dagat found the notice board. Every announcement, every label, every name — encased in ice. But the harbour master was still calling out to passing ships. Dagat listened for the words that broke through the freeze.",
    4: "A peculiar ship emerged from the fog. Old Kulas squinted — even the ship's name was frozen on its hull, unreadable.",
    5: "The Alingawngaw storm was building. Captain Hana watched the waves. The crew's voices turned to frozen breath.",
  };
  const PIN_STORY_I2: Record<number, string> = {
    1: "The Baybayin had barely anchored when Dagat heard it — every voice on the dock moving at double speed. Ingay had stolen time from this island. Dagat steadied herself and listened.",
    2: "Further into Bilis, the announcements came faster. Sailors flinched at voices they couldn't catch. Dagat pressed her back against a dock post and breathed slowly.",
    3: "The radio tower at the centre of Bilis crackled and hissed. Ingay had wound every broadcast tight — voices rushing past like wind through rigging. A ship's log was being read aloud. The words blurred together. Dagat breathed slowly and reached into the rush for the thread.",
    4: "Deep in Isla ng Bilis now, the blur was worse — words piling on each other, syllables compressed to near-nothing. Dagat could feel Ingay pushing back harder.",
    5: "The Swift Shard pulled at the air around her. One more challenge. Ingay poured everything into this island — but Dagat had learned to breathe slow when everything ran fast.",
  };

  const PIN_STORY_I3: Record<number, string> = {
    1: "The fog of Isla ng Diwa was not like ordinary sea mist. It moved with purpose — it had been sent. Dagat could hear a voice ahead, but the words kept shifting, circling, returning. She focused on what repeated.",
    2: "Deeper into the fog. The voice changed, but the fog held its shape. Dagat noticed that important things came back — spoke twice, then three times. She stopped chasing every detail and waited for what stayed.",
    3: "The fog split into two voices here — one loud, one quiet. Ingay had layered them on purpose. Dagat closed her eyes. The loud voice carried the detail. The quiet one carried the meaning. She waited for the quiet one to speak again.",
    4: "The fog pressed deeper. Dagat moved further in. Here, the details were longer, the misdirections more deliberate. Ingay wanted her lost in the particulars. She held to what the voice kept returning to.",
    5: "The Clarity Shard was close. One more passage to hear through the fog. The mist swirled at its densest — but Dagat had learned: the main idea was never hiding. It was the thing the speaker could not stop saying.",
  };

  const PIN_STORY_I4: Record<number, string> = {
    1: "Isla ng Damdamin had no sound Dagat expected — no clashing steel, no howling wind. Just silence with all the feeling taken out. A navigator's voice reached her, all the words intact, but hollow. She listened past the surface. The worry was still there — hidden in the pauses.",
    2: "The emotional drain went deeper here. Dagat heard a sailor recount a terrible morning that turned kind — but the voice told her nothing of how it felt. She traced the arc of it anyway: from frustration to warmth. The shape of the story carried the feeling.",
    3: "A letter had been posted on the harbour board — an announcement that should have been urgent, or proud, or afraid. Ingay's drain had taken all of it. Dagat read the shape of the words instead. The emotion was still there — pressed flat, but present.",
    4: "Ingay's drain was total now. Even encouragement arrived cold. A captain spoke to a young sailor who had made a mistake — and every note of firmness, every hidden warmth, was invisible. Dagat closed her eyes and listened for what the words were trying to do.",
    5: "The Empathy Shard glowed somewhere in the ash-grey air. One passage left — a handwritten letter, its warmth stripped to nothing by the drain. Dagat took it in her hands and read it aloud herself. The courage between the lines was still there. It was always there.",
  };

  const PIN_STORY_I5: Record<number, string> = {
    1: "Isla ng Tanong felt like stepping into a registry hall mid-storm. Numbers and names flew everywhere, attaching themselves to the wrong facts. Dagat steadied herself at a dock post and listened for the one detail she needed — not the one that floated loudest, but the right one.",
    2: "The scatter was relentless further in. A name would begin to land, then a number would knock it sideways. Dagat learned to lock onto a single anchor word — 'increase', 'maximum', 'first' — and wait for the precise detail that followed it.",
    3: "A crew manifest was being called aloud. Names and numbers, ranks and records — Ingay had scrambled the order. Dagat fixed on one anchor: a name she had heard twice. Everything else she let go. The specific detail she needed was attached to that name. She waited for it to return.",
    4: "Ingay's interference was at full force now. Gallery numbers transposed; pier numbers multiplied. Dagat tuned out every number that arrived before the one she was hunting. One specific fact. That was all she needed.",
    5: "The Precision Shard glittered somewhere beyond the harbormaster's post — sharp-edged, catching light at exact angles. Dagat could feel it cutting through the scatter like a lighthouse beam. One number left to catch. She held her breath and let all the wrong ones float past.",
  };

  const PIN_STORY_I6: Record<number, string> = {
    1: "Isla ng Kwento was an island of broken sentences and unfinished tales. Storytellers stood mid-word, their memories shattered by Ingay's curse. Dagat found she had to gather the fragments — like picking up spilled beads — and thread them back into the shape of a story.",
    2: "Further in, the fragments were wilder — beginnings attached to the wrong endings, middles floating loose. Dagat learned to anchor on the characters. Follow Andoy. Follow Tala. The people carry the story even when the memory breaks.",
    3: "A storyteller sat at the centre of the dock, telling a tale that had no middle. Ingay had taken it. Dagat listened to the beginning and listened to the end — then built the bridge herself. It was not guessing. It was understanding. The story wanted to be whole.",
    4: "The stories arrived heavier now. These weren't just tales — they were memories. A grandfather on a dock. An empty hammock. Dagat held each one carefully, knowing that what people remember — and why — is where the meaning lives.",
    5: "The Story Shard pulsed. One more story to follow. And somewhere in its last words, Dagat heard a name she knew she would need again. Stories, she had learned, do not end. They travel forward.",
  };

  const PIN_STORY_I7: Record<number, string> = {
    1: "Isla ng Alingawngaw hit all at once. Words scrambled. Time blurring. Fog pressing in. Emotions stripped. Facts scattering. Stories mid-shatter. Ingay had saved everything for here — her last stronghold. Dagat stood still at the shore and breathed. Six glowing shards in her satchel. Everything she had learned. She had not come this far to stop listening.",
    2: "Further in, the chaos was deliberate. Ingay wasn't just throwing noise — she was layering every curse at once. Dagat felt the pull to panic. She chose instead to anchor on what she knew: context for unfamiliar words, main idea beneath the noise, tone beneath the silence. One thread at a time.",
    3: "The storm had a pattern. Dagat began to see it — the same sequence of interference, cycling back. Ingay was not random. She was relentless. Dagat matched her rhythm and found the gap — the one moment between gusts where the voice was clear. She listened for that gap.",
    4: "And then she heard a voice she recognised. Old Mang Berto — here, in the heart of Ingay's stronghold — telling a story clear as a lighthouse beam through the storm. The word he named was one she had been living. Dagat listened without moving. Stories, she had learned, do not end. They travel forward.",
    5: "The Echo Shard pulsed — the greatest of them all. It echoed with the sound of every island she had conquered. Dagat placed it with the other six. Six shards. One crystal. Captain Salita stepped forward. He opened his mouth. And for the first time in one hundred years, he spoke.",
  };

  const ISLAND_STRATEGY: Record<number, string> = {
    1: "Listen for unfamiliar words and use the surrounding sentence to figure out their meaning.",
    2: "The speaker will talk fast. Don't try to catch every word — focus on the overall message and key nouns.",
    3: "Ask yourself: what is the speaker's main point? Details support it, but the main idea is what keeps coming back.",
    4: "Pay attention to how the speaker sounds, not just what they say. Tone, pauses, and word choice reveal emotion.",
    5: "You are hunting one specific piece of information. Ignore everything else and wait for your target detail.",
    6: "Follow the story order: who is involved, what happened, and how did it end? Don't lose the thread.",
    7: "All skills at once. Stay calm. Main idea first, then tone, then specific detail — in that order.",
  };

  const CHALLENGE_STRATEGY: Record<number, Record<number, Record<number, string>>> = {
    1: { // Isla ng Salita — Vocabulary in Context
      1: {
        0: "Listen for how the speaker uses the word in a sentence. Context clues — what comes just before and after — will reveal the meaning.",
        1: "Focus on what the speaker is describing as limited or hard to find. That situation will point you to the right meaning.",
      },
      2: {
        0: "Listen for what the character is encouraged to keep doing despite difficulty. The action being urged is the key.",
        1: "Pay attention to how the character feels in that moment. The speaker's tone and the situation together reveal the emotional meaning.",
      },
      3: {
        0: "Listen for hesitation. Is the character willing or pulling back from something? That attitude is the meaning.",
        1: "Notice how seriously the character speaks or acts. Sincerity and genuine effort are the clues to the word's meaning.",
      },
      4: {
        0: "What is being described as strange or out of the ordinary? The unusual thing is exactly what the word points to.",
        1: "Focus on how lost or confused the character feels. Their reaction to the unexpected is the meaning.",
      },
      5: {
        0: "Listen for determination that does not give up. How the character keeps going despite difficulty reveals the meaning.",
        1: "Pay attention to the intensity being described. Strength and fierceness in the scene point directly to the meaning.",
      },
    },
    2: { // Isla ng Bilis — Rapid Speech Comprehension
      1: {
        0: "The speaker moves fast. Listen for a schedule word — a day, time, or change in plan. Everything else can blur.",
        1: "Focus only on the hours or time period. One number is your target — let everything around it pass.",
      },
      2: {
        0: "Listen for the reason — a 'because', 'due to', or explanation word. What follows it is the answer.",
        1: "A name or place is coming. Proper nouns stand out even in fast speech — hold on to it when you hear it.",
      },
      3: {
        0: "Listen for a location change. The 'new' detail after the change word is the answer.",
        1: "Focus on a status word — 'ready', 'delayed', 'available'. That single word carries the answer.",
      },
      4: {
        0: "The reason will follow a cause word like 'because' or 'due to'. Stay focused after it — the answer is right there.",
        1: "A specific number is being announced. Anticipate it — numbers move fast and won't repeat.",
      },
      5: {
        0: "Listen for a postponement signal — 'delayed', 'moved to', 'rescheduled'. What comes after is the new plan.",
        1: "One number — hours or duration. Let every other word blur. The figure is all you need.",
      },
    },
    3: { // Isla ng Diwa — Main Idea and Details
      1: {
        0: "Ask: what is the speaker's overall point? The main idea is not the examples — it is what the examples are meant to support.",
        1: "The speaker may mention negatives before the main point. Listen for what they conclude, not just what they describe.",
      },
      2: {
        0: "Listen for a repeated concern or recommendation. What the speaker keeps returning to is the main idea.",
        1: "The speaker builds toward a conclusion. Wait for the strongest statement — that is the main idea.",
      },
      3: {
        0: "Listen for the speaker's central advice or lesson. Details illustrate it — but the lesson itself is the main idea.",
        1: "Ask: what is the speaker most concerned about? Their priority is the main idea.",
      },
      4: {
        0: "Notice what changes and why it matters. The significance of the change is the central point.",
        1: "The speaker describes a process. The reason for the process — why it matters — is the main idea.",
      },
      5: {
        0: "Listen for what the speaker ultimately recommends. The overall recommendation is the main idea.",
        1: "What is the speaker arguing for? Their main argument — not the supporting examples — is what the question is asking.",
      },
    },
    4: { // Isla ng Damdamin — Emotional Tone and Inference
      1: {
        0: "Listen past the words. How does the speaker sound? Hesitation, careful word choice, and pauses carry the feeling.",
        1: "Listen for a shift in tone. A change in how the speaker sounds signals a change in feeling.",
      },
      2: {
        0: "Pride shows in how the speaker elevates something — their word choice and emphasis will tell you.",
        1: "Quiet acceptance is subtle. Listen for a calm tone, measured words, and the absence of protest.",
      },
      3: {
        0: "Determination without emotion is steady and purposeful. Listen for resolve in the speaker's pace and word choice.",
        1: "Warmth shows in specific words chosen — careful, encouraging, gentle. Listen for what the speaker chooses to emphasise.",
      },
      4: {
        0: "Some tones carry two feelings at once. Listen for the firmness underneath the encouragement.",
        1: "Gratitude is collective here. Listen for who is being thanked and how the speaker includes everyone.",
      },
      5: {
        0: "A letter's tone is in the words chosen. Listen for warmth even in words about difficulty or distance.",
        1: "Bittersweet holds two feelings at once — loss and something positive. Listen for both at the same time.",
      },
    },
    5: { // Isla ng Tanong — Listening for Specific Information
      1: {
        0: "A percentage is coming. Ignore everything else and wait for the number — that is the only target.",
        1: "A count is coming. Hold on for the exact figure — don't estimate from context.",
      },
      2: {
        0: "A name is coming. Proper names stand out in speech — listen for it and hold it in memory.",
        1: "One specific number. Wait for it — everything before is context, everything after is irrelevant.",
      },
      3: {
        0: "A count will be stated. Lock onto the number being given for the specific item mentioned in the question.",
        1: "Time expressed in nautical terms — 'bells' — is the target. Listen for when, not what.",
      },
      4: {
        0: "Two numbers are coming. The question asks about restriction locations — hold both when you hear them.",
        1: "A limit is being announced. The number after the limit word is the answer.",
      },
      5: {
        0: "A pier number. Wait for the location word 'Pier' and the number that follows it immediately.",
        1: "A requirement is being stated. The number of items required is what to listen for.",
      },
    },
    6: { // Isla ng Kwento — Narrative Comprehension
      1: {
        0: "Follow the character's actions and ask why. The reason behind what they do is the key to the story.",
        1: "Listen for what makes the character struggle at the start. The opening problem is the story's foundation.",
      },
      2: {
        0: "Listen for what the character learns. The lesson at the end is usually the story's moral.",
        1: "Track the order of events. When things happened matters as much as what happened.",
      },
      3: {
        0: "Listen for how the character solves the problem. The solution is the story's turning point.",
        1: "Listen for the decision the character makes alone. Independence in the decision is what the story is about.",
      },
      4: {
        0: "Character is shown through actions, not descriptions. Listen for what the character does to understand who they are.",
        1: "An object in a story carries meaning beyond itself. Ask: what does this object represent in context?",
      },
      5: {
        0: "The theme is the overall message — not the plot. Ask: what does this story say about how to face difficulty?",
        1: "Listen for how two characters treat each other. Their connection is what the story is built around.",
      },
    },
    7: { // Isla ng Alingawngaw — Full Integration
      1: {
        0: "All six skills are active. Start with main idea: what is the speaker's central argument beneath all the detail?",
        1: "Listen for a tone word — caution, concern, enthusiasm. The speaker's feeling will guide you to the right answer.",
      },
      2: {
        0: "A specific day is coming. Hold on for it — all six skills are competing for your attention, but one fact is the target.",
        1: "The instructor's feeling is implied, not stated. Listen to how they speak — the delivery is the evidence.",
      },
      3: {
        0: "An unfamiliar word will be used in a context that explains it. Listen for the surrounding sentence — it is the definition.",
        1: "The speaker builds to a main point. Wait for the conclusion — that final statement is the answer.",
      },
      4: {
        0: "The word 'resilience' is being defined through a character's actions. What they do reveals what the word means.",
        1: "Use every skill at once: vocabulary, speed, main idea, tone, specific fact, story sequence.",
      },
      5: {
        0: "Ingay throws everything at once. Stay calm. Pick one anchor — main idea — and let the rest organise around it.",
        1: "This is the final challenge. Bring everything you have learned. Trust your ears — you are ready.",
      },
    },
  };

  const CHALLENGE_REFLECTION: Record<number, Record<number, Record<number, string>>> = {
    1: { // Isla ng Salita
      1: {
        0: "The meaning was in the surrounding sentence. What did the speaker say just before and after the unfamiliar word?",
        1: "Think about what was being described. Were they talking about something plentiful or something hard to come by?",
      },
      2: {
        0: "What was the speaker asking the character to keep doing? The encouraged action is the meaning.",
        1: "How was the character feeling in that moment? The feeling described in the scene is the word's meaning.",
      },
      3: {
        0: "Was the character eager or holding back? The hesitation in the scene defines the word.",
        1: "How did the character approach the situation — casually or with real sincerity? That quality is the meaning.",
      },
      4: {
        0: "What stood out as strange or unusual in the passage? That reaction reveals the word's meaning.",
        1: "How did the character react when surprised? Confusion and disorientation are the clues.",
      },
      5: {
        0: "Did the character give up or keep pushing? That persistence is what the word means.",
        1: "What was being described as powerful or intense? That force is the word's meaning.",
      },
    },
    2: { // Isla ng Bilis
      1: {
        0: "Did you catch the time word? When speech is fast, schedule words are what to anchor on first.",
        1: "Time words move fast. Were you listening for the specific hours, or tracking too many other details?",
      },
      2: {
        0: "Did you catch the reason word? In fast speech, cause-and-effect signals are what to listen for.",
        1: "Proper nouns stand out even in fast speech. Did you hear the name or place mentioned?",
      },
      3: {
        0: "Change words like 'moved to' or 'reassigned' signal the key detail. Did you catch what came right after?",
        1: "Status updates are short. Did you catch the one word that described the current situation?",
      },
      4: {
        0: "The reason always follows the cause word. Did you stay focused after 'because' or 'due to'?",
        1: "In fast speech, numbers need to be anticipated, not chased. Did the figure slip by before you were ready?",
      },
      5: {
        0: "Postponement words are the anchor. Did you hear the new plan immediately after the delay was announced?",
        1: "The rest hours were a single number in a sea of fast words. Did you hold on long enough to hear it?",
      },
    },
    3: { // Isla ng Diwa
      1: {
        0: "Did you follow a specific example instead of the overall point? The main idea is what the examples are meant to support.",
        1: "Did you catch what the speaker ultimately argued, or did the details pull you toward a specific fact?",
      },
      2: {
        0: "What topic kept coming back? The repeated point is always the main idea.",
        1: "Did you catch the speaker's strongest statement? The main idea is usually the point they build toward.",
      },
      3: {
        0: "What was the lesson being given? Details exist to support it — not to replace it.",
        1: "What was the speaker treating as most urgent? Priority equals main idea.",
      },
      4: {
        0: "What changed, and why did it matter? The significance of the change is the main idea.",
        1: "Did you track the process instead of its purpose? The 'why it matters' is always the main idea.",
      },
      5: {
        0: "What did the speaker ultimately recommend? That overall advice is the main idea, not the examples used to support it.",
        1: "Did examples pull you away from the core argument? The speaker's central claim is always the main idea.",
      },
    },
    4: { // Isla ng Damdamin
      1: {
        0: "Words alone didn't carry the feeling — tone did. What in the speaker's delivery hinted at worry or uncertainty?",
        1: "Did you catch the moment when the tone shifted? The change in feeling is where the answer lives.",
      },
      2: {
        0: "What was the speaker elevating or celebrating? That sense of achievement is what pride sounds like.",
        1: "Quiet acceptance often shows in what the speaker does not say. Did you listen for the absence of resistance?",
      },
      3: {
        0: "Calm determination sounds certain, not emotional. Did you hear the steadiness in the speaker's tone?",
        1: "The warmth was in the word choice. Which words signalled care or encouragement?",
      },
      4: {
        0: "Did you catch both tones — the support and the standard being set? Both were present at the same time.",
        1: "Who was the gratitude directed toward? The scope of the thanks is the key detail.",
      },
      5: {
        0: "What words carried warmth in the letter? Tone lives in specific word choices, not just in the situation.",
        1: "Did you hear both feelings — the loss and the something-good? That combination is what makes a tone bittersweet.",
      },
    },
    5: { // Isla ng Tanong
      1: {
        0: "Did the surrounding context distract you from the number? One figure is all you needed.",
        1: "The exact number was stated clearly. Were you listening for it specifically, or tracking too broadly?",
      },
      2: {
        0: "Did the name register clearly? Proper nouns are distinct — they sound different from surrounding words.",
        1: "Were you waiting for the number, or were you still processing the surrounding information when it was stated?",
      },
      3: {
        0: "One number for one item. Did you match the right number to the right item?",
        1: "The time was given in a specific format. Did you recognise 'bells' as a time reference?",
      },
      4: {
        0: "Were you listening for two numbers or just one? Both gallery numbers were needed for the answer.",
        1: "Did you catch the limit? The number was paired with a restriction word — did you hold on to both?",
      },
      5: {
        0: "Location plus number. Did you catch both parts of the answer — which place and which number?",
        1: "The requirement was a specific count. Were you listening for how many, or still tracking who needed them?",
      },
    },
    6: { // Isla ng Kwento
      1: {
        0: "What drove the character's action? Motivation is found in why a character does something, not just what they do.",
        1: "What was the character's situation at the beginning? Every story's problem is set up early.",
      },
      2: {
        0: "What changed for the character? What someone learns from their mistake is the story's lesson.",
        1: "Did the sequence of events blur together? 'First, then, finally' signals are what to listen for.",
      },
      3: {
        0: "What was the solution? The moment the problem is resolved is always the story's centre.",
        1: "What did the character decide to do on their own? That decision itself is the story's point.",
      },
      4: {
        0: "What did the character do that revealed who they are? Actions are the truest character clues.",
        1: "What did the object mean in the story's context? Objects carry the meaning the storyteller places in them.",
      },
      5: {
        0: "What was the story saying about how to face difficulty? That message is the theme.",
        1: "What bound the two characters together? Their relationship is the story's emotional core.",
      },
    },
    7: { // Isla ng Alingawngaw
      1: {
        0: "All six skills are active here. Did you stay on main idea, or did fast speech or emotion pull you away?",
        1: "The tone carried the answer. Was it urgency, worry, or something else? Feelings are facts here.",
      },
      2: {
        0: "Did competing details crowd out the specific day? One fact at a time — the day was all you needed.",
        1: "The feeling wasn't named — it was shown. What in the delivery gave away the speaker's attitude?",
      },
      3: {
        0: "The word's meaning was given by the situation. What was being called 'admirable', and what did that tell you?",
        1: "What was the speaker's final point? The conclusion always holds the main idea.",
      },
      4: {
        0: "What did the character do that embodied 'resilience'? Actions are the definition.",
        1: "Which skill let you down — vocabulary, speed, main idea, tone, specific fact, or story order? Name it.",
      },
      5: {
        0: "When everything was chaos, what did you try to hold onto? Main idea is always the steadiest anchor.",
        1: "Whatever you missed — you know now which skill to sharpen. That knowledge is the real shard.",
      },
    },
  };

const ISLAND_CARD_LABEL: Record<number, string> = {
    1: "❄  ISLA NG SALITA",
    2: "⚡  ISLA NG BILIS",
    3: "🌫  ISLA NG DIWA",
    4: "🔥  ISLA NG DAMDAMIN",
    5: "🔍  ISLA NG TANONG",
    6: "📜  ISLA NG KWENTO",
    7: "🌪️  ISLA NG ALINGAWNGAW",
  };

  const storyCard =
    islandNum === 1 ? (PIN_STORY_I1[pinSortOrder] ?? null) :
    islandNum === 2 ? (PIN_STORY_I2[pinSortOrder] ?? null) :
    islandNum === 3 ? (PIN_STORY_I3[pinSortOrder] ?? null) :
    islandNum === 4 ? (PIN_STORY_I4[pinSortOrder] ?? null) :
    islandNum === 5 ? (PIN_STORY_I5[pinSortOrder] ?? null) :
    islandNum === 6 ? (PIN_STORY_I6[pinSortOrder] ?? null) :
    islandNum === 7 ? (PIN_STORY_I7[pinSortOrder] ?? null) :
    null;
  const storyCardLabel = ISLAND_CARD_LABEL[islandNum] ?? "";

  const dagatState: DagatState =
    phase === "intro" ? "idle" :
    phase === "listening" ? "listening" :
    phase === "answering" ? "idle" :
    isCorrect ? (isLastChallenge ? "celebrating" : "correct") : "wrong";

  function handleAnswer(choice: "A" | "B" | "C" | "D") {
    setSelected(choice);
    if (choice === current.answer) setCorrectCount((c) => c + 1);
    setPhase("result");
  }

  function handleNext() {
    if (isLastChallenge) {
      // With React 18 batching, correctCount is already committed by the time
      // the user presses Continue (4+ seconds after handleAnswer).
      const accuracy = Math.round((correctCount / challenges.length) * 100);
      setPinScore(accuracy);
      // Submit immediately so progress is saved even if user exits during cinematic
      submitMutation.mutate({ pinId, accuracy });
      // Shard cinematic only fires on the LAST pin of the island (sortOrder 5),
      // and only on first-ever completion — not on retries
      const isLastPin = pin?.sortOrder === 5;
      if (isLastPin && !wasAlreadyCompleted.current) {
        // Cinematic plays while submit happens in background
        setPhase("claimShard");
      } else {
        // Show loading until submit resolves, then onSuccess transitions to pinComplete
        setPhase("submitting");
      }
    } else {
      setChallengeIndex((i) => i + 1);
      setPhase("listening");
      setSelected(null);
      setShowHint(false);
    }
  }

  function handleClaimShard() {
    // Show certificate after completing the final quest (Island 7, Pin 5) for the first time
    const isFinalQuest = islandNum === 7 && pin?.sortOrder === 5;
    if (isFinalQuest && !wasAlreadyCompleted.current) {
      setPhase("certificate");
    } else {
      setPhase("pinComplete");
    }
  }


  return (
    <SafeAreaView className="flex-1 bg-ocean-deep" style={questBg} edges={["top"]}>
      {/* Per-island curse effect overlay */}
      <QuestSceneOverlay islandNumber={islandNum} />
      {phase !== "listening" && <MuteButton />}

      {/* Island 1 — green forest depth behind content */}
      {islandNum === 1 && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
          <View style={{ flex: 1, backgroundColor: "#071a0b" }} />
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: "35%",
            backgroundColor: "rgba(245,197,24,0.045)" }} />
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "30%",
            backgroundColor: "rgba(80,200,230,0.05)" }} />
        </View>
      )}
      {/* Island 2 — purple storm gradient depth */}
      {islandNum === 2 && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
          <View style={{ flex: 1, backgroundColor: "#0d0519" }} />
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: "35%",
            backgroundColor: "rgba(142,68,173,0.04)" }} />
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "30%",
            backgroundColor: "rgba(30,15,60,0.06)" }} />
        </View>
      )}
      {/* Island 3 — misty lagoon gradient depth */}
      {islandNum === 3 && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
          <View style={{ flex: 1, backgroundColor: "#06101e" }} />
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: "35%",
            backgroundColor: "rgba(52,152,219,0.04)" }} />
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "30%",
            backgroundColor: "rgba(26,74,107,0.06)" }} />
        </View>
      )}
      {/* Island 4 — volcanic ember gradient depth */}
      {islandNum === 4 && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
          <View style={{ flex: 1, backgroundColor: "#180505" }} />
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: "40%",
            backgroundColor: "rgba(231,76,60,0.04)" }} />
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "30%",
            backgroundColor: "rgba(100,20,10,0.06)" }} />
        </View>
      )}
      {/* Island 5 — harbour lighthouse gradient depth */}
      {islandNum === 5 && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
          <View style={{ flex: 1, backgroundColor: "#180c00" }} />
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: "40%",
            backgroundColor: "rgba(230,126,34,0.04)" }} />
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "30%",
            backgroundColor: "rgba(80,35,0,0.06)" }} />
        </View>
      )}
      {/* Island 6 — scroll library gradient depth */}
      {islandNum === 6 && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
          <View style={{ flex: 1, backgroundColor: "#021512" }} />
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: "35%",
            backgroundColor: "rgba(26,188,156,0.03)" }} />
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "30%",
            backgroundColor: "rgba(10,50,38,0.06)" }} />
        </View>
      )}
      {/* Island 7 — storm amphitheater gradient depth */}
      {islandNum === 7 && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
          <View style={{ flex: 1, backgroundColor: "#120f00" }} />
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: "35%",
            backgroundColor: "rgba(142,68,173,0.035)" }} />
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "30%",
            backgroundColor: "rgba(245,197,24,0.04)" }} />
        </View>
      )}

    <ScrollView
      contentContainerClassName="px-6 pt-4 pb-8"
      showsVerticalScrollIndicator={false}
      style={{ zIndex: 1 }}
    >
      <TouchableOpacity onPress={confirmExit} className="mb-4">
        <Text className="text-gold text-base">← Exit Quest</Text>
      </TouchableOpacity>

      {/* Challenge progress dots */}
      {challenges.length > 0 && (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {challenges.map((_, i) => (
              <View key={i} style={{
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: i < challengeIndex
                  ? "#f5c518"
                  : i === challengeIndex
                  ? "#f5c518"
                  : "rgba(255,255,255,0.15)",
                borderWidth: i === challengeIndex ? 2 : 0,
                borderColor: "rgba(255,255,255,0.6)",
              }} />
            ))}
          </View>
          <Text style={{ color: "#9ca3af", fontSize: 11 }}>
            {challengeIndex + 1} / {challenges.length}
          </Text>
        </View>
      )}

      {/* Island + Pin Banner */}
      {islandName ? (
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          {islandNum === 1 ? (
            <View style={{
              backgroundColor: "rgba(10,28,50,0.95)",
              borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5,
              borderWidth: 1, borderColor: "rgba(100,200,230,0.45)",
              flexDirection: "row", alignItems: "center", gap: 6,
            }}>
              <View style={{ width: 5, height: 5, backgroundColor: "rgba(180,230,255,0.70)", transform: [{ rotate: "45deg" }] }} />
              <Text style={{ color: "rgba(140,215,250,0.90)", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 }}>
                ❄ Island 1 · {islandName}
              </Text>
              <View style={{ width: 5, height: 5, backgroundColor: "rgba(180,230,255,0.70)", transform: [{ rotate: "45deg" }] }} />
            </View>
          ) : islandNum === 2 ? (
            <View style={{
              backgroundColor: "rgba(20,10,40,0.95)",
              borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5,
              borderWidth: 1, borderColor: "rgba(195,155,211,0.50)",
              flexDirection: "row", alignItems: "center", gap: 6,
            }}>
              <View style={{ width: 5, height: 5, backgroundColor: "rgba(220,190,255,0.70)", transform: [{ rotate: "45deg" }] }} />
              <Text style={{ color: "rgba(195,155,211,0.90)", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 }}>
                ⚡ Island 2 · {islandName}
              </Text>
              <View style={{ width: 5, height: 5, backgroundColor: "rgba(220,190,255,0.70)", transform: [{ rotate: "45deg" }] }} />
            </View>
          ) : islandNum === 3 ? (
            <View style={{
              backgroundColor: "rgba(8,14,28,0.95)",
              borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5,
              borderWidth: 1, borderColor: "rgba(52,152,219,0.45)",
              flexDirection: "row", alignItems: "center", gap: 6,
            }}>
              <View style={{ width: 5, height: 5, backgroundColor: "rgba(168,200,224,0.70)", borderRadius: 2.5 }} />
              <Text style={{ color: "rgba(100,180,240,0.90)", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 }}>
                {"🌫"} Island 3 · {islandName}
              </Text>
              <View style={{ width: 5, height: 5, backgroundColor: "rgba(168,200,224,0.70)", borderRadius: 2.5 }} />
            </View>
          ) : islandNum === 4 ? (
            <View style={{
              backgroundColor: "rgba(20,5,5,0.95)",
              borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5,
              borderWidth: 1, borderColor: "rgba(231,76,60,0.48)",
              flexDirection: "row", alignItems: "center", gap: 6,
            }}>
              <View style={{ width: 5, height: 5, backgroundColor: "rgba(231,120,100,0.72)", borderRadius: 2.5 }} />
              <Text style={{ color: "rgba(245,130,100,0.92)", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 }}>
                🔥 Island 4 · {islandName}
              </Text>
              <View style={{ width: 5, height: 5, backgroundColor: "rgba(231,120,100,0.72)", borderRadius: 2.5 }} />
            </View>
          ) : islandNum === 5 ? (
            <View style={{
              backgroundColor: "rgba(22,10,0,0.95)",
              borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5,
              borderWidth: 1, borderColor: "rgba(230,126,34,0.48)",
              flexDirection: "row", alignItems: "center", gap: 6,
            }}>
              <View style={{ width: 5, height: 5, backgroundColor: "rgba(245,165,80,0.72)", transform: [{ rotate: "45deg" }] }} />
              <Text style={{ color: "rgba(245,165,80,0.92)", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 }}>
                🔍 Island 5 · {islandName}
              </Text>
              <View style={{ width: 5, height: 5, backgroundColor: "rgba(245,165,80,0.72)", transform: [{ rotate: "45deg" }] }} />
            </View>
          ) : islandNum === 6 ? (
            <View style={{
              backgroundColor: "rgba(3,12,10,0.95)",
              borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5,
              borderWidth: 1, borderColor: "rgba(26,188,156,0.48)",
              flexDirection: "row", alignItems: "center", gap: 6,
            }}>
              <View style={{ width: 5, height: 5, backgroundColor: "rgba(26,188,156,0.72)", borderRadius: 2.5 }} />
              <Text style={{ color: "rgba(80,210,190,0.92)", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 }}>
                {"📜"} Island 6 · {islandName}
              </Text>
              <View style={{ width: 5, height: 5, backgroundColor: "rgba(26,188,156,0.72)", borderRadius: 2.5 }} />
            </View>
          ) : islandNum === 7 ? (
            <View style={{
              backgroundColor: "rgba(16,13,0,0.95)",
              borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5,
              borderWidth: 1, borderColor: "rgba(245,197,24,0.50)",
              flexDirection: "row", alignItems: "center", gap: 6,
            }}>
              <View style={{ width: 5, height: 5, backgroundColor: "rgba(245,197,24,0.75)", borderRadius: 2.5 }} />
              <Text style={{ color: "rgba(245,210,80,0.92)", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 }}>
                {"🌪️"} Island 7 · {islandName}
              </Text>
              <View style={{ width: 5, height: 5, backgroundColor: "rgba(245,197,24,0.75)", borderRadius: 2.5 }} />
            </View>
          ) : (
            <View style={{
              backgroundColor: accentColor + "22",
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderWidth: 1,
              borderColor: accentColor + "55",
            }}>
              <Text style={{ color: accentColor, fontSize: 11, fontWeight: "700" }}>
                Island {islandNum} · {islandName}
              </Text>
            </View>
          )}
          {pin?.number != null && (
            <View style={{
              backgroundColor: "rgba(255,255,255,0.07)",
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.15)",
            }}>
              <Text style={{ color: "#e5e7eb", fontSize: 11, fontWeight: "700" }}>
                Pin {pin.number}
              </Text>
            </View>
          )}
          {islandSkill ? (
            <Text style={{ color: "#6b7280", fontSize: 10 }}>{islandSkill}</Text>
          ) : null}
        </View>
      ) : null}

      {/* ========== INTRO ========== */}
      {phase === "intro" && (
        <View className="mt-4">
          {/* Per-pin story card */}
          {storyCard && islandNum === 1 && (
            <FrostBorderCard>
              <Text style={{ color: "rgba(148,210,240,0.6)", fontSize: 10, marginBottom: 6, letterSpacing: 1.2 }}>
                {storyCardLabel}
              </Text>
              <Text style={{ color: "#c8e6f0", fontSize: 13, lineHeight: 21, fontStyle: "italic" }}>
                {storyCard}
              </Text>
            </FrostBorderCard>
          )}
          {storyCard && islandNum === 2 && (
            <ElectricBorderCard>
              <Text style={{ color: "rgba(180,100,220,0.65)", fontSize: 10, marginBottom: 6, letterSpacing: 1.2 }}>
                {storyCardLabel}
              </Text>
              <Text style={{ color: "#d7b8f0", fontSize: 13, lineHeight: 21, fontStyle: "italic" }}>
                {storyCard}
              </Text>
            </ElectricBorderCard>
          )}
          {storyCard && islandNum === 3 && (
            <MistBorderCard>
              <Text style={{ color: "rgba(100,180,240,0.65)", fontSize: 10, marginBottom: 6, letterSpacing: 1.2 }}>
                {storyCardLabel}
              </Text>
              <Text style={{ color: "#b8d4ee", fontSize: 13, lineHeight: 21, fontStyle: "italic" }}>
                {storyCard}
              </Text>
            </MistBorderCard>
          )}
          {storyCard && islandNum === 4 && (
            <EmberBorderCard>
              <Text style={{ color: "rgba(220,80,60,0.65)", fontSize: 10, marginBottom: 6, letterSpacing: 1.2 }}>
                {storyCardLabel}
              </Text>
              <Text style={{ color: "#f0c4b8", fontSize: 13, lineHeight: 21, fontStyle: "italic" }}>
                {storyCard}
              </Text>
            </EmberBorderCard>
          )}
          {storyCard && islandNum === 5 && (
            <BeamBorderCard>
              <Text style={{ color: "rgba(230,126,34,0.65)", fontSize: 10, marginBottom: 6, letterSpacing: 1.2 }}>
                {storyCardLabel}
              </Text>
              <Text style={{ color: "#f5d5a8", fontSize: 13, lineHeight: 21, fontStyle: "italic" }}>
                {storyCard}
              </Text>
            </BeamBorderCard>
          )}
          {storyCard && islandNum === 6 && (
            <NarrativeBorderCard>
              <Text style={{ color: "rgba(26,188,156,0.65)", fontSize: 10, marginBottom: 6, letterSpacing: 1.2 }}>
                {storyCardLabel}
              </Text>
              <Text style={{ color: "#b2ead8", fontSize: 13, lineHeight: 21, fontStyle: "italic" }}>
                {storyCard}
              </Text>
            </NarrativeBorderCard>
          )}
          {storyCard && islandNum === 7 && (
            <EchoBorderCard>
              <Text style={{ color: "rgba(245,197,24,0.65)", fontSize: 10, marginBottom: 6, letterSpacing: 1.2 }}>
                {storyCardLabel}
              </Text>
              <Text style={{ color: "#f5e8b8", fontSize: 13, lineHeight: 21, fontStyle: "italic" }}>
                {storyCard}
              </Text>
            </EchoBorderCard>
          )}
          {storyCard && islandNum !== 1 && islandNum !== 2 && islandNum !== 3 && islandNum !== 4 && islandNum !== 5 && islandNum !== 6 && islandNum !== 7 && (
            <View style={{
              backgroundColor: "rgba(16,13,0,0.92)",
              borderRadius: 14, borderWidth: 1,
              borderColor: "rgba(245,197,24,0.40)",
              paddingHorizontal: 18, paddingVertical: 14, marginBottom: 20,
            }}>
              <Text style={{
                color: "rgba(245,197,24,0.65)",
                fontSize: 10, marginBottom: 6, letterSpacing: 1.2
              }}>
                {storyCardLabel}
              </Text>
              <Text style={{
                color: "#f5e8a0",
                fontSize: 13, lineHeight: 21, fontStyle: "italic"
              }}>
                {storyCard}
              </Text>
            </View>
          )}
          {/* Per-island listening strategy prompt */}
          <View style={{
            backgroundColor: "rgba(0,0,0,0.45)",
            borderRadius: 12, borderWidth: 1,
            borderColor: `${accentColor}55`,
            paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20,
          }}>
            <Text style={{ color: accentColor, fontSize: 10, fontWeight: "700", marginBottom: 4, letterSpacing: 1 }}>
              {islandNum === 1 ? "❄" : islandNum === 2 ? "⚡" : islandNum === 3 ? "🌫" : islandNum === 4 ? "🔥" : islandNum === 5 ? "🔍" : islandNum === 6 ? "📜" : "🌪️"} LISTENING STRATEGY
            </Text>
            <Text style={{ color: "#e5e7eb", fontSize: 13, lineHeight: 20 }}>
              {CHALLENGE_STRATEGY[islandNum]?.[pinSortOrder]?.[challengeIndex]?.trim()
                ? CHALLENGE_STRATEGY[islandNum][pinSortOrder][challengeIndex]
                : (ISLAND_STRATEGY[islandNum] ?? "Listen carefully and trust what you hear.")}
            </Text>
          </View>
          <View className="items-center">
          {characterMode ? (
            <>
              <CaptainSalita
                state="talking"
                dialogue={npcIntro}
                audioUrl={npcAudioIntro}
                size={160}
              />
              {islandNum <= 5 && (
                <TouchableOpacity
                  onPress={() => setSlowMode((v) => !v)}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 8,
                    marginTop: 16, marginBottom: 4,
                    paddingHorizontal: 14, paddingVertical: 8,
                    borderRadius: 10, borderWidth: 1,
                    borderColor: slowMode ? "#f5c518" : "rgba(255,255,255,0.2)",
                    backgroundColor: slowMode ? "rgba(245,197,24,0.12)" : "transparent",
                  }}
                >
                  <Text style={{ fontSize: 16 }}>🐢</Text>
                  <Text style={{ color: slowMode ? "#f5c518" : "#9ca3af", fontSize: 13, fontWeight: "600" }}>
                    Slow Mode (0.75×)
                  </Text>
                  <Text style={{ color: slowMode ? "#f5c518" : "#6b7280", fontSize: 11 }}>
                    {slowMode ? "ON — practice mode" : "OFF"}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setPhase("listening")}
                className="mt-4 bg-gold rounded-xl px-10 py-4 w-full items-center"
              >
                <Text className="text-ocean-deep font-bold text-lg">Start Listening</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View className="items-center">
              <Text className="text-6xl mb-4">👂</Text>
              <Text className="text-gold text-2xl font-bold text-center mb-4">Sailor, Ready?</Text>
              <Text className="text-parchment text-base text-center leading-7 mb-6">
                The audio plays once — no replays, no second chances.{"\n"}Trust your ears.
              </Text>
              {islandNum <= 5 && (
                <TouchableOpacity
                  onPress={() => setSlowMode((v) => !v)}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 8,
                    marginBottom: 12,
                    paddingHorizontal: 14, paddingVertical: 8,
                    borderRadius: 10, borderWidth: 1,
                    borderColor: slowMode ? "#f5c518" : "rgba(255,255,255,0.2)",
                    backgroundColor: slowMode ? "rgba(245,197,24,0.12)" : "transparent",
                  }}
                >
                  <Text style={{ fontSize: 16 }}>🐢</Text>
                  <Text style={{ color: slowMode ? "#f5c518" : "#9ca3af", fontSize: 13, fontWeight: "600" }}>
                    Slow Mode (0.75×)
                  </Text>
                  <Text style={{ color: slowMode ? "#f5c518" : "#6b7280", fontSize: 11 }}>
                    {slowMode ? "ON — practice mode" : "OFF"}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setPhase("listening")}
                className="bg-gold rounded-xl px-10 py-4 w-full items-center"
              >
                <Text className="text-ocean-deep font-bold text-lg">Start Listening</Text>
              </TouchableOpacity>
            </View>
          )}
          </View>
        </View>
      )}

      {/* ========== LISTENING ========== */}
      {phase === "listening" && (
        <View className="items-center">
          {characterMode && (
            <DagatCharacter state="listening" size={160} />
          )}
          <View style={{
            backgroundColor: "rgba(0,0,0,0.45)",
            borderRadius: 18, borderWidth: 1.5,
            borderColor: `${accentColor}55`,
            paddingHorizontal: 8, paddingVertical: 12,
            marginTop: 12, overflow: "hidden", width: "100%",
          }}>
            <AudioPlayer audioUrl={current.audioUrl} onEnd={handleAudioEnd} autoPlay rate={slowMode ? 0.75 : 1.0} allowSkip={(pin as any)?.isDevUser ?? false} />
          </View>
        </View>
      )}

      {/* ========== SUBMITTING ========== */}
      {phase === "submitting" && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#f5c518" size="large" />
          <Text className="text-parchment-dark text-xs mt-4 tracking-widest uppercase">
            Saving progress…
          </Text>
        </View>
      )}

      {/* ========== PIN COMPLETE ========== */}
      {phase === "pinComplete" && (
        <View className="mt-8 items-center px-2">
          {/* Island 1 thaw rings (100% pass) */}
          {islandNum === 1 && pinScore === 100 && (
            <View style={{ position: "relative", alignItems: "center", height: 0, width: "100%" }}>
              <ThawRing delay={0} />
              <ThawRing delay={400} />
              <ThawRing delay={800} />
            </View>
          )}
          {/* Island 2 lightning rings (100% pass) */}
          {islandNum === 2 && pinScore === 100 && (
            <View style={{ position: "relative", alignItems: "center", height: 0, width: "100%" }}>
              <LightningRing delay={0} />
              <LightningRing delay={350} />
              <LightningRing delay={700} />
            </View>
          )}
          {/* Island 3 fog rings (100% pass) */}
          {islandNum === 3 && pinScore === 100 && (
            <View style={{ position: "relative", alignItems: "center", height: 0, width: "100%" }}>
              <FogRing delay={0} />
              <FogRing delay={400} />
              <FogRing delay={800} />
            </View>
          )}
          {/* Island 4 ember rings (100% pass) */}
          {islandNum === 4 && pinScore === 100 && (
            <View style={{ position: "relative", alignItems: "center", height: 0, width: "100%" }}>
              <EmberRing delay={0} />
              <EmberRing delay={400} />
              <EmberRing delay={800} />
            </View>
          )}
          {/* Island 5 harbor rings (100% pass) */}
          {islandNum === 5 && pinScore === 100 && (
            <View style={{ position: "relative", alignItems: "center", height: 0, width: "100%" }}>
              <HarborRing delay={0} />
              <HarborRing delay={380} />
              <HarborRing delay={760} />
            </View>
          )}
          {/* Island 6 story rings (100% pass) */}
          {islandNum === 6 && pinScore === 100 && (
            <View style={{ position: "relative", alignItems: "center", height: 0, width: "100%" }}>
              <StoryRing delay={0} />
              <StoryRing delay={400} />
              <StoryRing delay={800} />
            </View>
          )}
          {/* Island 7 echo shock rings (100% pass) */}
          {islandNum === 7 && pinScore === 100 && (
            <View style={{ position: "relative", alignItems: "center", height: 0, width: "100%" }}>
              <EchoShockRing delay={0} />
              <EchoShockRing delay={350} />
              <EchoShockRing delay={700} />
            </View>
          )}
          {/* Score emoji — spring-in for Island 1-7, plain for others */}
          {(islandNum === 1 || islandNum === 2 || islandNum === 3 || islandNum === 4 || islandNum === 5 || islandNum === 6 || islandNum === 7) ? (
            <Animated.Text style={[{ fontSize: 48, marginBottom: 16 }, scoreStyle]}>
              {pinScore === 100 ? "⭐" : "❌"}
            </Animated.Text>
          ) : (
            <Text className="text-5xl mb-4">{pinScore === 100 ? "⭐" : "❌"}</Text>
          )}
          <Text className="text-gold text-2xl font-bold text-center mb-3">
            {pinScore === 100 ? "Quest Complete!" : "Quest Incomplete"}
          </Text>
          <View style={{
            paddingHorizontal: 24, paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: pinScore === 100 ? "rgba(21,87,36,0.5)" : "rgba(127,29,29,0.5)",
            borderWidth: 1,
            borderColor: pinScore === 100 ? "#4ade80" : "#ef4444",
            marginBottom: 20,
          }}>
            <Text style={{ color: pinScore === 100 ? "#4ade80" : "#f87171", fontSize: 20, fontWeight: "800", textAlign: "center" }}>
              {pinScore === 100 ? "PASSED" : `Score: ${pinScore}%`}
            </Text>
          </View>
          <Text className="text-parchment/60 text-xs text-center mb-6 leading-5">
            {pinScore === 100
              ? "Perfect score! Your best record is saved."
              : "You need 100% to pass this quest, but your score still counts toward your island average."}
          </Text>

          {/* Submission error + manual retry */}
          {submitError && (
            <View className="w-full bg-yellow-900/40 border border-yellow-600 rounded-xl p-4 mb-4">
              <Text className="text-yellow-300 text-sm text-center mb-3">
                Your score couldn't be saved yet. Tap below to try again.
              </Text>
              <TouchableOpacity
                onPress={() => submitMutation.mutate({ pinId, accuracy: pinScore })}
                disabled={submitMutation.isPending}
                className="bg-yellow-700 rounded-lg py-2 items-center"
              >
                <Text className="text-white font-bold text-sm">
                  {submitMutation.isPending ? "Saving..." : "Save Score"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Try Again */}
          <TouchableOpacity
            onPress={() => {
              setIsResultMode(false);
              setPhase("intro");
              setChallengeIndex(0);
              setSelected(null);
              setCorrectCount(0);
              setPinScore(0);
              setShowHint(false);
              setSubmitError(null);
              if (pin?.challenges?.length) {
                setShuffledChallenges(
                  shuffle(pin.challenges).map(shuffleChallenge)
                );
              }
            }}
            style={{
              borderRadius: 12, paddingVertical: 14, width: "100%",
              alignItems: "center", marginBottom: 10,
              backgroundColor: "transparent",
              borderWidth: 1.5, borderColor: "rgba(245,197,24,0.5)",
            }}
          >
            <Text style={{ color: "#f5c518", fontWeight: "700", fontSize: 16 }}>↺ Try Again</Text>
          </TouchableOpacity>

          {/* Next Quest — shown whenever there is a next pin (pass or fail) */}
          {nextPinId && (
            <TouchableOpacity
              onPress={() => router.replace(`/(main)/quest/${nextPinId}`)}
              disabled={submitMutation.isPending}
              className={`rounded-xl px-10 py-4 w-full items-center mb-3 ${
                submitMutation.isPending ? "bg-gold/40" : "bg-gold"
              }`}
            >
              {submitMutation.isPending ? (
                <ActivityIndicator color="#1a3550" size="small" />
              ) : (
                <Text className="text-ocean-deep font-bold text-lg">Next Quest →</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Return to Island — disabled while saving */}
          <TouchableOpacity
            onPress={() => router.replace(`/(main)/island/${pin.islandId}`)}
            disabled={submitMutation.isPending}
            className={`rounded-xl px-10 py-4 w-full items-center ${
              submitMutation.isPending ? "opacity-40 bg-ocean-light" : "border border-gold"
            }`}
          >
            {submitMutation.isPending ? (
              <ActivityIndicator color="#1a3550" size="small" />
            ) : (
              <Text className="text-parchment font-semibold text-lg">Return to Island</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ========== ANSWERING / RESULT ========== */}
      {(phase === "answering" || phase === "result") && (
        <View>
          {/* Dagat reaction (character mode) */}
          {characterMode && (
            <View className="items-center mb-4">
              <DagatCharacter state={dagatState} size={140} />
            </View>
          )}
          {phase === "answering" && <QuestBonusTimer seconds={bonusTime} />}

          {islandNum === 1 ? (
            <View style={{
              backgroundColor: "rgba(8,24,45,0.78)",
              borderRadius: 14, borderWidth: 1,
              borderColor: "rgba(80,160,210,0.35)",
              padding: 16, marginBottom: 20,
            }}>
              <Text style={{ color: "#e0f4ff", fontSize: 15, fontWeight: "600", lineHeight: 26 }}>
                {current.question}
              </Text>
            </View>
          ) : islandNum === 2 ? (
            <View style={{
              backgroundColor: "rgba(16,10,35,0.78)",
              borderRadius: 14, borderWidth: 1,
              borderColor: "rgba(142,68,173,0.40)",
              padding: 16, marginBottom: 20,
            }}>
              <Text style={{ color: "#e8d8f5", fontSize: 15, fontWeight: "600", lineHeight: 26 }}>
                {current.question}
              </Text>
            </View>
          ) : islandNum === 3 ? (
            <View style={{
              backgroundColor: "rgba(8,14,28,0.78)",
              borderRadius: 14, borderWidth: 1,
              borderColor: "rgba(52,152,219,0.35)",
              padding: 16, marginBottom: 20,
            }}>
              <Text style={{ color: "#d0e8f5", fontSize: 15, fontWeight: "600", lineHeight: 26 }}>
                {current.question}
              </Text>
            </View>
          ) : islandNum === 4 ? (
            <View style={{
              backgroundColor: "rgba(20,6,6,0.78)",
              borderRadius: 14, borderWidth: 1,
              borderColor: "rgba(231,76,60,0.38)",
              padding: 16, marginBottom: 20,
            }}>
              <Text style={{ color: "#f5d5c8", fontSize: 15, fontWeight: "600", lineHeight: 26 }}>
                {current.question}
              </Text>
            </View>
          ) : islandNum === 5 ? (
            <View style={{
              backgroundColor: "rgba(22,10,0,0.78)",
              borderRadius: 14, borderWidth: 1,
              borderColor: "rgba(230,126,34,0.38)",
              padding: 16, marginBottom: 20,
            }}>
              <Text style={{ color: "#f5ddb8", fontSize: 15, fontWeight: "600", lineHeight: 26 }}>
                {current.question}
              </Text>
            </View>
          ) : islandNum === 6 ? (
            <View style={{
              backgroundColor: "rgba(3,12,10,0.78)",
              borderRadius: 14, borderWidth: 1,
              borderColor: "rgba(26,188,156,0.35)",
              padding: 16, marginBottom: 20,
            }}>
              <Text style={{ color: "#b2ead8", fontSize: 15, fontWeight: "600", lineHeight: 26 }}>
                {current.question}
              </Text>
            </View>
          ) : islandNum === 7 ? (
            <View style={{
              backgroundColor: "rgba(16,13,0,0.78)",
              borderRadius: 14, borderWidth: 1,
              borderColor: "rgba(245,197,24,0.38)",
              padding: 16, marginBottom: 20,
            }}>
              <Text style={{ color: "#f5e8b8", fontSize: 15, fontWeight: "600", lineHeight: 26 }}>
                {current.question}
              </Text>
            </View>
          ) : (
            <Text className="text-parchment text-base font-semibold mb-5 leading-7">
              {current.question}
            </Text>
          )}

          <View className="space-y-3">
            {current.choices.map((choice) => {
              const isSelected = selected === choice.label;
              const choiceIsCorrect = choice.label === current.answer;
              // Island 1 — themed buttons with ice styling
              if (islandNum === 1) {
                let btnBg = "rgba(13,42,64,0.85)";
                let btnBorder = "rgba(58,122,154,0.5)";
                let crystalColor = "rgba(180,230,255,0.20)";
                if (phase === "result") {
                  if (choiceIsCorrect) { btnBg = "rgba(14,60,30,0.85)"; btnBorder = "rgba(100,200,80,0.7)"; crystalColor = "rgba(100,200,80,0.3)"; }
                  else if (isSelected) { btnBg = "rgba(60,14,14,0.85)"; btnBorder = "rgba(200,80,80,0.7)"; crystalColor = "rgba(200,80,80,0.2)"; }
                } else if (isSelected) {
                  btnBorder = "#f5c518"; crystalColor = "rgba(245,197,24,0.4)";
                }
                return (
                  <TouchableOpacity
                    key={choice.label}
                    disabled={phase === "result"}
                    onPress={() => handleAnswer(choice.label as "A" | "B" | "C" | "D")}
                    style={{ borderRadius: 12, padding: 16, borderWidth: 1, backgroundColor: btnBg, borderColor: btnBorder, position: "relative" }}
                  >
                    {/* Ice crystal diamond accent top-right */}
                    <View style={{
                      position: "absolute", top: 8, right: 8,
                      width: 8, height: 8,
                      backgroundColor: crystalColor,
                      transform: [{ rotate: "45deg" }],
                    }} />
                    <Text style={{ color: "#f4e4c1" }}>
                      <Text style={{ fontWeight: "700" }}>{choice.label}. </Text>
                      {choice.text}
                    </Text>
                  </TouchableOpacity>
                );
              }
              // Island 2 — themed buttons with electric styling
              if (islandNum === 2) {
                let btnBg = "rgba(20,12,45,0.85)";
                let btnBorder = "rgba(120,60,160,0.50)";
                let sparkColor = "rgba(195,155,211,0.25)";
                if (phase === "result") {
                  if (choiceIsCorrect) { btnBg = "rgba(14,60,30,0.85)"; btnBorder = "rgba(100,200,80,0.7)"; sparkColor = "rgba(100,200,80,0.3)"; }
                  else if (isSelected) { btnBg = "rgba(60,14,14,0.85)"; btnBorder = "rgba(200,80,80,0.7)"; sparkColor = "rgba(200,80,80,0.2)"; }
                } else if (isSelected) {
                  btnBorder = "#f5c518"; sparkColor = "rgba(245,197,24,0.4)";
                }
                return (
                  <TouchableOpacity
                    key={choice.label}
                    disabled={phase === "result"}
                    onPress={() => handleAnswer(choice.label as "A" | "B" | "C" | "D")}
                    style={{ borderRadius: 12, padding: 16, borderWidth: 1, backgroundColor: btnBg, borderColor: btnBorder, position: "relative" }}
                  >
                    {/* Speed diamond accent top-right */}
                    <View style={{
                      position: "absolute", top: 8, right: 8,
                      width: 8, height: 8,
                      backgroundColor: sparkColor,
                      transform: [{ rotate: "45deg" }],
                    }} />
                    {/* Spark dot bottom-left */}
                    <View style={{
                      position: "absolute", bottom: 8, left: 8,
                      width: 3, height: 3, borderRadius: 1.5,
                      backgroundColor: sparkColor,
                    }} />
                    <Text style={{ color: "#f4e4c1" }}>
                      <Text style={{ fontWeight: "700" }}>{choice.label}. </Text>
                      {choice.text}
                    </Text>
                  </TouchableOpacity>
                );
              }
              // Island 3 — themed buttons with fog/mist styling
              if (islandNum === 3) {
                let btnBg = "rgba(8,18,38,0.85)";
                let btnBorder = "rgba(42,120,180,0.50)";
                let orbColor = "rgba(168,200,224,0.25)";
                if (phase === "result") {
                  if (choiceIsCorrect) { btnBg = "rgba(14,60,30,0.85)"; btnBorder = "rgba(100,200,80,0.7)"; orbColor = "rgba(100,200,80,0.3)"; }
                  else if (isSelected) { btnBg = "rgba(60,14,14,0.85)"; btnBorder = "rgba(200,80,80,0.7)"; orbColor = "rgba(200,80,80,0.2)"; }
                } else if (isSelected) {
                  btnBorder = "#f5c518"; orbColor = "rgba(245,197,24,0.4)";
                }
                return (
                  <TouchableOpacity
                    key={choice.label}
                    disabled={phase === "result"}
                    onPress={() => handleAnswer(choice.label as "A" | "B" | "C" | "D")}
                    style={{ borderRadius: 12, padding: 16, borderWidth: 1, backgroundColor: btnBg, borderColor: btnBorder, position: "relative" }}
                  >
                    {/* Fog orb accent top-right (round) */}
                    <View style={{
                      position: "absolute", top: 8, right: 8,
                      width: 8, height: 8, borderRadius: 4,
                      backgroundColor: orbColor,
                    }} />
                    <Text style={{ color: "#f4e4c1" }}>
                      <Text style={{ fontWeight: "700" }}>{choice.label}. </Text>
                      {choice.text}
                    </Text>
                  </TouchableOpacity>
                );
              }
              // Island 4 — themed buttons with ember/fire styling
              if (islandNum === 4) {
                let btnBg = "rgba(28,6,6,0.85)";
                let btnBorder = "rgba(180,40,20,0.52)";
                let orbColor = "rgba(231,120,100,0.28)";
                if (phase === "result") {
                  if (choiceIsCorrect) { btnBg = "rgba(14,60,30,0.85)"; btnBorder = "rgba(100,200,80,0.7)"; orbColor = "rgba(100,200,80,0.3)"; }
                  else if (isSelected) { btnBg = "rgba(60,14,14,0.85)"; btnBorder = "rgba(200,80,80,0.7)"; orbColor = "rgba(200,80,80,0.2)"; }
                } else if (isSelected) {
                  btnBorder = "#f5c518"; orbColor = "rgba(245,197,24,0.4)";
                }
                return (
                  <TouchableOpacity
                    key={choice.label}
                    disabled={phase === "result"}
                    onPress={() => handleAnswer(choice.label as "A" | "B" | "C" | "D")}
                    style={{ borderRadius: 12, padding: 16, borderWidth: 1, backgroundColor: btnBg, borderColor: btnBorder, position: "relative" }}
                  >
                    {/* Ember orb accent top-right (round) */}
                    <View style={{
                      position: "absolute", top: 8, right: 8,
                      width: 8, height: 8, borderRadius: 4,
                      backgroundColor: orbColor,
                    }} />
                    <Text style={{ color: "#f4e4c1" }}>
                      <Text style={{ fontWeight: "700" }}>{choice.label}. </Text>
                      {choice.text}
                    </Text>
                  </TouchableOpacity>
                );
              }
              // Island 5 — themed buttons with harbour/precision styling
              if (islandNum === 5) {
                let btnBg = "rgba(28,12,0,0.85)";
                let btnBorder = "rgba(180,80,10,0.52)";
                let diamondColor = "rgba(245,165,80,0.28)";
                if (phase === "result") {
                  if (choiceIsCorrect) { btnBg = "rgba(14,60,30,0.85)"; btnBorder = "rgba(100,200,80,0.7)"; diamondColor = "rgba(100,200,80,0.3)"; }
                  else if (isSelected) { btnBg = "rgba(60,14,14,0.85)"; btnBorder = "rgba(200,80,80,0.7)"; diamondColor = "rgba(200,80,80,0.2)"; }
                } else if (isSelected) {
                  btnBorder = "#f5c518"; diamondColor = "rgba(245,197,24,0.4)";
                }
                return (
                  <TouchableOpacity
                    key={choice.label}
                    disabled={phase === "result"}
                    onPress={() => handleAnswer(choice.label as "A" | "B" | "C" | "D")}
                    style={{ borderRadius: 12, padding: 16, borderWidth: 1, backgroundColor: btnBg, borderColor: btnBorder, position: "relative" }}
                  >
                    {/* Precision diamond accent top-right (rotated square) */}
                    <View style={{
                      position: "absolute", top: 8, right: 8,
                      width: 8, height: 8,
                      backgroundColor: diamondColor,
                      transform: [{ rotate: "45deg" }],
                    }} />
                    <Text style={{ color: "#f4e4c1" }}>
                      <Text style={{ fontWeight: "700" }}>{choice.label}. </Text>
                      {choice.text}
                    </Text>
                  </TouchableOpacity>
                );
              }
              // Island 6 — themed buttons with scroll fragment styling
              if (islandNum === 6) {
                let btnBg = "rgba(5,20,16,0.85)";
                let btnBorder = "rgba(10,130,100,0.52)";
                let fragmentColor = "rgba(26,188,156,0.28)";
                if (phase === "result") {
                  if (choiceIsCorrect) { btnBg = "rgba(14,60,30,0.85)"; btnBorder = "rgba(100,200,80,0.7)"; fragmentColor = "rgba(100,200,80,0.3)"; }
                  else if (isSelected) { btnBg = "rgba(60,14,14,0.85)"; btnBorder = "rgba(200,80,80,0.7)"; fragmentColor = "rgba(200,80,80,0.2)"; }
                } else if (isSelected) {
                  btnBorder = "#1abc9c"; fragmentColor = "rgba(26,188,156,0.5)";
                }
                return (
                  <TouchableOpacity
                    key={choice.label}
                    disabled={phase === "result"}
                    onPress={() => handleAnswer(choice.label as "A" | "B" | "C" | "D")}
                    style={{ borderRadius: 12, padding: 16, borderWidth: 1, backgroundColor: btnBg, borderColor: btnBorder, position: "relative" }}
                  >
                    {/* Scroll fragment accent top-right (small parchment rect) */}
                    <View style={{
                      position: "absolute", top: 8, right: 8,
                      width: 10, height: 6, borderRadius: 1,
                      backgroundColor: fragmentColor,
                    }} />
                    <Text style={{ color: "#f4e4c1" }}>
                      <Text style={{ fontWeight: "700" }}>{choice.label}. </Text>
                      {choice.text}
                    </Text>
                  </TouchableOpacity>
                );
              }
              // Island 7 — themed buttons with storm/echo styling
              if (islandNum === 7) {
                let btnBg = "rgba(16,13,0,0.85)";
                let btnBorder = "rgba(180,140,20,0.52)";
                let ringColor = "rgba(245,197,24,0.28)";
                if (phase === "result") {
                  if (choiceIsCorrect) { btnBg = "rgba(14,60,30,0.85)"; btnBorder = "rgba(100,200,80,0.7)"; ringColor = "rgba(100,200,80,0.3)"; }
                  else if (isSelected) { btnBg = "rgba(60,14,14,0.85)"; btnBorder = "rgba(200,80,80,0.7)"; ringColor = "rgba(200,80,80,0.2)"; }
                } else if (isSelected) {
                  btnBorder = "#f5c518"; ringColor = "rgba(245,197,24,0.4)";
                }
                return (
                  <TouchableOpacity
                    key={choice.label}
                    disabled={phase === "result"}
                    onPress={() => handleAnswer(choice.label as "A" | "B" | "C" | "D")}
                    style={{ borderRadius: 12, padding: 16, borderWidth: 1, backgroundColor: btnBg, borderColor: btnBorder, position: "relative" }}
                  >
                    {/* Echo ring accent top-right (hollow circle) */}
                    <View style={{
                      position: "absolute", top: 8, right: 8,
                      width: 8, height: 8, borderRadius: 4,
                      borderWidth: 1.5, borderColor: ringColor,
                      backgroundColor: "transparent",
                    }} />
                    <Text style={{ color: "#f4e4c1" }}>
                      <Text style={{ fontWeight: "700" }}>{choice.label}. </Text>
                      {choice.text}
                    </Text>
                  </TouchableOpacity>
                );
              }
              // Default styling for other islands
              let bg = "bg-ocean-mid border-ocean-light";
              if (phase === "result") {
                if (choiceIsCorrect) bg = "bg-green-900 border-green-500";
                else if (isSelected) bg = "bg-red-900 border-red-500";
              } else if (isSelected) {
                bg = "bg-ocean-light border-gold";
              }
              return (
                <TouchableOpacity
                  key={choice.label}
                  disabled={phase === "result"}
                  onPress={() => handleAnswer(choice.label as "A" | "B" | "C" | "D")}
                  className={`rounded-xl p-4 border ${bg}`}
                >
                  <Text className="text-parchment">
                    <Text className="font-bold">{choice.label}. </Text>
                    {choice.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Hint — auto-appears after 30s of no answer */}
          {showHint && (
            <View className="mt-4 bg-gold/10 rounded-xl p-4 border border-gold/30">
              <Text className="text-gold text-sm">💡 {current.hint}</Text>
            </View>
          )}

          {/* Result feedback */}
          {phase === "result" && (
            <View className="mt-5">
              {/* Captain Salita reacts (character mode) */}
              {characterMode && (
                <View className="items-center mb-4">
                  <CaptainSalita
                    state="talking"
                    dialogue={isCorrect ? current.explanation : npcFail}
                    audioUrl={isCorrect ? (current.explanationAudioUrl ?? undefined) : npcAudioFail}
                    size={130}
                  />
                </View>
              )}

              {/* Island 1 frost burst (correct answer) */}
              {islandNum === 1 && isCorrect && showFrostBurst && (
                <View style={{ position: "relative", alignItems: "center", height: 0 }}>
                  <FrostBurst />
                </View>
              )}
              {/* Island 2 speed burst (correct answer) */}
              {islandNum === 2 && isCorrect && showSpeedBurst && (
                <View style={{ position: "relative", alignItems: "center", height: 0 }}>
                  <SpeedBurst />
                </View>
              )}
              {/* Island 3 clarity burst (correct answer) */}
              {islandNum === 3 && isCorrect && showClarityBurst && (
                <View style={{ position: "relative", alignItems: "center", height: 0 }}>
                  <ClarityBurst />
                </View>
              )}
              {/* Island 4 passion burst (correct answer) */}
              {islandNum === 4 && isCorrect && showPassionBurst && (
                <View style={{ position: "relative", alignItems: "center", height: 0 }}>
                  <PassionBurst />
                </View>
              )}
              {/* Island 5 precision burst (correct answer) */}
              {islandNum === 5 && isCorrect && showPrecisionBurst && (
                <View style={{ position: "relative", alignItems: "center", height: 0 }}>
                  <PrecisionBurst />
                </View>
              )}
              {/* Island 6 narrative burst (correct answer) */}
              {islandNum === 6 && isCorrect && showNarrativeBurst && (
                <View style={{ position: "relative", alignItems: "center", height: 0 }}>
                  <NarrativeBurst />
                </View>
              )}
              {/* Island 7 echo burst (correct answer) */}
              {islandNum === 7 && isCorrect && showEchoBurst && (
                <View style={{ position: "relative", alignItems: "center", height: 0 }}>
                  <EchoBurst />
                </View>
              )}

              <Animated.View
                style={[
                  {
                    borderRadius: 12, padding: 16, marginBottom: 16,
                    backgroundColor: islandNum === 1
                      ? (isCorrect ? "rgba(26,107,90,0.4)" : "rgba(40,20,40,0.5)")
                      : islandNum === 2
                      ? (isCorrect ? "rgba(26,60,107,0.4)" : "rgba(40,15,50,0.5)")
                      : islandNum === 3
                      ? (isCorrect ? "rgba(26,74,107,0.4)" : "rgba(20,30,50,0.5)")
                      : islandNum === 4
                      ? (isCorrect ? "rgba(100,20,10,0.4)" : "rgba(30,8,8,0.5)")
                      : islandNum === 5
                      ? (isCorrect ? "rgba(80,40,0,0.4)" : "rgba(30,12,0,0.5)")
                      : islandNum === 6
                      ? (isCorrect ? "rgba(10,50,38,0.4)" : "rgba(5,25,20,0.5)")
                      : islandNum === 7
                      ? (isCorrect ? "rgba(60,45,0,0.4)" : "rgba(30,20,0,0.5)")
                      : (isCorrect ? "rgba(20,83,45,0.5)" : "rgba(127,29,29,0.5)"),
                    borderWidth: 1,
                    borderColor: islandNum === 1
                      ? (isCorrect ? "rgba(100,200,230,0.5)" : "rgba(100,60,120,0.4)")
                      : islandNum === 2
                      ? (isCorrect ? "rgba(142,68,173,0.5)" : "rgba(120,40,80,0.4)")
                      : islandNum === 3
                      ? (isCorrect ? "rgba(52,152,219,0.50)" : "rgba(80,100,140,0.40)")
                      : islandNum === 4
                      ? (isCorrect ? "rgba(231,76,60,0.52)" : "rgba(120,30,20,0.42)")
                      : islandNum === 5
                      ? (isCorrect ? "rgba(230,126,34,0.52)" : "rgba(140,60,10,0.42)")
                      : islandNum === 6
                      ? (isCorrect ? "rgba(26,188,156,0.52)" : "rgba(15,100,80,0.42)")
                      : islandNum === 7
                      ? (isCorrect ? "rgba(245,197,24,0.52)" : "rgba(140,100,10,0.42)")
                      : (isCorrect ? "rgba(74,222,128,0.5)" : "rgba(239,68,68,0.5)"),
                  },
                  (islandNum === 1 || islandNum === 2 || islandNum === 3 || islandNum === 4 || islandNum === 5 || islandNum === 6 || islandNum === 7) && !isCorrect ? shakeStyle : {},
                ]}
              >
                <Text style={{ color: "white", fontWeight: "700", marginBottom: 4 }}>
                  {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
                </Text>
                <Text style={{ color: "#f4e4c1", fontSize: 14, lineHeight: 22 }}>
                  {current.explanation}
                </Text>
              </Animated.View>

              {!isCorrect && CHALLENGE_REFLECTION[islandNum]?.[pinSortOrder]?.[challengeIndex]?.trim() && (
                <View style={{
                  backgroundColor: "rgba(127,29,29,0.35)",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "rgba(239,68,68,0.35)",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  marginBottom: 16,
                }}>
                  <Text style={{ color: "#fca5a5", fontSize: 10, fontWeight: "700", marginBottom: 4, letterSpacing: 1 }}>
                    REFLECT
                  </Text>
                  <Text style={{ color: "#fecaca", fontSize: 13, lineHeight: 20 }}>
                    {CHALLENGE_REFLECTION[islandNum][pinSortOrder][challengeIndex]}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handleNext}
                disabled={countdown > 0}
                className={`rounded-xl py-4 items-center ${countdown > 0 ? "bg-gold/40" : "bg-gold"}`}
              >
                <Text className="text-ocean-deep font-bold text-base">
                  {countdown > 0
                    ? `Read carefully... ${countdown}s`
                    : isLastChallenge ? "Continue →" : "Next Challenge →"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </ScrollView>

    {/* Cinematic shard claim overlay — full-screen, above everything */}
    {phase === "claimShard" && (
      <ShardClaimCinematic
        islandNum={islandNum}
        accentColor={accentColor}
        characterMode={characterMode}
        npcSuccess={pin.island?.npcDialogueSuccess ?? "The shard is yours, sailor. The sea remembers."}
        npcAudioSuccess={npcAudioSuccess}
        onClaim={handleClaimShard}
      />
    )}

    {/* Certificate of completion — shown after final quest (Island 7, Pin 5) */}
    {phase === "certificate" && (
      <CertificateModal
        username={user?.username ?? "Sailor"}
        onClose={() => setPhase("pinComplete")}
      />
    )}
    </SafeAreaView>
  );
}
