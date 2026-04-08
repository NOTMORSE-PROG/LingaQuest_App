import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Svg, { Path, Circle, Rect, Ellipse, Polygon, G, Text as SvgText, Defs, LinearGradient, RadialGradient, Stop, Line } from "react-native-svg";
import Animated, {
  useSharedValue, useAnimatedStyle, cancelAnimation,
  withRepeat, withSequence, withTiming, Easing,
} from "react-native-reanimated";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { IngayWarning } from "@/components/characters/IngayWarning";
import { CaptainSalita } from "@/components/characters/CaptainSalita";
import { BackgroundMusic } from "@/components/audio/BackgroundMusic";
import { MuteButton } from "@/components/audio/MuteButton";

const PIN_R = 32;

// Zigzag pin positions (fractions of canvas dimensions)
const PIN_FRACS = [
  { xf: 0.58, yf: 0.10 }, // Pin 1
  { xf: 0.26, yf: 0.27 }, // Pin 2
  { xf: 0.55, yf: 0.44 }, // Pin 3 — CHECKPOINT
  { xf: 0.24, yf: 0.62 }, // Pin 4
  { xf: 0.60, yf: 0.79 }, // Pin 5
];

// Accent color per island (index = island.number - 1)
const ISLAND_COLORS = [
  "#27ae60", // 1 — Vocab, green
  "#8e44ad", // 2 — Speed, purple
  "#3498db", // 3 — Main Idea, blue
  "#e74c3c", // 4 — Emotion, red
  "#e67e22", // 5 — Specific, orange
  "#1abc9c", // 6 — Narrative, teal
  "#f5c518", // 7 — Final, gold
];

const ISLAND_PIN_BG = [
  "#061a0d", // 1 — dark green
  "#0f0619", // 2 — dark purple
  "#05101d", // 3 — dark blue
  "#1a0505", // 4 — dark red
  "#1a0e03", // 5 — dark orange
  "#031410", // 6 — dark teal
  "#141002", // 7 — dark gold
];

function buildRopePath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(0)} ${pts[0].y.toFixed(0)}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1];
    const n = pts[i];
    const mid = ((p.y + n.y) / 2).toFixed(0);
    d += ` C ${p.x.toFixed(0)} ${mid}, ${n.x.toFixed(0)} ${mid}, ${n.x.toFixed(0)} ${n.y.toFixed(0)}`;
  }
  return d;
}

// ─── Island 1: Frozen Tropical Background ────────────────────────────────────
// Design: A tropical paradise (palm trees, sand, lagoon) visibly frozen under
// Ingay's curse. Warm colours bleed through icy overlays telling the story.

function IceFloe({ x, y, w, h, delay }: { x: number; y: number; w: number; h: number; delay: number }) {
  const tx = useSharedValue(0);
  useEffect(() => {
    tx.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 4000 + delay * 800, easing: Easing.inOut(Easing.quad) }),
        withTiming(12, { duration: 4000 + delay * 800, easing: Easing.inOut(Easing.quad) })
      ),
      -1, true
    );
    return () => { cancelAnimation(tx); };
  }, [delay, tx]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  return (
    <Animated.View
      style={[{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: h / 2, backgroundColor: "rgba(180,230,255,0.20)" }, style]}
      pointerEvents="none"
    />
  );
}

// Aurora band — the magical curse energy drifting across the sky
function AuroraWave({ width, height, yFrac, color, delay }: { width: number; height: number; yFrac: number; color: string; delay: number }) {
  const phase = useSharedValue(0);
  useEffect(() => {
    phase.value = withRepeat(
      withTiming(1, { duration: 8000 + delay * 2000, easing: Easing.inOut(Easing.quad) }),
      -1, true
    );
    return () => { cancelAnimation(phase); };
  }, [delay, phase]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.04 + phase.value * 0.04,
    transform: [{ translateY: phase.value * 12 - 6 }],
  }));
  return (
    <Animated.View
      style={[{
        position: "absolute",
        left: 0, top: height * yFrac,
        width, height: 28,
        borderRadius: 14,
        backgroundColor: color,
      }, style]}
      pointerEvents="none"
    />
  );
}

// Frost particle — tiny dot rising through the frozen air
function FrostParticle({ x, delay, canvasHeight }: { x: number; delay: number; canvasHeight: number }) {
  const ty = useSharedValue(0);
  const opacity = useSharedValue(0);
  useEffect(() => {
    ty.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(-(canvasHeight + 30), { duration: 11000 + delay * 1200, easing: Easing.linear })
      ),
      -1, false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay * 700 }),
        withTiming(0.22, { duration: 1500 }),
        withTiming(0.22, { duration: 6500 }),
        withTiming(0, { duration: 1500 })
      ),
      -1, false
    );
    return () => { cancelAnimation(ty); cancelAnimation(opacity); };
  }, [delay, canvasHeight, ty, opacity]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
    opacity: opacity.value,
  }));
  return (
    <Animated.View
      style={[{
        position: "absolute",
        left: x, bottom: 0,
        width: 2.5, height: 2.5, borderRadius: 1.5,
        backgroundColor: "#b4e6ff",
      }, style]}
      pointerEvents="none"
    />
  );
}

// Ice crystal pulse — small dot near formations that twinkles
function IceCrystalPulse({ x, y, delay }: { x: number; y: number; delay: number }) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay * 700 }),
        withTiming(0.20, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.04, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.20, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 800 })
      ),
      -1, false
    );
    return () => { cancelAnimation(opacity); };
  }, [delay, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[{
        position: "absolute", left: x - 3, top: y - 3,
        width: 6, height: 6, borderRadius: 3,
        backgroundColor: "#d4f0ff",
      }, style]}
      pointerEvents="none"
    />
  );
}

// Frost creep edge — frost creeping in from the sides
function FrostCreepEdge({ side, width, height }: { side: "left" | "right"; width: number; height: number }) {
  const creep = useSharedValue(0.3);
  useEffect(() => {
    creep.value = withRepeat(
      withSequence(
        withTiming(0.65, { duration: 6000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.30, { duration: 6000, easing: Easing.inOut(Easing.quad) })
      ),
      -1, true
    );
    return () => { cancelAnimation(creep); };
  }, [creep]);
  const style = useAnimatedStyle(() => ({
    opacity: creep.value * 0.10,
    width: creep.value * width * 0.14,
  }));
  return (
    <Animated.View
      style={[{
        position: "absolute",
        top: 0, height,
        ...(side === "left" ? { left: 0 } : { right: 0 }),
        backgroundColor: "rgba(180,230,255,1)",
      }, style]}
      pointerEvents="none"
    />
  );
}

// Sun warmth pulsing through the ice — golden glow breathing over top 30%
function IceSunRay({ width, height }: { width: number; height: number }) {
  const glow = useSharedValue(0.03);
  useEffect(() => {
    glow.value = withRepeat(withSequence(
      withTiming(0.08, { duration: 4500, easing: Easing.inOut(Easing.quad) }),
      withTiming(0.03, { duration: 4500, easing: Easing.inOut(Easing.quad) })
    ), -1, true);
    return () => { cancelAnimation(glow); };
  }, [glow]);
  const style = useAnimatedStyle(() => ({ opacity: glow.value }));
  return (
    <Animated.View
      style={[{ position: "absolute", left: 0, top: 0, width, height: height * 0.30, backgroundColor: "rgba(245,197,24,1)" }, style]}
      pointerEvents="none"
    />
  );
}

function FrozenOceanBackground({ width: w, height: h }: { width: number; height: number }) {
  const waveY = h * 0.75;
  const wavePath = `M 0 ${waveY} Q ${w * 0.15} ${waveY - 16} ${w * 0.30} ${waveY} Q ${w * 0.50} ${waveY + 18} ${w * 0.70} ${waveY - 12} Q ${w * 0.85} ${waveY - 6} ${w} ${waveY}`;


  return (
    <>
      {/* ── Static SVG layers ─────────────────────────────── */}
      <Svg width={w} height={h} style={{ position: "absolute", top: 0, left: 0 }}>
        <Defs>
          {/* Tropical sky — lighter blues, visible green tones */}
          <LinearGradient id="i1Sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"    stopColor="#0a1f3a" stopOpacity="1" />
            <Stop offset="0.20" stopColor="#0e3d2e" stopOpacity="0.90" />
            <Stop offset="0.45" stopColor="#135c78" stopOpacity="0.85" />
            <Stop offset="0.68" stopColor="#1a7a5a" stopOpacity="0.80" />
            <Stop offset="1"    stopColor="#0d2e3f" stopOpacity="1" />
          </LinearGradient>
          {/* Sun glow — boosted to 22% opacity, warm orange bleed */}
          <RadialGradient id="i1Sun" cx="0.22" cy="0.10" rx="0.50" ry="0.35">
            <Stop offset="0"   stopColor="#f5c518" stopOpacity="0.22" />
            <Stop offset="0.4" stopColor="#f5a623" stopOpacity="0.10" />
            <Stop offset="0.7" stopColor="#e8845a" stopOpacity="0.05" />
            <Stop offset="1"   stopColor="#f5c518" stopOpacity="0" />
          </RadialGradient>
          {/* Frozen sunrise horizon — orange-pink glow band */}
          <LinearGradient id="i1Horizon" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"   stopColor="#ff6b35" stopOpacity="0" />
            <Stop offset="0.5" stopColor="#ff8c42" stopOpacity="0.12" />
            <Stop offset="0.7" stopColor="#e84393" stopOpacity="0.06" />
            <Stop offset="1"   stopColor="#ff6b35" stopOpacity="0" />
          </LinearGradient>
          {/* Sand — boosted to 38% */}
          <LinearGradient id="i1Sand" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#c4974a" stopOpacity="0.38" />
            <Stop offset="1" stopColor="#8a6a35" stopOpacity="0.22" />
          </LinearGradient>
          {/* Lagoon — boosted to 32%, vivid turquoise */}
          <LinearGradient id="i1Lagoon" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0fb8a0" stopOpacity="0.32" />
            <Stop offset="1" stopColor="#0a6b7a" stopOpacity="0.38" />
          </LinearGradient>
        </Defs>

        {/* Layer 1: Tropical base gradient */}
        <Rect x={0} y={0} width={w} height={h} fill="url(#i1Sky)" />
        <Rect x={0} y={0} width={w} height={h} fill="url(#i1Sun)" />
        {/* Frozen sunrise horizon band — middle 35-65% */}
        <Rect x={0} y={h * 0.35} width={w} height={h * 0.30} fill="url(#i1Horizon)" />
        {/* Sandy beach zone — bottom 25% */}
        <Rect x={0} y={h * 0.75} width={w} height={h * 0.25} fill="url(#i1Sand)" />
        {/* Turquoise lagoon — middle 50-75% */}
        <Rect x={0} y={h * 0.50} width={w} height={h * 0.25} fill="url(#i1Lagoon)" />

        {/* Crepuscular sunbeam rays — thick diagonal paths from top-left sun */}
        <Path d={`M 0 0 L ${w*0.55} ${h*0.50}`} stroke="rgba(245,197,24,0.06)" strokeWidth={55} fill="none" strokeLinecap="round" />
        <Path d={`M 0 ${h*0.04} L ${w*0.60} ${h*0.58}`} stroke="rgba(245,197,24,0.05)" strokeWidth={48} fill="none" strokeLinecap="round" />
        <Path d={`M ${w*0.05} 0 L ${w*0.68} ${h*0.52}`} stroke="rgba(245,197,24,0.04)" strokeWidth={60} fill="none" strokeLinecap="round" />
        <Path d={`M ${w*0.10} 0 L ${w*0.72} ${h*0.44}`} stroke="rgba(245,197,24,0.05)" strokeWidth={42} fill="none" strokeLinecap="round" />
        <Path d={`M 0 ${h*0.08} L ${w*0.50} ${h*0.65}`} stroke="rgba(245,218,100,0.04)" strokeWidth={52} fill="none" strokeLinecap="round" />
        <Path d={`M ${w*0.16} 0 L ${w*0.78} ${h*0.40}`} stroke="rgba(245,197,24,0.04)" strokeWidth={38} fill="none" strokeLinecap="round" />

        {/* Layer 2: Frost-covered palm trees */}
        {/* Palm tree 1 — left, tall (boosted to 0.50) */}
        <G opacity={0.50}>
          <Path d={`M ${w*0.18} ${h*0.72} Q ${w*0.17} ${h*0.57} ${w*0.19} ${h*0.46}`}
            stroke="#6b3a2a" strokeWidth={4.5} fill="none" strokeLinecap="round" />
          {/* 5 fronds */}
          <Path d={`M ${w*0.19} ${h*0.46} Q ${w*0.06} ${h*0.38} ${w*0.02} ${h*0.43}`}
            stroke="#27ae60" strokeWidth={2.8} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.19} ${h*0.46} Q ${w*0.14} ${h*0.34} ${w*0.22} ${h*0.31}`}
            stroke="#2ecc71" strokeWidth={2.8} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.19} ${h*0.46} Q ${w*0.30} ${h*0.38} ${w*0.35} ${h*0.42}`}
            stroke="#27ae60" strokeWidth={2.8} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.19} ${h*0.46} Q ${w*0.28} ${h*0.36} ${w*0.32} ${h*0.33}`}
            stroke="#52d68a" strokeWidth={2.2} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.19} ${h*0.46} Q ${w*0.10} ${h*0.36} ${w*0.07} ${h*0.33}`}
            stroke="#2ecc71" strokeWidth={2.2} fill="none" strokeLinecap="round" />
          {/* Frost overlays on fronds */}
          <Path d={`M ${w*0.19} ${h*0.46} Q ${w*0.06} ${h*0.38} ${w*0.02} ${h*0.43}`}
            stroke="rgba(200,240,255,0.35)" strokeWidth={1.2} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.19} ${h*0.46} Q ${w*0.14} ${h*0.34} ${w*0.22} ${h*0.31}`}
            stroke="rgba(200,240,255,0.32)" strokeWidth={1.2} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.19} ${h*0.46} Q ${w*0.30} ${h*0.38} ${w*0.35} ${h*0.42}`}
            stroke="rgba(200,240,255,0.30)" strokeWidth={1.2} fill="none" strokeLinecap="round" />
          {/* Coconuts */}
          <Circle cx={w*0.195} cy={h*0.473} r={4}   fill="#8b5a2b" opacity={0.85} />
          <Circle cx={w*0.180} cy={h*0.480} r={3.5} fill="#7a4e26" opacity={0.80} />
          <Circle cx={w*0.205} cy={h*0.482} r={3}   fill="#8b5a2b" opacity={0.75} />
        </G>
        {/* Palm tree 2 — right, medium (boosted to 0.42) */}
        <G opacity={0.42}>
          <Path d={`M ${w*0.76} ${h*0.67} Q ${w*0.77} ${h*0.53} ${w*0.75} ${h*0.42}`}
            stroke="#6b3a2a" strokeWidth={4} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.75} ${h*0.42} Q ${w*0.63} ${h*0.35} ${w*0.58} ${h*0.39}`}
            stroke="#27ae60" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.75} ${h*0.42} Q ${w*0.73} ${h*0.31} ${w*0.80} ${h*0.28}`}
            stroke="#2ecc71" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.75} ${h*0.42} Q ${w*0.86} ${h*0.34} ${w*0.90} ${h*0.38}`}
            stroke="#27ae60" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.75} ${h*0.42} Q ${w*0.68} ${h*0.33} ${w*0.65} ${h*0.30}`}
            stroke="#52d68a" strokeWidth={2} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.75} ${h*0.42} Q ${w*0.63} ${h*0.35} ${w*0.58} ${h*0.39}`}
            stroke="rgba(200,240,255,0.35)" strokeWidth={1} fill="none" />
          <Path d={`M ${w*0.75} ${h*0.42} Q ${w*0.86} ${h*0.34} ${w*0.90} ${h*0.38}`}
            stroke="rgba(200,240,255,0.32)" strokeWidth={1} fill="none" />
          {/* Coconuts */}
          <Circle cx={w*0.752} cy={h*0.432} r={3.5} fill="#8b5a2b" opacity={0.80} />
          <Circle cx={w*0.762} cy={h*0.438} r={3}   fill="#7a4e26" opacity={0.75} />
        </G>
        {/* Palm tree 3 — center-left (boosted to 0.30) */}
        <G opacity={0.30}>
          <Path d={`M ${w*0.42} ${h*0.58} Q ${w*0.41} ${h*0.50} ${w*0.43} ${h*0.43}`}
            stroke="#6b3a2a" strokeWidth={2.8} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.43} ${h*0.43} Q ${w*0.35} ${h*0.38} ${w*0.32} ${h*0.41}`}
            stroke="#27ae60" strokeWidth={2.2} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.43} ${h*0.43} Q ${w*0.51} ${h*0.37} ${w*0.54} ${h*0.40}`}
            stroke="#2ecc71" strokeWidth={2.2} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.43} ${h*0.43} Q ${w*0.44} ${h*0.36} ${w*0.48} ${h*0.34}`}
            stroke="#52d68a" strokeWidth={1.8} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.43} ${h*0.43} Q ${w*0.35} ${h*0.38} ${w*0.32} ${h*0.41}`}
            stroke="rgba(200,240,255,0.32)" strokeWidth={1} fill="none" />
        </G>
        {/* Palm tree 4 — NEW, center-right (0.28) */}
        <G opacity={0.28}>
          <Path d={`M ${w*0.55} ${h*0.64} Q ${w*0.54} ${h*0.55} ${w*0.56} ${h*0.48}`}
            stroke="#6b3a2a" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.56} ${h*0.48} Q ${w*0.48} ${h*0.42} ${w*0.45} ${h*0.45}`}
            stroke="#27ae60" strokeWidth={2} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.56} ${h*0.48} Q ${w*0.60} ${h*0.40} ${w*0.64} ${h*0.43}`}
            stroke="#2ecc71" strokeWidth={2} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.56} ${h*0.48} Q ${w*0.56} ${h*0.40} ${w*0.59} ${h*0.37}`}
            stroke="#52d68a" strokeWidth={1.8} fill="none" strokeLinecap="round" />
        </G>
        {/* Palm tree 5 — NEW, far right (0.24) */}
        <G opacity={0.24}>
          <Path d={`M ${w*0.88} ${h*0.72} Q ${w*0.87} ${h*0.61} ${w*0.89} ${h*0.52}`}
            stroke="#6b3a2a" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.89} ${h*0.52} Q ${w*0.80} ${h*0.46} ${w*0.77} ${h*0.49}`}
            stroke="#27ae60" strokeWidth={2} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.89} ${h*0.52} Q ${w*0.93} ${h*0.44} ${w*0.96} ${h*0.47}`}
            stroke="#52d68a" strokeWidth={2} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.89} ${h*0.52} Q ${w*0.89} ${h*0.44} ${w*0.92} ${h*0.41}`}
            stroke="#2ecc71" strokeWidth={1.8} fill="none" strokeLinecap="round" />
        </G>
        {/* Vegetation patches — boosted opacity */}
        <Ellipse cx={w*0.10} cy={h*0.72} rx={22} ry={10} fill="#1a6b3a" opacity={0.32} />
        <Ellipse cx={w*0.10} cy={h*0.72} rx={22} ry={10} fill="rgba(180,230,255,0.08)" />
        <Ellipse cx={w*0.56} cy={h*0.69} rx={18} ry={8}  fill="#1a6b3a" opacity={0.28} />
        <Ellipse cx={w*0.91} cy={h*0.71} rx={20} ry={9}  fill="#1a6b3a" opacity={0.30} />
        <Ellipse cx={w*0.91} cy={h*0.71} rx={20} ry={9}  fill="rgba(180,230,255,0.06)" />
        <Ellipse cx={w*0.32} cy={h*0.74} rx={15} ry={7}  fill="#1a6b3a" opacity={0.28} />
        <Ellipse cx={w*0.70} cy={h*0.73} rx={17} ry={8}  fill="#1a6b3a" opacity={0.28} />
        {/* Frozen hibiscus flower 1 — left ground */}
        <G opacity={0.37}>
          <Path d={`M ${w*0.14} ${h*0.82} Q ${w*0.10} ${h*0.78} ${w*0.11} ${h*0.83}`} stroke="rgba(220,80,100,0.44)" strokeWidth={4} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.14} ${h*0.82} Q ${w*0.12} ${h*0.77} ${w*0.16} ${h*0.77}`} stroke="rgba(220,80,100,0.43)" strokeWidth={4} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.14} ${h*0.82} Q ${w*0.17} ${h*0.78} ${w*0.18} ${h*0.83}`} stroke="rgba(220,80,100,0.43)" strokeWidth={4} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.14} ${h*0.82} Q ${w*0.16} ${h*0.85} ${w*0.14} ${h*0.87}`} stroke="rgba(220,80,100,0.42)" strokeWidth={4} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.14} ${h*0.82} Q ${w*0.11} ${h*0.85} ${w*0.11} ${h*0.87}`} stroke="rgba(220,80,100,0.42)" strokeWidth={4} fill="none" strokeLinecap="round" />
          {/* Ice frost overlay */}
          <Path d={`M ${w*0.14} ${h*0.82} Q ${w*0.10} ${h*0.78} ${w*0.11} ${h*0.83}`} stroke="rgba(200,240,255,0.32)" strokeWidth={1.5} fill="none" />
          <Path d={`M ${w*0.14} ${h*0.82} Q ${w*0.17} ${h*0.78} ${w*0.18} ${h*0.83}`} stroke="rgba(200,240,255,0.30)" strokeWidth={1.5} fill="none" />
          {/* Gold center */}
          <Circle cx={w*0.140} cy={h*0.820} r={2.5} fill="rgba(245,197,24,0.65)" />
        </G>
        {/* Frozen hibiscus flower 2 — right ground */}
        <G opacity={0.36}>
          <Path d={`M ${w*0.78} ${h*0.84} Q ${w*0.74} ${h*0.80} ${w*0.75} ${h*0.85}`} stroke="rgba(230,100,80,0.43)" strokeWidth={4} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.78} ${h*0.84} Q ${w*0.76} ${h*0.79} ${w*0.80} ${h*0.79}`} stroke="rgba(230,100,80,0.42)" strokeWidth={4} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.78} ${h*0.84} Q ${w*0.81} ${h*0.80} ${w*0.82} ${h*0.85}`} stroke="rgba(230,100,80,0.42)" strokeWidth={4} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.78} ${h*0.84} Q ${w*0.80} ${h*0.87} ${w*0.78} ${h*0.89}`} stroke="rgba(230,100,80,0.41)" strokeWidth={4} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.78} ${h*0.84} Q ${w*0.75} ${h*0.87} ${w*0.75} ${h*0.89}`} stroke="rgba(230,100,80,0.41)" strokeWidth={4} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.78} ${h*0.84} Q ${w*0.74} ${h*0.80} ${w*0.75} ${h*0.85}`} stroke="rgba(200,240,255,0.30)" strokeWidth={1.5} fill="none" />
          <Path d={`M ${w*0.78} ${h*0.84} Q ${w*0.81} ${h*0.80} ${w*0.82} ${h*0.85}`} stroke="rgba(200,240,255,0.28)" strokeWidth={1.5} fill="none" />
          <Circle cx={w*0.780} cy={h*0.840} r={2.5} fill="rgba(245,197,24,0.62)" />
        </G>
        {/* Frozen bird silhouette — mid-sky */}
        <G opacity={0.25}>
          <Path d={`M ${w*0.45} ${h*0.305} Q ${w*0.39} ${h*0.285} ${w*0.34} ${h*0.295}`}
            stroke="#1abc9c" strokeWidth={2.2} fill="none" strokeLinecap="round" />
          <Path d={`M ${w*0.45} ${h*0.305} Q ${w*0.51} ${h*0.285} ${w*0.56} ${h*0.295}`}
            stroke="#1abc9c" strokeWidth={2.2} fill="none" strokeLinecap="round" />
          {/* Ice frost outline */}
          <Path d={`M ${w*0.45} ${h*0.305} Q ${w*0.39} ${h*0.285} ${w*0.34} ${h*0.295}`}
            stroke="rgba(220,245,255,0.50)" strokeWidth={0.8} fill="none" />
          <Path d={`M ${w*0.45} ${h*0.305} Q ${w*0.51} ${h*0.285} ${w*0.56} ${h*0.295}`}
            stroke="rgba(220,245,255,0.50)" strokeWidth={0.8} fill="none" />
          <Circle cx={w*0.450} cy={h*0.305} r={1.8} fill="#0fb8a0" />
        </G>

        {/* Layer 3: Ice curse formations */}
        {/* Large crystal formation — left (boosted) */}
        <Polygon points={`${w*0.08},${h*0.58} ${w*0.13},${h*0.47} ${w*0.17},${h*0.58} ${w*0.13},${h*0.63}`}
          fill="rgba(180,230,255,0.20)" stroke="rgba(220,245,255,0.45)" strokeWidth={1.2} />
        {/* Inner glow */}
        <Polygon points={`${w*0.09},${h*0.57} ${w*0.13},${h*0.49} ${w*0.16},${h*0.57} ${w*0.13},${h*0.61}`}
          fill="rgba(200,240,255,0.08)" stroke="none" />
        {/* Large crystal formation — right (boosted) */}
        <Polygon points={`${w*0.82},${h*0.44} ${w*0.87},${h*0.34} ${w*0.91},${h*0.44} ${w*0.87},${h*0.49}`}
          fill="rgba(180,230,255,0.20)" stroke="rgba(220,245,255,0.45)" strokeWidth={1.2} />
        <Polygon points={`${w*0.83},${h*0.43} ${w*0.87},${h*0.36} ${w*0.90},${h*0.43} ${w*0.87},${h*0.47}`}
          fill="rgba(200,240,255,0.08)" stroke="none" />
        {/* Small ice shards — boosted */}
        <Polygon points={`${w*0.31},${h*0.31} ${w*0.33},${h*0.26} ${w*0.35},${h*0.31}`}
          fill="rgba(180,230,255,0.18)" stroke="rgba(220,245,255,0.35)" strokeWidth={0.8} />
        <Polygon points={`${w*0.63},${h*0.20} ${w*0.65},${h*0.16} ${w*0.67},${h*0.20}`}
          fill="rgba(180,230,255,0.18)" stroke="rgba(220,245,255,0.35)" strokeWidth={0.8} />
        <Polygon points={`${w*0.50},${h*0.56} ${w*0.52},${h*0.52} ${w*0.54},${h*0.56}`}
          fill="rgba(180,230,255,0.18)" stroke="rgba(220,245,255,0.30)" strokeWidth={0.8} />
        <Polygon points={`${w*0.22},${h*0.20} ${w*0.24},${h*0.16} ${w*0.26},${h*0.20}`}
          fill="rgba(180,230,255,0.18)" stroke="rgba(220,245,255,0.30)" strokeWidth={0.8} />
        {/* 4 new ice shards */}
        <Polygon points={`${w*0.44},${h*0.70} ${w*0.48},${h*0.60} ${w*0.52},${h*0.70} ${w*0.48},${h*0.74}`}
          fill="rgba(180,230,255,0.18)" stroke="rgba(220,245,255,0.38)" strokeWidth={0.9} />
        <Polygon points={`${w*0.45},${h*0.69} ${w*0.48},${h*0.62} ${w*0.51},${h*0.69} ${w*0.48},${h*0.72}`}
          fill="rgba(200,240,255,0.08)" stroke="none" />
        <Polygon points={`${w*0.60},${h*0.28} ${w*0.63},${h*0.20} ${w*0.66},${h*0.28} ${w*0.63},${h*0.32}`}
          fill="rgba(180,230,255,0.18)" stroke="rgba(220,245,255,0.35)" strokeWidth={0.9} />
        <Polygon points={`${w*0.22},${h*0.66} ${w*0.25},${h*0.58} ${w*0.28},${h*0.66} ${w*0.25},${h*0.70}`}
          fill="rgba(180,230,255,0.17)" stroke="rgba(220,245,255,0.32)" strokeWidth={0.9} />
        <Polygon points={`${w*0.72},${h*0.16} ${w*0.74},${h*0.12} ${w*0.76},${h*0.16}`}
          fill="rgba(180,230,255,0.18)" stroke="rgba(220,245,255,0.32)" strokeWidth={0.8} />
        {/* Frost crack lines — boosted */}
        <Path d={`M ${w*0.13} ${h*0.47} L ${w*0.09} ${h*0.42} L ${w*0.06} ${h*0.37}`}
          stroke="rgba(180,230,255,0.14)" strokeWidth={0.9} fill="none" />
        <Path d={`M ${w*0.13} ${h*0.47} L ${w*0.19} ${h*0.43} L ${w*0.23} ${h*0.39}`}
          stroke="rgba(180,230,255,0.13)" strokeWidth={0.9} fill="none" />
        <Path d={`M ${w*0.87} ${h*0.34} L ${w*0.83} ${h*0.29} L ${w*0.80} ${h*0.25}`}
          stroke="rgba(180,230,255,0.13)" strokeWidth={0.9} fill="none" />
        <Path d={`M ${w*0.87} ${h*0.34} L ${w*0.93} ${h*0.30}`}
          stroke="rgba(180,230,255,0.14)" strokeWidth={0.9} fill="none" />
        {/* New crack lines from new shards */}
        <Path d={`M ${w*0.48} ${h*0.60} L ${w*0.44} ${h*0.55} L ${w*0.42} ${h*0.50}`}
          stroke="rgba(180,230,255,0.12)" strokeWidth={0.8} fill="none" />
        <Path d={`M ${w*0.63} ${h*0.20} L ${w*0.60} ${h*0.15} L ${w*0.58} ${h*0.11}`}
          stroke="rgba(180,230,255,0.12)" strokeWidth={0.8} fill="none" />
        {/* Frost vignette edges */}
        <Rect x={0} y={0} width={w} height={h * 0.06} fill="rgba(180,230,255,0.05)" />
        <Rect x={0} y={h * 0.94} width={w} height={h * 0.06} fill="rgba(180,230,255,0.06)" />
        {/* Icicle stalactites along top edge */}
        <Polygon points={`${w*0.04-5},0 ${w*0.04},${h*0.065} ${w*0.04+5},0`}   fill="rgba(200,240,255,0.62)" stroke="rgba(220,248,255,0.78)" strokeWidth={0.5} />
        <Polygon points={`${w*0.10-4},0 ${w*0.10},${h*0.055} ${w*0.10+4},0`}   fill="rgba(200,240,255,0.60)" stroke="rgba(220,248,255,0.76)" strokeWidth={0.5} />
        <Polygon points={`${w*0.18-5},0 ${w*0.18},${h*0.080} ${w*0.18+5},0`}   fill="rgba(200,240,255,0.64)" stroke="rgba(220,248,255,0.80)" strokeWidth={0.5} />
        <Polygon points={`${w*0.26-4},0 ${w*0.26},${h*0.042} ${w*0.26+4},0`}   fill="rgba(200,240,255,0.60)" stroke="rgba(220,248,255,0.75)" strokeWidth={0.5} />
        <Polygon points={`${w*0.34-5},0 ${w*0.34},${h*0.072} ${w*0.34+5},0`}   fill="rgba(200,240,255,0.63)" stroke="rgba(220,248,255,0.78)" strokeWidth={0.5} />
        <Polygon points={`${w*0.47-4},0 ${w*0.47},${h*0.050} ${w*0.47+4},0`}   fill="rgba(200,240,255,0.61)" stroke="rgba(220,248,255,0.76)" strokeWidth={0.5} />
        <Polygon points={`${w*0.60-5},0 ${w*0.60},${h*0.078} ${w*0.60+5},0`}   fill="rgba(200,240,255,0.64)" stroke="rgba(220,248,255,0.80)" strokeWidth={0.5} />
        <Polygon points={`${w*0.74-4},0 ${w*0.74},${h*0.045} ${w*0.74+4},0`}   fill="rgba(200,240,255,0.60)" stroke="rgba(220,248,255,0.75)" strokeWidth={0.5} />
        <Polygon points={`${w*0.85-5},0 ${w*0.85},${h*0.068} ${w*0.85+5},0`}   fill="rgba(200,240,255,0.63)" stroke="rgba(220,248,255,0.78)" strokeWidth={0.5} />
        <Polygon points={`${w*0.94-4},0 ${w*0.94},${h*0.058} ${w*0.94+4},0`}   fill="rgba(200,240,255,0.61)" stroke="rgba(220,248,255,0.76)" strokeWidth={0.5} />

        {/* Enhanced frozen ocean surface */}
        <Path d={wavePath} stroke="rgba(0,210,190,0.38)" strokeWidth={3.5} fill="rgba(26,107,90,0.06)" />
        <Path d={wavePath} stroke="rgba(220,245,255,0.14)" strokeWidth={1} fill="none" />

        {/* Frost sparkles — boosted */}
        <Circle cx={w*0.06} cy={h*0.08} r={2}   fill="rgba(180,230,255,0.42)" />
        <Circle cx={w*0.91} cy={h*0.13} r={2}   fill="rgba(180,230,255,0.38)" />
        <Circle cx={w*0.14} cy={h*0.24} r={1.5} fill="rgba(180,230,255,0.35)" />
        <Circle cx={w*0.82} cy={h*0.31} r={2}   fill="rgba(180,230,255,0.38)" />
        <Circle cx={w*0.07} cy={h*0.48} r={1.5} fill="rgba(180,230,255,0.32)" />
        <Circle cx={w*0.87} cy={h*0.57} r={2}   fill="rgba(180,230,255,0.38)" />
        <Circle cx={w*0.45} cy={h*0.35} r={1.5} fill="rgba(180,230,255,0.35)" />
        <Circle cx={w*0.60} cy={h*0.47} r={1.5} fill="rgba(180,230,255,0.32)" />
        <Circle cx={w*0.30} cy={h*0.58} r={1.5} fill="rgba(180,230,255,0.30)" />
        <Circle cx={w*0.70} cy={h*0.22} r={1.5} fill="rgba(180,230,255,0.32)" />

      </Svg>

      {/* ── Animated overlays ─────────────────────────────── */}

      {/* Sun warmth pulsing through the ice */}
      <IceSunRay width={w} height={h} />

      {/* Aurora borealis — Ingay's curse energy (green + blue bands) */}
      <AuroraWave width={w} height={h} yFrac={0.05} color="#27ae60" delay={0} />
      <AuroraWave width={w} height={h} yFrac={0.13} color="#3498db" delay={1} />
      <AuroraWave width={w} height={h} yFrac={0.21} color="#27ae60" delay={2} />

      {/* Frost particles rising through frozen air */}
      <FrostParticle x={w * 0.10} delay={0} canvasHeight={h} />
      <FrostParticle x={w * 0.25} delay={1} canvasHeight={h} />
      <FrostParticle x={w * 0.40} delay={2} canvasHeight={h} />
      <FrostParticle x={w * 0.58} delay={3} canvasHeight={h} />
      <FrostParticle x={w * 0.74} delay={4} canvasHeight={h} />
      <FrostParticle x={w * 0.88} delay={5} canvasHeight={h} />

      {/* Ice crystal pulses near formations */}
      <IceCrystalPulse x={w * 0.13} y={h * 0.53} delay={0} />
      <IceCrystalPulse x={w * 0.87} y={h * 0.44} delay={1} />
      <IceCrystalPulse x={w * 0.33} y={h * 0.28} delay={2} />
      <IceCrystalPulse x={w * 0.65} y={h * 0.19} delay={3} />
      <IceCrystalPulse x={w * 0.52} y={h * 0.55} delay={4} />

      {/* Floating ice floes on the surface */}
      <IceFloe x={w * 0.04} y={h * 0.76} w={62} h={18} delay={0} />
      <IceFloe x={w * 0.45} y={h * 0.81} w={42} h={12} delay={1} />
      <IceFloe x={w * 0.63} y={h * 0.73} w={82} h={20} delay={2} />
      <IceFloe x={w * 0.23} y={h * 0.87} w={36} h={10} delay={3} />

      {/* Frost creeping from edges */}
      <FrostCreepEdge side="left"  width={w} height={h} />
      <FrostCreepEdge side="right" width={w} height={h} />
    </>
  );
}

// ─── Island 2: Speedy Purple Background ──────────────────────────────────────

// Electric purple glow pulsing over top 30% of screen
function ElectricPulse({ width, height }: { width: number; height: number }) {
  const glow = useSharedValue(0.02);
  useEffect(() => {
    glow.value = withRepeat(withSequence(
      withTiming(0.10, { duration: 3000, easing: Easing.inOut(Easing.quad) }),
      withTiming(0.02, { duration: 3000, easing: Easing.inOut(Easing.quad) })
    ), -1, true);
    return () => { cancelAnimation(glow); };
  }, [glow]);
  const style = useAnimatedStyle(() => ({ opacity: glow.value }));
  return (
    <Animated.View style={[{ position: "absolute", left: 0, top: 0, width, height: height * 0.30,
      backgroundColor: "rgba(142,68,173,1)" }, style]} pointerEvents="none" />
  );
}

// Brief white-purple lightning flash every ~4.5s
function LightningFlicker({ width, height }: { width: number; height: number }) {
  const flickerOpacity = useSharedValue(0);
  useEffect(() => {
    const flash = () => {
      flickerOpacity.value = withSequence(
        withTiming(0.08, { duration: 50 }),
        withTiming(0, { duration: 70 }),
        withTiming(0.05, { duration: 40 }),
        withTiming(0, { duration: 90 })
      );
    };
    flash();
    const id = setInterval(flash, 4500);
    return () => { clearInterval(id); cancelAnimation(flickerOpacity); };
  }, [flickerOpacity]);
  const style = useAnimatedStyle(() => ({ opacity: flickerOpacity.value }));
  return (
    <Animated.View style={[{ position: "absolute", left: 0, top: 0, width, height,
      backgroundColor: "#c39bd3" }, style]} pointerEvents="none" />
  );
}

function SpeedBolt({ y, w, totalWidth, delay, color }: { y: number; w: number; totalWidth: number; delay: number; color: string }) {
  const tx = useSharedValue(-w - 10);
  useEffect(() => {
    tx.value = withRepeat(
      withSequence(
        withTiming(-w - 10, { duration: 0 }),
        withTiming(totalWidth + 10, { duration: 700 + delay * 120, easing: Easing.linear })
      ),
      -1, false
    );
    return () => { tx.value = -w - 10; };
  }, [delay, totalWidth, tx, w]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  return (
    <Animated.View
      style={[{ position: "absolute", top: y, left: 0, width: w, height: 2, borderRadius: 1, backgroundColor: color }, style]}
      pointerEvents="none"
    />
  );
}

function SpeedyBackground({ width: w, height: h }: { width: number; height: number }) {
  const waveY = h * 0.78;
  const wavePath = `M 0 ${waveY} Q ${w*0.18} ${waveY-12} ${w*0.35} ${waveY} Q ${w*0.55} ${waveY+14} ${w*0.75} ${waveY-8} Q ${w*0.90} ${waveY-4} ${w} ${waveY}`;


  return (
    <>
      {/* ── Static SVG layers ─────────────────────────────── */}
      <Svg width={w} height={h} style={{ position: "absolute", top: 0, left: 0 }}>
        <Defs>
          {/* Storm sky gradient — rich indigo to electric purple */}
          <LinearGradient id="i2Sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"    stopColor="#0a0618" stopOpacity="1" />
            <Stop offset="0.20" stopColor="#1a0d3a" stopOpacity="0.95" />
            <Stop offset="0.45" stopColor="#2d1b69" stopOpacity="0.85" />
            <Stop offset="0.68" stopColor="#3b1a7a" stopOpacity="0.80" />
            <Stop offset="1"    stopColor="#0d0620" stopOpacity="1" />
          </LinearGradient>
          {/* Lightning core glow — bright purple radial at top center */}
          <RadialGradient id="i2LightningCore" cx="0.50" cy="0.15" rx="0.55" ry="0.40">
            <Stop offset="0"    stopColor="#c39bd3" stopOpacity="0.22" />
            <Stop offset="0.35" stopColor="#9b59b6" stopOpacity="0.12" />
            <Stop offset="0.65" stopColor="#7d3c98" stopOpacity="0.05" />
            <Stop offset="1"    stopColor="#8e44ad" stopOpacity="0" />
          </RadialGradient>
          {/* Horizon purple glow band */}
          <LinearGradient id="i2HorizonGlow" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"   stopColor="#8e44ad" stopOpacity="0" />
            <Stop offset="0.4" stopColor="#bb8fce" stopOpacity="0.10" />
            <Stop offset="0.6" stopColor="#d7bde2" stopOpacity="0.06" />
            <Stop offset="1"   stopColor="#8e44ad" stopOpacity="0" />
          </LinearGradient>
          {/* Harbor water — dark purple depth */}
          <LinearGradient id="i2Harbor" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1a0d3a" stopOpacity="0.35" />
            <Stop offset="1" stopColor="#0a0618" stopOpacity="0.42" />
          </LinearGradient>
        </Defs>

        {/* Layer 1: Storm sky base */}
        <Rect x={0} y={0} width={w} height={h} fill="url(#i2Sky)" />
        <Rect x={0} y={0} width={w} height={h} fill="url(#i2LightningCore)" />
        <Rect x={0} y={h * 0.35} width={w} height={h * 0.30} fill="url(#i2HorizonGlow)" />
        <Rect x={0} y={h * 0.78} width={w} height={h * 0.22} fill="url(#i2Harbor)" />

        {/* Layer 2: Storm clouds */}
        <Ellipse cx={w*0.25} cy={h*0.08} rx={90} ry={22} fill="rgba(30,15,60,0.55)" />
        <Ellipse cx={w*0.70} cy={h*0.05} rx={110} ry={25} fill="rgba(25,12,50,0.50)" />
        <Ellipse cx={w*0.50} cy={h*0.12} rx={80} ry={18} fill="rgba(35,18,70,0.45)" />

        {/* Layer 3: Lightning bolt formations — glow + main + core */}
        {/* Bolt 1 — large, top-left */}
        <Path d={`M ${w*0.22} ${h*0.04} L ${w*0.19} ${h*0.14} L ${w*0.24} ${h*0.16} L ${w*0.18} ${h*0.28}`}
          stroke="rgba(200,160,255,0.18)" strokeWidth={8} strokeLinecap="round" fill="none" />
        <Path d={`M ${w*0.22} ${h*0.04} L ${w*0.19} ${h*0.14} L ${w*0.24} ${h*0.16} L ${w*0.18} ${h*0.28}`}
          stroke="rgba(220,190,255,0.50)" strokeWidth={2} strokeLinecap="round" fill="none" />
        <Path d={`M ${w*0.22} ${h*0.04} L ${w*0.19} ${h*0.14} L ${w*0.24} ${h*0.16} L ${w*0.18} ${h*0.28}`}
          stroke="rgba(255,255,255,0.30)" strokeWidth={0.8} fill="none" />
        {/* Bolt 2 — medium, top-right */}
        <Path d={`M ${w*0.72} ${h*0.02} L ${w*0.75} ${h*0.10} L ${w*0.70} ${h*0.12} L ${w*0.74} ${h*0.22}`}
          stroke="rgba(200,160,255,0.16)" strokeWidth={7} strokeLinecap="round" fill="none" />
        <Path d={`M ${w*0.72} ${h*0.02} L ${w*0.75} ${h*0.10} L ${w*0.70} ${h*0.12} L ${w*0.74} ${h*0.22}`}
          stroke="rgba(210,180,245,0.48)" strokeWidth={1.8} strokeLinecap="round" fill="none" />
        <Path d={`M ${w*0.72} ${h*0.02} L ${w*0.75} ${h*0.10} L ${w*0.70} ${h*0.12} L ${w*0.74} ${h*0.22}`}
          stroke="rgba(255,255,255,0.28)" strokeWidth={0.7} fill="none" />
        {/* Bolt 3 — center, branching */}
        <Path d={`M ${w*0.48} ${h*0.06} L ${w*0.50} ${h*0.15} L ${w*0.46} ${h*0.18} L ${w*0.50} ${h*0.25}`}
          stroke="rgba(200,160,255,0.14)" strokeWidth={6} strokeLinecap="round" fill="none" />
        <Path d={`M ${w*0.48} ${h*0.06} L ${w*0.50} ${h*0.15} L ${w*0.46} ${h*0.18} L ${w*0.50} ${h*0.25}`}
          stroke="rgba(195,155,211,0.45)" strokeWidth={1.5} strokeLinecap="round" fill="none" />
        <Path d={`M ${w*0.50} ${h*0.15} L ${w*0.55} ${h*0.20}`}
          stroke="rgba(195,155,211,0.35)" strokeWidth={1.2} strokeLinecap="round" fill="none" />
        {/* Bolt 4 — small, bottom-right */}
        <Path d={`M ${w*0.82} ${h*0.30} L ${w*0.80} ${h*0.38} L ${w*0.84} ${h*0.40} L ${w*0.81} ${h*0.46}`}
          stroke="rgba(200,160,255,0.12)" strokeWidth={5} strokeLinecap="round" fill="none" />
        <Path d={`M ${w*0.82} ${h*0.30} L ${w*0.80} ${h*0.38} L ${w*0.84} ${h*0.40} L ${w*0.81} ${h*0.46}`}
          stroke="rgba(195,155,211,0.42)" strokeWidth={1.4} strokeLinecap="round" fill="none" />

        {/* Layer 4: Speed streaks — partial-width lines */}
        <Path d={`M 0 ${h*0.08} L ${w*0.55} ${h*0.08}`} stroke="#bb8fce" strokeWidth={2.5} opacity={0.22} />
        <Path d={`M ${w*0.15} ${h*0.15} L ${w*0.80} ${h*0.15}`} stroke="#a569bd" strokeWidth={1.5} opacity={0.18} />
        <Path d={`M ${w*0.05} ${h*0.24} L ${w*0.60} ${h*0.24}`} stroke="#c39bd3" strokeWidth={3.0} opacity={0.25} />
        <Path d={`M ${w*0.20} ${h*0.33} L ${w*0.90} ${h*0.33}`} stroke="#a569bd" strokeWidth={1.8} opacity={0.20} />
        <Path d={`M 0 ${h*0.42} L ${w*0.65} ${h*0.42}`} stroke="#bb8fce" strokeWidth={2.5} opacity={0.22} />
        <Path d={`M ${w*0.10} ${h*0.52} L ${w*0.75} ${h*0.52}`} stroke="#a569bd" strokeWidth={1.5} opacity={0.16} />
        <Path d={`M ${w*0.05} ${h*0.62} L ${w*0.50} ${h*0.62}`} stroke="#c39bd3" strokeWidth={3.5} opacity={0.28} />
        <Path d={`M ${w*0.30} ${h*0.72} L ${w*0.95} ${h*0.72}`} stroke="#bb8fce" strokeWidth={2.0} opacity={0.20} />
        <Path d={`M 0 ${h*0.82} L ${w*0.70} ${h*0.82}`} stroke="#a569bd" strokeWidth={1.5} opacity={0.18} />
        <Path d={`M ${w*0.15} ${h*0.91} L ${w*0.85} ${h*0.91}`} stroke="#c39bd3" strokeWidth={2.8} opacity={0.24} />

        {/* Energy arcs — quarter circles */}
        <Path d={`M ${w*0.15} ${h*0.35} A 25 25 0 0 1 ${w*0.15+18} ${h*0.35+18}`}
          stroke="rgba(195,155,211,0.35)" strokeWidth={1.5} fill="none" />
        <Path d={`M ${w*0.78} ${h*0.22} A 20 20 0 0 0 ${w*0.78-14} ${h*0.22+14}`}
          stroke="rgba(195,155,211,0.30)" strokeWidth={1.2} fill="none" />
        <Path d={`M ${w*0.35} ${h*0.70} A 18 18 0 0 1 ${w*0.35+13} ${h*0.70-13}`}
          stroke="rgba(195,155,211,0.28)" strokeWidth={1.2} fill="none" />
        <Path d={`M ${w*0.62} ${h*0.55} A 22 22 0 0 0 ${w*0.62+16} ${h*0.55+16}`}
          stroke="rgba(195,155,211,0.32)" strokeWidth={1.4} fill="none" />
        {/* Spark dots at arc endpoints */}
        <Circle cx={w*0.15+18} cy={h*0.35+18} r={3}   fill="rgba(220,190,255,0.45)" />
        <Circle cx={w*0.78-14} cy={h*0.22+14} r={2.5} fill="rgba(220,190,255,0.40)" />
        <Circle cx={w*0.35+13} cy={h*0.70-13} r={2}   fill="rgba(220,190,255,0.38)" />
        <Circle cx={w*0.62+16} cy={h*0.55+16} r={2.5} fill="rgba(220,190,255,0.42)" />

        {/* Energy diamonds — larger, boosted opacity */}
        <Rect x={w*0.12-7} y={h*0.18-7} width={14} height={14} fill="rgba(195,155,211,0.38)" stroke="rgba(220,190,255,0.50)" strokeWidth={0.8} transform={`rotate(45, ${w*0.12}, ${h*0.18})`} />
        <Rect x={w*0.72-7} y={h*0.28-7} width={14} height={14} fill="rgba(195,155,211,0.38)" stroke="rgba(220,190,255,0.50)" strokeWidth={0.8} transform={`rotate(45, ${w*0.72}, ${h*0.28})`} />
        <Rect x={w*0.25-7} y={h*0.48-7} width={14} height={14} fill="rgba(195,155,211,0.38)" stroke="rgba(220,190,255,0.50)" strokeWidth={0.8} transform={`rotate(45, ${w*0.25}, ${h*0.48})`} />
        <Rect x={w*0.85-7} y={h*0.58-7} width={14} height={14} fill="rgba(195,155,211,0.38)" stroke="rgba(220,190,255,0.50)" strokeWidth={0.8} transform={`rotate(45, ${w*0.85}, ${h*0.58})`} />
        <Rect x={w*0.50-7} y={h*0.72-7} width={14} height={14} fill="rgba(195,155,211,0.38)" stroke="rgba(220,190,255,0.50)" strokeWidth={0.8} transform={`rotate(45, ${w*0.50}, ${h*0.72})`} />
        <Rect x={w*0.08-7} y={h*0.62-7} width={14} height={14} fill="rgba(195,155,211,0.38)" stroke="rgba(220,190,255,0.50)" strokeWidth={0.8} transform={`rotate(45, ${w*0.08}, ${h*0.62})`} />
        <Rect x={w*0.90-7} y={h*0.42-7} width={14} height={14} fill="rgba(195,155,211,0.38)" stroke="rgba(220,190,255,0.50)" strokeWidth={0.8} transform={`rotate(45, ${w*0.90}, ${h*0.42})`} />
        <Rect x={w*0.40-7} y={h*0.35-7} width={14} height={14} fill="rgba(195,155,211,0.38)" stroke="rgba(220,190,255,0.50)" strokeWidth={0.8} transform={`rotate(45, ${w*0.40}, ${h*0.35})`} />

        {/* Layer 5: Clock/Time elements — frozen distorted clocks */}
        {/* Clock 1 — large, center-left */}
        <G opacity={0.40}>
          <Circle cx={w*0.28} cy={h*0.42} r={24} fill="rgba(30,15,60,0.50)" stroke="rgba(195,155,211,0.45)" strokeWidth={1.5} />
          {/* 12 tick marks */}
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * 30 * Math.PI) / 180;
            const cx = w * 0.28; const cy = h * 0.42;
            return <Line key={i} x1={cx + 20 * Math.cos(a)} y1={cy + 20 * Math.sin(a)} x2={cx + 24 * Math.cos(a)} y2={cy + 24 * Math.sin(a)} stroke="rgba(195,155,211,0.55)" strokeWidth={0.8} />;
          })}
          <Line x1={w*0.28} y1={h*0.42} x2={w*0.28+8} y2={h*0.42-14} stroke="rgba(245,197,24,0.65)" strokeWidth={1.8} strokeLinecap="round" />
          <Line x1={w*0.28} y1={h*0.42} x2={w*0.28-10} y2={h*0.42+6} stroke="rgba(220,190,255,0.55)" strokeWidth={1.2} strokeLinecap="round" />
          <Circle cx={w*0.28} cy={h*0.42} r={2} fill="rgba(245,197,24,0.70)" />
          <Path d={`M ${w*0.28-12} ${h*0.42+5} L ${w*0.28+5} ${h*0.42-8} L ${w*0.28+14} ${h*0.42-2}`} stroke="rgba(255,255,255,0.25)" strokeWidth={0.6} fill="none" />
        </G>
        {/* Clock 2 — small, upper-right */}
        <G opacity={0.32}>
          <Circle cx={w*0.78} cy={h*0.18} r={16} fill="rgba(30,15,60,0.45)" stroke="rgba(195,155,211,0.38)" strokeWidth={1} />
          {[0, 90, 180, 270].map((deg, i) => {
            const a = (deg * Math.PI) / 180;
            const cx = w * 0.78; const cy = h * 0.18;
            return <Line key={i} x1={cx + 12 * Math.cos(a)} y1={cy + 12 * Math.sin(a)} x2={cx + 16 * Math.cos(a)} y2={cy + 16 * Math.sin(a)} stroke="rgba(195,155,211,0.50)" strokeWidth={0.8} />;
          })}
          <Line x1={w*0.78} y1={h*0.18} x2={w*0.78+6} y2={h*0.18-10} stroke="rgba(245,197,24,0.55)" strokeWidth={1.4} strokeLinecap="round" />
          <Circle cx={w*0.78} cy={h*0.18} r={1.5} fill="rgba(245,197,24,0.60)" />
        </G>
        {/* Clock 3 — medium, bottom-center */}
        <G opacity={0.28}>
          <Circle cx={w*0.55} cy={h*0.78} r={18} fill="rgba(30,15,60,0.40)" stroke="rgba(195,155,211,0.35)" strokeWidth={1.2} />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * 30 * Math.PI) / 180;
            const cx = w * 0.55; const cy = h * 0.78;
            return <Line key={i} x1={cx + 14 * Math.cos(a)} y1={cy + 14 * Math.sin(a)} x2={cx + 18 * Math.cos(a)} y2={cy + 18 * Math.sin(a)} stroke="rgba(195,155,211,0.45)" strokeWidth={0.7} />;
          })}
          <Line x1={w*0.55} y1={h*0.78} x2={w*0.55+5} y2={h*0.78-12} stroke="rgba(245,197,24,0.55)" strokeWidth={1.6} strokeLinecap="round" />
          <Line x1={w*0.55} y1={h*0.78} x2={w*0.55+7} y2={h*0.78-9} stroke="rgba(220,190,255,0.45)" strokeWidth={1} strokeLinecap="round" />
          <Circle cx={w*0.55} cy={h*0.78} r={1.8} fill="rgba(245,197,24,0.55)" />
        </G>

        {/* Vignette edges */}
        <Rect x={0} y={0} width={w} height={h * 0.06} fill="rgba(142,68,173,0.10)" />
        <Rect x={0} y={h * 0.94} width={w} height={h * 0.06} fill="rgba(142,68,173,0.12)" />

        {/* Boosted circular ripple arcs */}
        <Circle cx={w*0.20} cy={h*0.40} r={30} fill="none" stroke="rgba(195,155,211,0.28)" strokeWidth={1.5} />
        <Circle cx={w*0.75} cy={h*0.70} r={40} fill="none" stroke="rgba(195,155,211,0.25)" strokeWidth={1.5} />

        {/* Harbor wave line */}
        <Path d={wavePath} stroke="rgba(142,68,173,0.38)" strokeWidth={3} fill="rgba(30,15,60,0.08)" />
        <Path d={wavePath} stroke="rgba(195,155,211,0.16)" strokeWidth={1} fill="none" />

        {/* Electric spark dots */}
        <Circle cx={w*0.05} cy={h*0.06} r={2}   fill="rgba(220,190,255,0.42)" />
        <Circle cx={w*0.92} cy={h*0.11} r={2}   fill="rgba(220,190,255,0.38)" />
        <Circle cx={w*0.16} cy={h*0.22} r={1.5} fill="rgba(220,190,255,0.35)" />
        <Circle cx={w*0.84} cy={h*0.28} r={2}   fill="rgba(220,190,255,0.38)" />
        <Circle cx={w*0.09} cy={h*0.45} r={1.5} fill="rgba(220,190,255,0.32)" />
        <Circle cx={w*0.88} cy={h*0.52} r={2}   fill="rgba(220,190,255,0.38)" />
        <Circle cx={w*0.42} cy={h*0.32} r={1.5} fill="rgba(220,190,255,0.35)" />
        <Circle cx={w*0.58} cy={h*0.44} r={1.5} fill="rgba(220,190,255,0.32)" />
        <Circle cx={w*0.28} cy={h*0.56} r={1.5} fill="rgba(220,190,255,0.30)" />
        <Circle cx={w*0.72} cy={h*0.20} r={1.5} fill="rgba(220,190,255,0.32)" />

      </Svg>

      {/* ── Animated overlays ─────────────────────────────── */}

      {/* Electric purple glow breathing at top */}
      <ElectricPulse width={w} height={h} />

      {/* Lightning flash */}
      <LightningFlicker width={w} height={h} />

      {/* Animated speed bolts — boosted colors */}
      <SpeedBolt y={h * 0.15} w={80}  totalWidth={w} delay={0} color="rgba(195,155,211,0.40)" />
      <SpeedBolt y={h * 0.28} w={120} totalWidth={w} delay={1} color="rgba(210,180,245,0.35)" />
      <SpeedBolt y={h * 0.41} w={60}  totalWidth={w} delay={2} color="rgba(195,155,211,0.38)" />
      <SpeedBolt y={h * 0.55} w={100} totalWidth={w} delay={3} color="rgba(180,120,230,0.32)" />
      <SpeedBolt y={h * 0.68} w={80}  totalWidth={w} delay={1} color="rgba(195,155,211,0.40)" />
      <SpeedBolt y={h * 0.82} w={50}  totalWidth={w} delay={4} color="rgba(210,180,245,0.35)" />
    </>
  );
}

// ─── Island 3: Foggy Deep Navy Background ────────────────────────────────────

// Misty fog glow breathing over top 35%
function MistGlow({ width, height }: { width: number; height: number }) {
  const glow = useSharedValue(0.03);
  useEffect(() => {
    glow.value = withRepeat(withSequence(
      withTiming(0.09, { duration: 5000, easing: Easing.inOut(Easing.quad) }),
      withTiming(0.03, { duration: 5000, easing: Easing.inOut(Easing.quad) })
    ), -1, true);
    return () => { cancelAnimation(glow); };
  }, [glow]);
  const style = useAnimatedStyle(() => ({ opacity: glow.value }));
  return (
    <Animated.View style={[{ position: "absolute", left: 0, top: 0, width, height: height * 0.35,
      backgroundColor: "rgba(52,152,219,1)" }, style]} pointerEvents="none" />
  );
}

// Subtle mist flash every ~6s
function FogWisp({ width, height }: { width: number; height: number }) {
  const wispOpacity = useSharedValue(0);
  useEffect(() => {
    const flash = () => {
      wispOpacity.value = withSequence(
        withTiming(0.06, { duration: 80 }),
        withTiming(0, { duration: 100 }),
        withTiming(0.04, { duration: 60 }),
        withTiming(0, { duration: 120 })
      );
    };
    flash();
    const id = setInterval(flash, 6000);
    return () => { clearInterval(id); cancelAnimation(wispOpacity); };
  }, [wispOpacity]);
  const style = useAnimatedStyle(() => ({ opacity: wispOpacity.value }));
  return (
    <Animated.View style={[{ position: "absolute", left: 0, top: 0, width, height,
      backgroundColor: "#a8c8e0" }, style]} pointerEvents="none" />
  );
}

function FogDrift({ x, y, w, h, delay }: { x: number; y: number; w: number; h: number; delay: number }) {
  const tx = useSharedValue(0);
  useEffect(() => {
    tx.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 6000 + delay * 1200, easing: Easing.inOut(Easing.quad) }),
        withTiming(12, { duration: 6000 + delay * 1200, easing: Easing.inOut(Easing.quad) })
      ),
      -1, true
    );
    return () => { tx.value = 0; };
  }, [delay, tx]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  return (
    <Animated.View
      style={[{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: h / 2, backgroundColor: "rgba(160,210,240,0.20)" }, style]}
      pointerEvents="none"
    />
  );
}

function FoggyBackground({ width: w, height: h }: { width: number; height: number }) {
  const waveY = h * 0.80;
  const wavePath = `M 0 ${waveY} Q ${w*0.15} ${waveY-14} ${w*0.30} ${waveY} Q ${w*0.50} ${waveY+16} ${w*0.70} ${waveY-10} Q ${w*0.85} ${waveY-5} ${w} ${waveY}`;


  return (
    <>
      {/* ── Static SVG layers ─────────────────────────────── */}
      <Svg width={w} height={h} style={{ position: "absolute", top: 0, left: 0 }}>
        <Defs>
          {/* Misty blue-navy sky */}
          <LinearGradient id="i3Sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"    stopColor="#070e1a" stopOpacity="1" />
            <Stop offset="0.18" stopColor="#0c1a2e" stopOpacity="0.95" />
            <Stop offset="0.40" stopColor="#1a3352" stopOpacity="0.88" />
            <Stop offset="0.65" stopColor="#1a4a6b" stopOpacity="0.80" />
            <Stop offset="1"    stopColor="#0a1628" stopOpacity="1" />
          </LinearGradient>
          {/* Radial fog center glow */}
          <RadialGradient id="i3FogGlow" cx="0.45" cy="0.30" rx="0.55" ry="0.40">
            <Stop offset="0"    stopColor="#a8c8e0" stopOpacity="0.18" />
            <Stop offset="0.35" stopColor="#6ba3c8" stopOpacity="0.10" />
            <Stop offset="0.65" stopColor="#3498db" stopOpacity="0.05" />
            <Stop offset="1"    stopColor="#3498db" stopOpacity="0" />
          </RadialGradient>
          {/* Fog horizon band */}
          <LinearGradient id="i3HorizonMist" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"   stopColor="#a8c8e0" stopOpacity="0" />
            <Stop offset="0.4" stopColor="#7fb3d3" stopOpacity="0.12" />
            <Stop offset="0.6" stopColor="#b8d4e8" stopOpacity="0.08" />
            <Stop offset="1"   stopColor="#a8c8e0" stopOpacity="0" />
          </LinearGradient>
          {/* Misty lagoon water */}
          <LinearGradient id="i3Lagoon" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1a4a6b" stopOpacity="0.32" />
            <Stop offset="1" stopColor="#0c1a2e" stopOpacity="0.40" />
          </LinearGradient>
        </Defs>

        {/* Layer 1: Base sky + glow */}
        <Rect x={0} y={0} width={w} height={h} fill="url(#i3Sky)" />
        <Rect x={0} y={0} width={w} height={h} fill="url(#i3FogGlow)" />
        <Rect x={0} y={h * 0.35} width={w} height={h * 0.30} fill="url(#i3HorizonMist)" />
        <Rect x={0} y={h * 0.80} width={w} height={h * 0.20} fill="url(#i3Lagoon)" />

        {/* Layer 2: Mountain silhouettes (4 ranges, back to front) */}
        <Path d={`M 0 ${h*0.32} L ${w*0.12} ${h*0.22} L ${w*0.22} ${h*0.18} L ${w*0.32} ${h*0.25} L ${w*0.48} ${h*0.15} L ${w*0.60} ${h*0.20} L ${w*0.72} ${h*0.14} L ${w*0.85} ${h*0.22} L ${w} ${h*0.28} L ${w} ${h*0.40} L 0 ${h*0.40} Z`}
          fill="rgba(15,30,55,0.35)" />
        <Path d={`M 0 ${h*0.38} L ${w*0.10} ${h*0.30} L ${w*0.25} ${h*0.26} L ${w*0.38} ${h*0.32} L ${w*0.50} ${h*0.24} L ${w*0.65} ${h*0.30} L ${w*0.78} ${h*0.22} L ${w*0.90} ${h*0.28} L ${w} ${h*0.35} L ${w} ${h*0.48} L 0 ${h*0.48} Z`}
          fill="rgba(12,26,46,0.42)" />
        <Path d={`M 0 ${h*0.46} L ${w*0.15} ${h*0.38} L ${w*0.30} ${h*0.34} L ${w*0.45} ${h*0.40} L ${w*0.55} ${h*0.32} L ${w*0.70} ${h*0.38} L ${w*0.82} ${h*0.30} L ${w*0.95} ${h*0.36} L ${w} ${h*0.42} L ${w} ${h*0.55} L 0 ${h*0.55} Z`}
          fill="rgba(10,22,40,0.50)" />
        <Path d={`M 0 ${h*0.54} L ${w*0.08} ${h*0.48} L ${w*0.20} ${h*0.44} L ${w*0.35} ${h*0.50} L ${w*0.50} ${h*0.42} L ${w*0.62} ${h*0.48} L ${w*0.75} ${h*0.40} L ${w*0.88} ${h*0.46} L ${w} ${h*0.52} L ${w} ${h*0.62} L 0 ${h*0.62} Z`}
          fill="rgba(8,18,34,0.55)" />
        {/* Snow caps on tallest peaks */}
        <Path d={`M ${w*0.47} ${h*0.15} L ${w*0.44} ${h*0.18} L ${w*0.52} ${h*0.18} Z`} fill="rgba(200,220,240,0.28)" />
        <Path d={`M ${w*0.72} ${h*0.14} L ${w*0.69} ${h*0.17} L ${w*0.75} ${h*0.17} Z`} fill="rgba(200,220,240,0.25)" />
        <Path d={`M ${w*0.78} ${h*0.22} L ${w*0.75} ${h*0.25} L ${w*0.81} ${h*0.25} Z`} fill="rgba(200,220,240,0.22)" />
        <Path d={`M ${w*0.55} ${h*0.32} L ${w*0.52} ${h*0.35} L ${w*0.58} ${h*0.35} Z`} fill="rgba(200,220,240,0.20)" />

        {/* Layer 3: Fog bank ellipses */}
        <Ellipse cx={w*0.40} cy={h*0.20} rx={w*0.45} ry={18} fill="rgba(168,200,224,0.18)" />
        <Ellipse cx={w*0.55} cy={h*0.35} rx={w*0.50} ry={22} fill="rgba(168,200,224,0.22)" />
        <Ellipse cx={w*0.35} cy={h*0.48} rx={w*0.42} ry={16} fill="rgba(168,200,224,0.20)" />
        <Ellipse cx={w*0.60} cy={h*0.60} rx={w*0.48} ry={20} fill="rgba(168,200,224,0.25)" />
        <Ellipse cx={w*0.30} cy={h*0.72} rx={w*0.40} ry={14} fill="rgba(168,200,224,0.18)" />
        <Ellipse cx={w*0.50} cy={h*0.85} rx={w*0.46} ry={18} fill="rgba(168,200,224,0.22)" />

        {/* Layer 4: Glowing lanterns (3-circle each) */}
        <G opacity={0.55}>
          <Circle cx={w*0.12} cy={h*0.28} r={12} fill="rgba(232,169,64,0.25)" />
          <Circle cx={w*0.12} cy={h*0.28} r={5}  fill="rgba(245,197,24,0.65)" />
          <Circle cx={w*0.12} cy={h*0.28} r={2}  fill="rgba(255,255,255,0.45)" />
        </G>
        <G opacity={0.50}>
          <Circle cx={w*0.85} cy={h*0.42} r={10} fill="rgba(232,169,64,0.22)" />
          <Circle cx={w*0.85} cy={h*0.42} r={4}  fill="rgba(245,197,24,0.60)" />
          <Circle cx={w*0.85} cy={h*0.42} r={1.5} fill="rgba(255,255,255,0.40)" />
        </G>
        <G opacity={0.45}>
          <Circle cx={w*0.30} cy={h*0.55} r={14} fill="rgba(232,169,64,0.20)" />
          <Circle cx={w*0.30} cy={h*0.55} r={6}  fill="rgba(245,197,24,0.55)" />
          <Circle cx={w*0.30} cy={h*0.55} r={2.5} fill="rgba(255,255,255,0.38)" />
        </G>
        <G opacity={0.42}>
          <Circle cx={w*0.75} cy={h*0.68} r={11} fill="rgba(232,169,64,0.22)" />
          <Circle cx={w*0.75} cy={h*0.68} r={4.5} fill="rgba(245,197,24,0.58)" />
          <Circle cx={w*0.75} cy={h*0.68} r={2} fill="rgba(255,255,255,0.35)" />
        </G>
        <G opacity={0.38}>
          <Circle cx={w*0.08} cy={h*0.75} r={9} fill="rgba(232,169,64,0.18)" />
          <Circle cx={w*0.08} cy={h*0.75} r={3.5} fill="rgba(245,197,24,0.52)" />
          <Circle cx={w*0.08} cy={h*0.75} r={1.5} fill="rgba(255,255,255,0.32)" />
        </G>
        <G opacity={0.48}>
          <Circle cx={w*0.50} cy={h*0.18} r={13} fill="rgba(232,169,64,0.24)" />
          <Circle cx={w*0.50} cy={h*0.18} r={5.5} fill="rgba(245,197,24,0.62)" />
          <Circle cx={w*0.50} cy={h*0.18} r={2} fill="rgba(255,255,255,0.42)" />
        </G>

        {/* Layer 5: Ancient stone markers */}
        <G opacity={0.40}>
          <Rect x={w*0.14} y={h*0.60} width={12} height={30} rx={2} fill="rgba(80,95,110,0.55)" stroke="rgba(120,140,160,0.35)" strokeWidth={1} />
          <Path d={`M ${w*0.14+2} ${h*0.60+6} L ${w*0.14+10} ${h*0.60+6}`} stroke="rgba(168,200,224,0.30)" strokeWidth={0.7} fill="none" />
          <Path d={`M ${w*0.14+2} ${h*0.60+12} L ${w*0.14+10} ${h*0.60+12}`} stroke="rgba(168,200,224,0.25)" strokeWidth={0.7} fill="none" />
          <Ellipse cx={w*0.14+6} cy={h*0.60+26} rx={7} ry={3} fill="rgba(52,152,100,0.25)" />
        </G>
        <G opacity={0.38}>
          <Rect x={w*0.78} y={h*0.52} width={14} height={35} rx={2} fill="rgba(80,95,110,0.50)" stroke="rgba(120,140,160,0.32)" strokeWidth={1} />
          <Path d={`M ${w*0.78+2} ${h*0.52+8} L ${w*0.78+12} ${h*0.52+8}`} stroke="rgba(168,200,224,0.28)" strokeWidth={0.7} fill="none" />
          <Path d={`M ${w*0.78+2} ${h*0.52+16} L ${w*0.78+12} ${h*0.52+16}`} stroke="rgba(168,200,224,0.25)" strokeWidth={0.7} fill="none" />
          <Ellipse cx={w*0.78+7} cy={h*0.52+31} rx={8} ry={3} fill="rgba(52,152,100,0.22)" />
        </G>
        <G opacity={0.35}>
          <Rect x={w*0.45} y={h*0.66} width={10} height={22} rx={2} fill="rgba(80,95,110,0.48)" stroke="rgba(120,140,160,0.30)" strokeWidth={1} />
          <Path d={`M ${w*0.45+2} ${h*0.66+5} L ${w*0.45+8} ${h*0.66+5}`} stroke="rgba(168,200,224,0.25)" strokeWidth={0.7} fill="none" />
        </G>

        {/* Layer 6: Lagoon water surface */}
        <Path d={wavePath} stroke="rgba(52,152,219,0.35)" strokeWidth={3} fill="rgba(26,74,107,0.08)" />
        <Path d={wavePath} stroke="rgba(168,200,224,0.15)" strokeWidth={1} fill="none" />
        <Ellipse cx={w*0.25} cy={h*0.85} rx={40} ry={3} fill="rgba(52,152,219,0.12)" />
        <Ellipse cx={w*0.60} cy={h*0.88} rx={35} ry={2.5} fill="rgba(52,152,219,0.10)" />
        <Ellipse cx={w*0.80} cy={h*0.83} rx={30} ry={2} fill="rgba(52,152,219,0.08)" />

        {/* Fog vignette edges */}
        <Rect x={0} y={0} width={w} height={h * 0.06} fill="rgba(168,200,224,0.06)" />
        <Rect x={0} y={h * 0.94} width={w} height={h * 0.06} fill="rgba(168,200,224,0.08)" />

        {/* Mist sparkle dots */}
        <Circle cx={w*0.08} cy={h*0.10} r={2}   fill="rgba(168,200,224,0.38)" />
        <Circle cx={w*0.90} cy={h*0.15} r={2}   fill="rgba(168,200,224,0.35)" />
        <Circle cx={w*0.16} cy={h*0.26} r={1.5} fill="rgba(168,200,224,0.32)" />
        <Circle cx={w*0.80} cy={h*0.34} r={2}   fill="rgba(168,200,224,0.35)" />
        <Circle cx={w*0.06} cy={h*0.50} r={1.5} fill="rgba(168,200,224,0.30)" />
        <Circle cx={w*0.88} cy={h*0.58} r={2}   fill="rgba(168,200,224,0.35)" />
        <Circle cx={w*0.44} cy={h*0.38} r={1.5} fill="rgba(168,200,224,0.32)" />
        <Circle cx={w*0.62} cy={h*0.48} r={1.5} fill="rgba(168,200,224,0.30)" />
        <Circle cx={w*0.32} cy={h*0.62} r={1.5} fill="rgba(168,200,224,0.28)" />
        <Circle cx={w*0.72} cy={h*0.24} r={1.5} fill="rgba(168,200,224,0.30)" />

      </Svg>

      {/* ── Animated overlays ─────────────────────────────── */}

      {/* Misty fog glow breathing at top */}
      <MistGlow width={w} height={h} />

      {/* Fog wisp flash */}
      <FogWisp width={w} height={h} />

      {/* Animated fog drift banks */}
      <FogDrift x={w * 0.00} y={h * 0.15} w={w * 0.65} h={60} delay={0} />
      <FogDrift x={w * 0.35} y={h * 0.32} w={w * 0.55} h={50} delay={1} />
      <FogDrift x={w * 0.05} y={h * 0.52} w={w * 0.70} h={70} delay={2} />
      <FogDrift x={w * 0.20} y={h * 0.70} w={w * 0.60} h={55} delay={3} />
      <FogDrift x={w * 0.00} y={h * 0.88} w={w * 0.75} h={65} delay={1} />
    </>
  );
}

// ─── Island 4: Ember / Ash Background ────────────────────────────────────────
function EmberFloat({ x, delay, color, canvasHeight }: { x: number; delay: number; color: string; canvasHeight: number }) {
  const y = useSharedValue(canvasHeight + 10);
  const opacity = useSharedValue(0);

  useEffect(() => {
    y.value = withRepeat(
      withSequence(
        withTiming(canvasHeight + 10, { duration: 0 }),
        withTiming(-10, { duration: 6000 + delay * 800, easing: Easing.linear })
      ),
      -1, false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay * 600 }),
        withTiming(0.35, { duration: 1200 }),
        withTiming(0.35, { duration: 3000 }),
        withTiming(0, { duration: 1200 })
      ),
      -1, false
    );
    return () => { cancelAnimation(y); cancelAnimation(opacity); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, opacity, y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[{ position: "absolute", left: x, top: 0, width: 4, height: 4, borderRadius: 3, backgroundColor: color }, style]}
      pointerEvents="none"
    />
  );
}

function EmberGlow({ width, height }: { width: number; height: number }) {
  const glow = useSharedValue(0.02);
  useEffect(() => {
    glow.value = withRepeat(withSequence(
      withTiming(0.10, { duration: 4000, easing: Easing.inOut(Easing.quad) }),
      withTiming(0.02, { duration: 4000, easing: Easing.inOut(Easing.quad) }),
    ), -1, true);
    return () => { cancelAnimation(glow); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: glow.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: "absolute", left: 0, top: height * 0.45,
        width, height: height * 0.55,
        backgroundColor: "rgba(231,76,60,1)",
      }, style]}
    />
  );
}

function LavaFlicker({ width, height }: { width: number; height: number }) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    const id = setInterval(() => {
      opacity.value = withSequence(
        withTiming(0.08, { duration: 60 }),
        withTiming(0,    { duration: 80 }),
        withTiming(0.05, { duration: 50 }),
        withTiming(0,    { duration: 100 }),
      );
    }, 5000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", left: 0, top: 0, width, height, backgroundColor: "#e74c3c" }, style]}
    />
  );
}

function EmberBackground({ width, height }: { width: number; height: number }) {
  const w = width;
  const h = height;
  return (
    <>
      <Svg width={w} height={h} style={{ position: "absolute", top: 0, left: 0 }}>
        <Defs>
          {/* Rich dark-red sky gradient */}
          <LinearGradient id="i4Sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%"   stopColor="#0d0505" stopOpacity="1" />
            <Stop offset="18%"  stopColor="#1a0808" stopOpacity="0.90" />
            <Stop offset="38%"  stopColor="#2d1010" stopOpacity="0.82" />
            <Stop offset="60%"  stopColor="#3d1a0a" stopOpacity="0.75" />
            <Stop offset="100%" stopColor="#1a0808" stopOpacity="1" />
          </LinearGradient>
          {/* Ember radial glow from lower center */}
          <RadialGradient id="i4EmberGlow" cx="0.50" cy="0.70" rx="0.55" ry="0.45" fx="0.50" fy="0.70">
            <Stop offset="0%"   stopColor="#e74c3c" stopOpacity="0.20" />
            <Stop offset="40%"  stopColor="#c0392b" stopOpacity="0.10" />
            <Stop offset="75%"  stopColor="#922b21" stopOpacity="0.05" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>
          {/* Horizon fire band */}
          <LinearGradient id="i4HorizonFire" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%"   stopColor="#000000" stopOpacity="0" />
            <Stop offset="35%"  stopColor="#c0392b" stopOpacity="0.18" />
            <Stop offset="55%"  stopColor="#e74c3c" stopOpacity="0.10" />
            <Stop offset="75%"  stopColor="#f39c12" stopOpacity="0.08" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </LinearGradient>
          {/* Magma pool at bottom */}
          <LinearGradient id="i4Magma" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%"   stopColor="#7b1a1a" stopOpacity="0.38" />
            <Stop offset="100%" stopColor="#1a0808" stopOpacity="0.45" />
          </LinearGradient>
        </Defs>

        {/* Base sky */}
        <Rect x={0} y={0} width={w} height={h} fill="url(#i4Sky)" />
        {/* Ember glow bloom */}
        <Rect x={0} y={0} width={w} height={h} fill="url(#i4EmberGlow)" />
        {/* Horizon fire band */}
        <Rect x={0} y={h * 0.45} width={w} height={h * 0.20} fill="url(#i4HorizonFire)" />
        {/* Magma pool base */}
        <Rect x={0} y={h * 0.82} width={w} height={h * 0.18} fill="url(#i4Magma)" />

        {/* ── Volcanic rock silhouettes (4 ranges, back → front) ── */}
        {/* Range 1 — farthest, tallest jagged peaks */}
        <Path
          d={`M0,${h*0.45} L${w*0.05},${h*0.30} L${w*0.10},${h*0.22} L${w*0.14},${h*0.27} L${w*0.18},${h*0.18} L${w*0.23},${h*0.25} L${w*0.28},${h*0.20} L${w*0.34},${h*0.28} L${w*0.40},${h*0.22} L${w*0.46},${h*0.30} L${w*0.52},${h*0.20} L${w*0.58},${h*0.26} L${w*0.64},${h*0.19} L${w*0.70},${h*0.27} L${w*0.76},${h*0.22} L${w*0.82},${h*0.30} L${w*0.88},${h*0.25} L${w*0.94},${h*0.33} L${w},${h*0.45} Z`}
          fill="rgba(30,8,8,0.38)"
        />
        {/* Crater rim on tallest peak (range 1 apex at ~0.52,0.20) */}
        <Path
          d={`M${w*0.48},${h*0.22} Q${w*0.52},${h*0.17} ${w*0.56},${h*0.22}`}
          fill="none" stroke="rgba(180,40,20,0.30)" strokeWidth={2}
        />
        {/* Range 2 — mid-back */}
        <Path
          d={`M0,${h*0.52} L${w*0.06},${h*0.40} L${w*0.12},${h*0.32} L${w*0.18},${h*0.38} L${w*0.24},${h*0.30} L${w*0.30},${h*0.36} L${w*0.36},${h*0.28} L${w*0.42},${h*0.35} L${w*0.48},${h*0.30} L${w*0.54},${h*0.38} L${w*0.60},${h*0.29} L${w*0.66},${h*0.36} L${w*0.72},${h*0.31} L${w*0.78},${h*0.38} L${w*0.84},${h*0.33} L${w*0.90},${h*0.40} L${w},${h*0.52} Z`}
          fill="rgba(25,6,6,0.45)"
        />
        {/* Range 3 — mid-front */}
        <Path
          d={`M0,${h*0.58} L${w*0.08},${h*0.46} L${w*0.15},${h*0.40} L${w*0.22},${h*0.46} L${w*0.30},${h*0.38} L${w*0.38},${h*0.44} L${w*0.45},${h*0.36} L${w*0.52},${h*0.43} L${w*0.60},${h*0.38} L${w*0.67},${h*0.44} L${w*0.74},${h*0.39} L${w*0.82},${h*0.46} L${w*0.90},${h*0.41} L${w},${h*0.58} Z`}
          fill="rgba(20,5,5,0.52)"
        />
        {/* Range 4 — closest foreground rock */}
        <Path
          d={`M0,${h*0.66} L${w*0.06},${h*0.52} L${w*0.14},${h*0.48} L${w*0.20},${h*0.54} L${w*0.28},${h*0.46} L${w*0.36},${h*0.52} L${w*0.44},${h*0.47} L${w*0.52},${h*0.54} L${w*0.60},${h*0.48} L${w*0.68},${h*0.54} L${w*0.76},${h*0.49} L${w*0.84},${h*0.55} L${w*0.92},${h*0.50} L${w},${h*0.66} Z`}
          fill="rgba(15,4,4,0.58)"
        />

        {/* ── Ash cloud formations ── */}
        <Ellipse cx={w*0.22} cy={h*0.22} rx={w*0.20} ry={14} fill="rgba(60,25,20,0.30)" />
        <Ellipse cx={w*0.68} cy={h*0.30} rx={w*0.24} ry={16} fill="rgba(60,25,20,0.28)" />
        <Ellipse cx={w*0.35} cy={h*0.40} rx={w*0.22} ry={12} fill="rgba(60,25,20,0.32)" />
        <Ellipse cx={w*0.78} cy={h*0.52} rx={w*0.18} ry={10} fill="rgba(60,25,20,0.35)" />
        <Ellipse cx={w*0.48} cy={h*0.62} rx={w*0.26} ry={18} fill="rgba(60,25,20,0.38)" />

        {/* ── Lava crack fissures ── */}
        {/* Crack 1 */}
        <Path d={`M${w*0.10},${h*0.55} L${w*0.14},${h*0.60} L${w*0.18},${h*0.58} L${w*0.22},${h*0.64}`}
          fill="none" stroke="rgba(231,76,60,0.52)" strokeWidth={2.2} strokeLinecap="round" />
        <Path d={`M${w*0.10},${h*0.55} L${w*0.14},${h*0.60} L${w*0.18},${h*0.58} L${w*0.22},${h*0.64}`}
          fill="none" stroke="rgba(245,130,80,0.32)" strokeWidth={0.7} strokeLinecap="round" />
        {/* Crack 2 */}
        <Path d={`M${w*0.32},${h*0.58} L${w*0.36},${h*0.63} L${w*0.40},${h*0.61} L${w*0.44},${h*0.67}`}
          fill="none" stroke="rgba(231,76,60,0.48)" strokeWidth={1.8} strokeLinecap="round" />
        <Path d={`M${w*0.32},${h*0.58} L${w*0.36},${h*0.63} L${w*0.40},${h*0.61} L${w*0.44},${h*0.67}`}
          fill="none" stroke="rgba(245,130,80,0.28)" strokeWidth={0.7} strokeLinecap="round" />
        {/* Crack 3 */}
        <Path d={`M${w*0.52},${h*0.54} L${w*0.55},${h*0.59} L${w*0.58},${h*0.57} L${w*0.62},${h*0.63} L${w*0.64},${h*0.70}`}
          fill="none" stroke="rgba(231,76,60,0.55)" strokeWidth={2.5} strokeLinecap="round" />
        <Path d={`M${w*0.52},${h*0.54} L${w*0.55},${h*0.59} L${w*0.58},${h*0.57} L${w*0.62},${h*0.63} L${w*0.64},${h*0.70}`}
          fill="none" stroke="rgba(245,130,80,0.35)" strokeWidth={0.7} strokeLinecap="round" />
        {/* Crack 4 */}
        <Path d={`M${w*0.72},${h*0.57} L${w*0.76},${h*0.62} L${w*0.80},${h*0.60}`}
          fill="none" stroke="rgba(231,76,60,0.45)" strokeWidth={1.5} strokeLinecap="round" />
        <Path d={`M${w*0.72},${h*0.57} L${w*0.76},${h*0.62} L${w*0.80},${h*0.60}`}
          fill="none" stroke="rgba(245,130,80,0.28)" strokeWidth={0.7} strokeLinecap="round" />
        {/* Crack 5 */}
        <Path d={`M${w*0.86},${h*0.60} L${w*0.90},${h*0.65} L${w*0.94},${h*0.63} L${w*0.97},${h*0.68}`}
          fill="none" stroke="rgba(231,76,60,0.50)" strokeWidth={2.0} strokeLinecap="round" />
        <Path d={`M${w*0.86},${h*0.60} L${w*0.90},${h*0.65} L${w*0.94},${h*0.63} L${w*0.97},${h*0.68}`}
          fill="none" stroke="rgba(245,130,80,0.30)" strokeWidth={0.7} strokeLinecap="round" />

        {/* ── Fire geysers / ember plumes ── */}
        {/* Geyser 1 */}
        <G opacity={0.50}>
          <Path d={`M${w*0.18},${h*0.48} Q${w*0.19},${h*0.38} ${w*0.18},${h*0.30}`}
            fill="none" stroke="rgba(180,40,20,0.42)" strokeWidth={4} strokeLinecap="round" />
          <Circle cx={w*0.18} cy={h*0.30} r={14} fill="rgba(231,76,60,0.22)" />
          <Circle cx={w*0.18} cy={h*0.30} r={5}  fill="rgba(245,130,80,0.48)" />
        </G>
        {/* Geyser 2 */}
        <G opacity={0.45}>
          <Path d={`M${w*0.44},${h*0.46} Q${w*0.45},${h*0.35} ${w*0.44},${h*0.26}`}
            fill="none" stroke="rgba(180,40,20,0.40)" strokeWidth={5} strokeLinecap="round" />
          <Circle cx={w*0.44} cy={h*0.26} r={16} fill="rgba(231,76,60,0.25)" />
          <Circle cx={w*0.44} cy={h*0.26} r={7}  fill="rgba(245,130,80,0.48)" />
        </G>
        {/* Geyser 3 */}
        <G opacity={0.52}>
          <Path d={`M${w*0.68},${h*0.50} Q${w*0.69},${h*0.38} ${w*0.68},${h*0.28}`}
            fill="none" stroke="rgba(180,40,20,0.44)" strokeWidth={4} strokeLinecap="round" />
          <Circle cx={w*0.68} cy={h*0.28} r={12} fill="rgba(231,76,60,0.22)" />
          <Circle cx={w*0.68} cy={h*0.28} r={5}  fill="rgba(245,130,80,0.48)" />
        </G>
        {/* Geyser 4 */}
        <G opacity={0.42}>
          <Path d={`M${w*0.88},${h*0.48} Q${w*0.89},${h*0.36} ${w*0.88},${h*0.24}`}
            fill="none" stroke="rgba(180,40,20,0.38)" strokeWidth={3} strokeLinecap="round" />
          <Circle cx={w*0.88} cy={h*0.24} r={10} fill="rgba(231,76,60,0.20)" />
          <Circle cx={w*0.88} cy={h*0.24} r={4}  fill="rgba(245,130,80,0.45)" />
        </G>

        {/* ── Lava pool wave at bottom ── */}
        <Path
          d={`M0,${h*0.82} Q${w*0.12},${h*0.79} ${w*0.25},${h*0.82} Q${w*0.38},${h*0.85} ${w*0.50},${h*0.82} Q${w*0.62},${h*0.79} ${w*0.75},${h*0.82} Q${w*0.88},${h*0.85} ${w},${h*0.82}`}
          fill="rgba(100,20,10,0.12)" stroke="rgba(231,76,60,0.45)" strokeWidth={3}
        />
        <Path
          d={`M0,${h*0.83} Q${w*0.15},${h*0.80} ${w*0.30},${h*0.83} Q${w*0.45},${h*0.86} ${w*0.60},${h*0.83} Q${w*0.75},${h*0.80} ${w},${h*0.83}`}
          fill="none" stroke="rgba(245,160,80,0.20)" strokeWidth={1}
        />
        {/* Lava reflection ripples */}
        <Ellipse cx={w*0.25} cy={h*0.87} rx={w*0.10} ry={4} fill="rgba(231,76,60,0.12)" />
        <Ellipse cx={w*0.55} cy={h*0.90} rx={w*0.12} ry={5} fill="rgba(231,76,60,0.10)" />
        <Ellipse cx={w*0.80} cy={h*0.86} rx={w*0.08} ry={3} fill="rgba(231,76,60,0.15)" />

        {/* ── Vignette edges ── */}
        <Rect x={0} y={0} width={w*0.06} height={h} fill="rgba(231,76,60,0.06)" />
        <Rect x={w*0.94} y={0} width={w*0.06} height={h} fill="rgba(231,76,60,0.06)" />
        <Rect x={0} y={0} width={w} height={h*0.04} fill="rgba(231,76,60,0.08)" />

        {/* ── Ember spark dots ── */}
        <Circle cx={w*0.08} cy={h*0.14} r={2.0} fill="rgba(231,76,60,0.42)" />
        <Circle cx={w*0.22} cy={h*0.24} r={1.5} fill="rgba(231,76,60,0.38)" />
        <Circle cx={w*0.41} cy={h*0.18} r={2.5} fill="rgba(231,76,60,0.45)" />
        <Circle cx={w*0.57} cy={h*0.32} r={1.5} fill="rgba(231,76,60,0.40)" />
        <Circle cx={w*0.73} cy={h*0.14} r={2.0} fill="rgba(231,76,60,0.43)" />
        <Circle cx={w*0.85} cy={h*0.28} r={1.5} fill="rgba(231,76,60,0.38)" />
        <Circle cx={w*0.15} cy={h*0.48} r={2.0} fill="rgba(231,76,60,0.36)" />
        <Circle cx={w*0.35} cy={h*0.56} r={1.5} fill="rgba(231,76,60,0.42)" />
        <Circle cx={w*0.63} cy={h*0.50} r={2.5} fill="rgba(231,76,60,0.48)" />
        <Circle cx={w*0.80} cy={h*0.42} r={2.0} fill="rgba(231,76,60,0.40)" />
        <Circle cx={w*0.92} cy={h*0.60} r={1.5} fill="rgba(231,76,60,0.35)" />
        <Circle cx={w*0.48} cy={h*0.74} r={2.0} fill="rgba(231,76,60,0.45)" />

      </Svg>

      {/* Animated ember glow + lava flicker overlays */}
      <EmberGlow width={w} height={h} />
      <LavaFlicker width={w} height={h} />

      {/* Animated ember floats rising from below */}
      <EmberFloat x={width * 0.12} delay={0} color="rgba(231,76,60,0.35)" canvasHeight={height} />
      <EmberFloat x={width * 0.34} delay={2} color="rgba(200,80,40,0.35)" canvasHeight={height} />
      <EmberFloat x={width * 0.55} delay={1} color="rgba(231,76,60,0.35)" canvasHeight={height} />
      <EmberFloat x={width * 0.72} delay={3} color="rgba(245,130,80,0.35)" canvasHeight={height} />
      <EmberFloat x={width * 0.88} delay={1} color="rgba(231,76,60,0.35)" canvasHeight={height} />
    </>
  );
}

// ─── Island 5: Scattered Records Background ──────────────────────────────────
function ScatterDrift({ char, x, startY, angle, delay }: { char: string; x: number; startY: number; angle: number; delay: number }) {
  const y = useSharedValue(startY);
  const opacity = useSharedValue(0);

  useEffect(() => {
    y.value = withRepeat(
      withSequence(
        withTiming(startY, { duration: 0 }),
        withTiming(startY - 150, { duration: 9000 + delay * 700, easing: Easing.linear })
      ),
      -1, false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay * 800 }),
        withTiming(0.30, { duration: 2000 }),
        withTiming(0.30, { duration: 4000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1, false
    );
    return () => { cancelAnimation(y); cancelAnimation(opacity); };
  }, [delay, opacity, startY, y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { rotate: `${angle}deg` }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[{ position: "absolute", left: x, top: 0 }, style]} pointerEvents="none">
      <Text style={{ color: "#e67e22", fontSize: 13, fontWeight: "bold" }}>{char}</Text>
    </Animated.View>
  );
}

function LighthouseBeam({ width, height }: { width: number; height: number }) {
  const glow = useSharedValue(0.03);
  useEffect(() => {
    glow.value = withRepeat(withSequence(
      withTiming(0.08, { duration: 8000, easing: Easing.inOut(Easing.quad) }),
      withTiming(0.03, { duration: 8000, easing: Easing.inOut(Easing.quad) }),
    ), -1, true);
    return () => { cancelAnimation(glow); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: glow.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: "absolute", right: 0, top: 0,
        width: width * 0.60, height: height * 0.50,
        backgroundColor: "rgba(230,126,34,1)",
        borderBottomLeftRadius: height * 0.50,
      }, style]}
    />
  );
}

function RecordFlicker({ width, height }: { width: number; height: number }) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    const id = setInterval(() => {
      opacity.value = withSequence(
        withTiming(0.07, { duration: 70 }),
        withTiming(0,    { duration: 90 }),
        withTiming(0.04, { duration: 60 }),
        withTiming(0,    { duration: 110 }),
      );
    }, 6000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", left: 0, top: 0, width, height, backgroundColor: "#e67e22" }, style]}
    />
  );
}

function ScatteredBackground({ width, height }: { width: number; height: number }) {
  const w = width;
  const h = height;
  return (
    <>
      <Svg width={w} height={h} style={{ position: "absolute", top: 0, left: 0 }}>
        <Defs>
          {/* Rich dark-amber sky */}
          <LinearGradient id="i5Sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%"   stopColor="#080400" stopOpacity="1" />
            <Stop offset="20%"  stopColor="#130900" stopOpacity="0.88" />
            <Stop offset="40%"  stopColor="#1e0d00" stopOpacity="0.80" />
            <Stop offset="65%"  stopColor="#2a1200" stopOpacity="0.72" />
            <Stop offset="100%" stopColor="#150a00" stopOpacity="1" />
          </LinearGradient>
          {/* Lighthouse radial glow from top-right */}
          <RadialGradient id="i5LighthouseGlow" cx="0.85" cy="0.12" rx="0.55" ry="0.45" fx="0.85" fy="0.12">
            <Stop offset="0%"   stopColor="#e67e22" stopOpacity="0.18" />
            <Stop offset="40%"  stopColor="#d35400" stopOpacity="0.10" />
            <Stop offset="75%"  stopColor="#a84300" stopOpacity="0.05" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>
          {/* Harbour fog band at horizon */}
          <LinearGradient id="i5HarborFog" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%"   stopColor="#000000" stopOpacity="0" />
            <Stop offset="40%"  stopColor="#e67e22" stopOpacity="0.12" />
            <Stop offset="60%"  stopColor="#d35400" stopOpacity="0.08" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </LinearGradient>
          {/* Harbour water glow */}
          <LinearGradient id="i5WaterGlow" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%"   stopColor="#3d1a00" stopOpacity="0.30" />
            <Stop offset="100%" stopColor="#150a00" stopOpacity="0.40" />
          </LinearGradient>
        </Defs>

        {/* Base sky */}
        <Rect x={0} y={0} width={w} height={h} fill="url(#i5Sky)" />
        {/* Lighthouse glow */}
        <Rect x={0} y={0} width={w} height={h} fill="url(#i5LighthouseGlow)" />
        {/* Harbour fog band */}
        <Rect x={0} y={h * 0.48} width={w} height={h * 0.18} fill="url(#i5HarborFog)" />
        {/* Water base */}
        <Rect x={0} y={h * 0.80} width={w} height={h * 0.20} fill="url(#i5WaterGlow)" />

        {/* ── Lighthouse structure (top-right) ── */}
        {/* Beacon bloom */}
        <Circle cx={w*0.84} cy={h*0.12} r={22} fill="rgba(230,126,34,0.14)" />
        <Circle cx={w*0.84} cy={h*0.12} r={12} fill="rgba(230,126,34,0.22)" />
        {/* Beam fan lines */}
        <Path d={`M${w*0.84},${h*0.12} L${w*0.10},${h*0.58}`}
          stroke="rgba(230,126,34,0.15)" strokeWidth={18} strokeLinecap="round" />
        <Path d={`M${w*0.84},${h*0.12} L${w*0.30},${h*0.70}`}
          stroke="rgba(230,126,34,0.12)" strokeWidth={12} strokeLinecap="round" />
        {/* Lighthouse shaft */}
        <Path d={`M${w*0.82},${h*0.12} L${w*0.80},${h*0.60} L${w*0.88},${h*0.60} L${w*0.86},${h*0.12} Z`}
          fill="rgba(40,20,5,0.55)" />
        {/* Beacon housing */}
        <Circle cx={w*0.84} cy={h*0.12} r={10} fill="rgba(230,126,34,0.48)" />
        <Circle cx={w*0.84} cy={h*0.12} r={5}  fill="rgba(245,197,24,0.65)" />

        {/* ── Harbour stone wall ranges (back → front) ── */}
        {/* Range 1 — farthest back */}
        <Path
          d={`M0,${h*0.55} L${w*0.08},${h*0.42} L${w*0.16},${h*0.38} L${w*0.24},${h*0.44} L${w*0.32},${h*0.36} L${w*0.40},${h*0.42} L${w*0.50},${h*0.35} L${w*0.60},${h*0.41} L${w*0.68},${h*0.36} L${w*0.75},${h*0.43} L${w*0.83},${h*0.38} L${w},${h*0.55} Z`}
          fill="rgba(35,15,0,0.38)"
        />
        {/* Range 2 — mid */}
        <Path
          d={`M0,${h*0.60} L${w*0.06},${h*0.48} L${w*0.14},${h*0.44} L${w*0.22},${h*0.50} L${w*0.30},${h*0.44} L${w*0.38},${h*0.50} L${w*0.46},${h*0.45} L${w*0.55},${h*0.51} L${w*0.63},${h*0.46} L${w*0.72},${h*0.52} L${w*0.80},${h*0.47} L${w*0.90},${h*0.54} L${w},${h*0.60} Z`}
          fill="rgba(28,12,0,0.45)"
        />
        {/* Range 3 — front dock */}
        <Path
          d={`M0,${h*0.68} L${w*0.08},${h*0.55} L${w*0.18},${h*0.52} L${w*0.28},${h*0.56} L${w*0.38},${h*0.52} L${w*0.48},${h*0.57} L${w*0.58},${h*0.53} L${w*0.68},${h*0.58} L${w*0.78},${h*0.54} L${w*0.88},${h*0.59} L${w},${h*0.68} Z`}
          fill="rgba(22,10,0,0.52)"
        />

        {/* ── Dock bollards ── */}
        <Rect x={w*0.10} y={h*0.56} width={4} height={10} rx={1} fill="rgba(230,126,34,0.35)" />
        <Rect x={w*0.28} y={h*0.54} width={4} height={10} rx={1} fill="rgba(230,126,34,0.35)" />
        <Rect x={w*0.50} y={h*0.57} width={4} height={10} rx={1} fill="rgba(230,126,34,0.35)" />
        <Rect x={w*0.70} y={h*0.55} width={4} height={10} rx={1} fill="rgba(230,126,34,0.35)" />

        {/* ── Harbour crates ── */}
        <Rect x={w*0.14} y={h*0.57} width={18} height={12} rx={2} fill="rgba(45,20,5,0.42)" stroke="rgba(230,126,34,0.22)" strokeWidth={0.8} />
        <Rect x={w*0.14} y={h*0.52} width={14} height={10} rx={2} fill="rgba(45,20,5,0.48)" stroke="rgba(230,126,34,0.22)" strokeWidth={0.8} />
        <Rect x={w*0.34} y={h*0.55} width={20} height={12} rx={2} fill="rgba(50,22,5,0.45)" stroke="rgba(230,126,34,0.20)" strokeWidth={0.8} />
        <Rect x={w*0.55} y={h*0.57} width={16} height={11} rx={2} fill="rgba(45,20,5,0.50)" stroke="rgba(230,126,34,0.22)" strokeWidth={0.8} />
        <Rect x={w*0.60} y={h*0.53} width={12} height={10} rx={2} fill="rgba(50,22,5,0.42)" stroke="rgba(230,126,34,0.18)" strokeWidth={0.8} />

        {/* ── Ledger grid lines (boosted to 0.20) ── */}
        {[0.30, 0.42, 0.56, 0.68, 0.78].map((yf, i) => (
          <Path key={`hy${i}`} d={`M0,${h * yf} L${w},${h * yf}`} stroke="rgba(230,126,34,0.20)" strokeWidth={0.8} />
        ))}
        {[0.25, 0.55, 0.78].map((xf, i) => (
          <Path key={`vx${i}`} d={`M${w * xf},${h*0.30} L${w * xf},${h*0.80}`} stroke="rgba(230,126,34,0.15)" strokeWidth={0.6} />
        ))}

        {/* ── Ledger page fragments (5 tilted rects with inner lines) ── */}
        {/* Fragment 1 */}
        <G transform={`rotate(-12, ${w*0.18}, ${h*0.28})`}>
          <Rect x={w*0.08} y={h*0.22} width={w*0.20} height={h*0.12} rx={2}
            fill="rgba(40,18,0,0.32)" stroke="rgba(230,126,34,0.38)" strokeWidth={0.8} />
          <Path d={`M${w*0.10},${h*0.26} L${w*0.27},${h*0.26}`} stroke="rgba(230,126,34,0.18)" strokeWidth={0.5} />
          <Path d={`M${w*0.10},${h*0.29} L${w*0.27},${h*0.29}`} stroke="rgba(230,126,34,0.18)" strokeWidth={0.5} />
          <Path d={`M${w*0.10},${h*0.32} L${w*0.27},${h*0.32}`} stroke="rgba(230,126,34,0.18)" strokeWidth={0.5} />
        </G>
        {/* Fragment 2 */}
        <G transform={`rotate(8, ${w*0.55}, ${h*0.32})`}>
          <Rect x={w*0.46} y={h*0.25} width={w*0.18} height={h*0.14} rx={2}
            fill="rgba(40,18,0,0.28)" stroke="rgba(230,126,34,0.42)" strokeWidth={0.8} />
          <Path d={`M${w*0.48},${h*0.30} L${w*0.63},${h*0.30}`} stroke="rgba(230,126,34,0.18)" strokeWidth={0.5} />
          <Path d={`M${w*0.48},${h*0.33} L${w*0.63},${h*0.33}`} stroke="rgba(230,126,34,0.18)" strokeWidth={0.5} />
          <Path d={`M${w*0.48},${h*0.36} L${w*0.63},${h*0.36}`} stroke="rgba(230,126,34,0.18)" strokeWidth={0.5} />
        </G>
        {/* Fragment 3 */}
        <G transform={`rotate(-6, ${w*0.35}, ${h*0.48})`}>
          <Rect x={w*0.26} y={h*0.42} width={w*0.18} height={h*0.12} rx={2}
            fill="rgba(40,18,0,0.38)" stroke="rgba(230,126,34,0.35)" strokeWidth={0.8} />
          <Path d={`M${w*0.28},${h*0.46} L${w*0.43},${h*0.46}`} stroke="rgba(230,126,34,0.18)" strokeWidth={0.5} />
          <Path d={`M${w*0.28},${h*0.49} L${w*0.43},${h*0.49}`} stroke="rgba(230,126,34,0.18)" strokeWidth={0.5} />
          <Path d={`M${w*0.28},${h*0.52} L${w*0.43},${h*0.52}`} stroke="rgba(230,126,34,0.18)" strokeWidth={0.5} />
          <Path d={`M${w*0.28},${h*0.55} L${w*0.43},${h*0.55}`} stroke="rgba(230,126,34,0.18)" strokeWidth={0.5} />
        </G>
        {/* Fragment 4 */}
        <G transform={`rotate(15, ${w*0.70}, ${h*0.42})`}>
          <Rect x={w*0.62} y={h*0.36} width={w*0.16} height={h*0.12} rx={2}
            fill="rgba(40,18,0,0.30)" stroke="rgba(230,126,34,0.40)" strokeWidth={0.8} />
          <Path d={`M${w*0.64},${h*0.40} L${w*0.77},${h*0.40}`} stroke="rgba(230,126,34,0.18)" strokeWidth={0.5} />
          <Path d={`M${w*0.64},${h*0.43} L${w*0.77},${h*0.43}`} stroke="rgba(230,126,34,0.18)" strokeWidth={0.5} />
          <Path d={`M${w*0.64},${h*0.46} L${w*0.77},${h*0.46}`} stroke="rgba(230,126,34,0.18)" strokeWidth={0.5} />
        </G>
        {/* Fragment 5 */}
        <G transform={`rotate(-18, ${w*0.22}, ${h*0.62})`}>
          <Rect x={w*0.12} y={h*0.56} width={w*0.20} height={h*0.12} rx={2}
            fill="rgba(40,18,0,0.35)" stroke="rgba(230,126,34,0.42)" strokeWidth={0.8} />
          <Path d={`M${w*0.14},${h*0.60} L${w*0.31},${h*0.60}`} stroke="rgba(230,126,34,0.18)" strokeWidth={0.5} />
          <Path d={`M${w*0.14},${h*0.63} L${w*0.31},${h*0.63}`} stroke="rgba(230,126,34,0.18)" strokeWidth={0.5} />
          <Path d={`M${w*0.14},${h*0.66} L${w*0.31},${h*0.66}`} stroke="rgba(230,126,34,0.18)" strokeWidth={0.5} />
        </G>

        {/* ── Precision data symbols (boosted to 0.50-0.62) ── */}
        <SvgText x={w*0.06} y={h*0.16} fontSize={12} fill="rgba(230,126,34,0.55)" fontStyle="italic" fontWeight="600" transform={`rotate(-14, ${w*0.06}, ${h*0.16})`}>42</SvgText>
        <SvgText x={w*0.28} y={h*0.24} fontSize={11} fill="rgba(230,126,34,0.52)" fontStyle="italic" fontWeight="600" transform={`rotate(10, ${w*0.28}, ${h*0.24})`}>3rd</SvgText>
        <SvgText x={w*0.55} y={h*0.20} fontSize={12} fill="rgba(230,126,34,0.58)" fontStyle="italic" fontWeight="600" transform={`rotate(-8, ${w*0.55}, ${h*0.20})`}>A?</SvgText>
        <SvgText x={w*0.78} y={h*0.32} fontSize={11} fill="rgba(230,126,34,0.52)" fontStyle="italic" fontWeight="600" transform={`rotate(16, ${w*0.78}, ${h*0.32})`}>No.</SvgText>
        <SvgText x={w*0.15} y={h*0.50} fontSize={13} fill="rgba(230,126,34,0.50)" fontStyle="italic" fontWeight="600" transform={`rotate(-20, ${w*0.15}, ${h*0.50})`}>§</SvgText>
        <SvgText x={w*0.44} y={h*0.62} fontSize={11} fill="rgba(230,126,34,0.55)" fontStyle="italic" fontWeight="600" transform={`rotate(6, ${w*0.44}, ${h*0.62})`}>±</SvgText>
        <SvgText x={w*0.70} y={h*0.72} fontSize={12} fill="rgba(230,126,34,0.58)" fontStyle="italic" fontWeight="600" transform={`rotate(-12, ${w*0.70}, ${h*0.72})`}>%</SvgText>
        <SvgText x={w*0.88} y={h*0.48} fontSize={12} fill="rgba(230,126,34,0.55)" fontStyle="italic" fontWeight="600" transform={`rotate(22, ${w*0.88}, ${h*0.48})`}>{">"}</SvgText>
        <SvgText x={w*0.38} y={h*0.38} fontSize={10} fill="rgba(230,126,34,0.60)" fontStyle="italic" fontWeight="600" transform={`rotate(-5, ${w*0.38}, ${h*0.38})`}>1st</SvgText>
        <SvgText x={w*0.64} y={h*0.18} fontSize={11} fill="rgba(230,126,34,0.52)" fontStyle="italic" fontWeight="600" transform={`rotate(18, ${w*0.64}, ${h*0.18})`}>B.</SvgText>
        <SvgText x={w*0.05} y={h*0.75} fontSize={14} fill="rgba(230,126,34,0.62)" fontStyle="italic" fontWeight="600" transform={`rotate(-10, ${w*0.05}, ${h*0.75})`}>?</SvgText>
        <SvgText x={w*0.48} y={h*0.82} fontSize={11} fill="rgba(230,126,34,0.50)" fontStyle="italic" fontWeight="600" transform={`rotate(8, ${w*0.48}, ${h*0.82})`}>C.</SvgText>
        <SvgText x={w*0.82} y={h*0.65} fontSize={10} fill="rgba(230,126,34,0.55)" fontStyle="italic" fontWeight="600" transform={`rotate(-16, ${w*0.82}, ${h*0.65})`}>!</SvgText>
        <SvgText x={w*0.22} y={h*0.86} fontSize={12} fill="rgba(230,126,34,0.58)" fontStyle="italic" fontWeight="600" transform={`rotate(12, ${w*0.22}, ${h*0.86})`}>7</SvgText>
        <SvgText x={w*0.92} y={h*0.28} fontSize={13} fill="rgba(230,126,34,0.60)" fontStyle="italic" fontWeight="600" transform={`rotate(-22, ${w*0.92}, ${h*0.28})`}>D?</SvgText>

        {/* ── Harbour water wave ── */}
        <Path
          d={`M0,${h*0.80} Q${w*0.12},${h*0.77} ${w*0.25},${h*0.80} Q${w*0.38},${h*0.83} ${w*0.50},${h*0.80} Q${w*0.62},${h*0.77} ${w*0.75},${h*0.80} Q${w*0.88},${h*0.83} ${w},${h*0.80}`}
          fill="rgba(40,15,0,0.10)" stroke="rgba(230,126,34,0.38)" strokeWidth={2.5}
        />
        <Path
          d={`M0,${h*0.81} Q${w*0.15},${h*0.78} ${w*0.30},${h*0.81} Q${w*0.45},${h*0.84} ${w*0.60},${h*0.81} Q${w*0.75},${h*0.78} ${w},${h*0.81}`}
          fill="none" stroke="rgba(245,197,24,0.15)" strokeWidth={0.8}
        />
        {/* Lighthouse reflection on water */}
        <Ellipse cx={w*0.84} cy={h*0.86} rx={w*0.04} ry={18} fill="rgba(230,126,34,0.18)" />
        <Ellipse cx={w*0.84} cy={h*0.88} rx={w*0.06} ry={8}  fill="rgba(230,126,34,0.14)" />
        <Ellipse cx={w*0.84} cy={h*0.91} rx={w*0.08} ry={5}  fill="rgba(230,126,34,0.10)" />
        {/* Harbour ripples */}
        <Ellipse cx={w*0.25} cy={h*0.88} rx={w*0.10} ry={4} fill="rgba(230,126,34,0.10)" />
        <Ellipse cx={w*0.55} cy={h*0.91} rx={w*0.12} ry={5} fill="rgba(230,126,34,0.08)" />
        <Ellipse cx={w*0.40} cy={h*0.86} rx={w*0.08} ry={3} fill="rgba(230,126,34,0.12)" />

        {/* ── Vignette edges ── */}
        <Rect x={0} y={0} width={w*0.06} height={h} fill="rgba(230,126,34,0.05)" />
        <Rect x={w*0.94} y={0} width={w*0.06} height={h} fill="rgba(230,126,34,0.05)" />
        <Rect x={0} y={0} width={w} height={h*0.04} fill="rgba(230,126,34,0.08)" />

        {/* ── Precision spark dots ── */}
        <Circle cx={w*0.08} cy={h*0.10} r={2.0} fill="rgba(230,126,34,0.40)" />
        <Circle cx={w*0.22} cy={h*0.20} r={1.5} fill="rgba(230,126,34,0.38)" />
        <Circle cx={w*0.42} cy={h*0.14} r={2.5} fill="rgba(230,126,34,0.42)" />
        <Circle cx={w*0.58} cy={h*0.28} r={1.5} fill="rgba(230,126,34,0.38)" />
        <Circle cx={w*0.74} cy={h*0.10} r={2.0} fill="rgba(230,126,34,0.40)" />
        <Circle cx={w*0.16} cy={h*0.44} r={2.0} fill="rgba(230,126,34,0.35)" />
        <Circle cx={w*0.36} cy={h*0.52} r={1.5} fill="rgba(230,126,34,0.40)" />
        <Circle cx={w*0.64} cy={h*0.46} r={2.0} fill="rgba(230,126,34,0.45)" />
        <Circle cx={w*0.90} cy={h*0.36} r={1.5} fill="rgba(230,126,34,0.38)" />
        <Circle cx={w*0.48} cy={h*0.74} r={2.0} fill="rgba(230,126,34,0.42)" />

      </Svg>

      {/* Lighthouse beam + record flicker overlays */}
      <LighthouseBeam width={w} height={h} />
      <RecordFlicker width={w} height={h} />

      {/* Animated scatter drifts */}
      <ScatterDrift char="7"  x={width * 0.08} startY={height * 0.75} angle={-18} delay={0} />
      <ScatterDrift char="B"  x={width * 0.25} startY={height * 0.60} angle={12}  delay={1} />
      <ScatterDrift char="?"  x={width * 0.45} startY={height * 0.82} angle={-8}  delay={2} />
      <ScatterDrift char="42" x={width * 0.62} startY={height * 0.50} angle={22}  delay={3} />
      <ScatterDrift char="C"  x={width * 0.78} startY={height * 0.70} angle={-15} delay={1} />
      <ScatterDrift char="!"  x={width * 0.90} startY={height * 0.88} angle={10}  delay={4} />
    </>
  );
}

// ─── Island 6: Story Fragments Background ─────────────────────────────────────
function ScrollDrift({ x, delay, rotation, canvasHeight }: { x: number; delay: number; rotation: number; canvasHeight: number }) {
  const y = useSharedValue(-40);
  const opacity = useSharedValue(0);

  useEffect(() => {
    y.value = withRepeat(
      withSequence(
        withTiming(-40, { duration: 0 }),
        withTiming(canvasHeight + 40, { duration: 14000 + delay * 1200, easing: Easing.linear })
      ),
      -1, false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay * 900 }),
        withTiming(0.32, { duration: 2000 }),
        withTiming(0.32, { duration: 8000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1, false
    );
    return () => { cancelAnimation(y); cancelAnimation(opacity); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, opacity, y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { rotate: `${rotation}deg` }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[{
        position: "absolute",
        left: x,
        top: 0,
        width: 44,
        height: 26,
        backgroundColor: "#f4e4c1",
        borderRadius: 3,
        borderWidth: 1,
        borderColor: "#1abc9c",
      }, style]}
      pointerEvents="none"
    />
  );
}

function StoryPulse({ w, h }: { w: number; h: number }) {
  const pulse = useSharedValue(0.03);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.10, { duration: 6000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.03, { duration: 6000, easing: Easing.inOut(Easing.quad) })
      ),
      -1, false
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return (
    <Animated.View
      style={[{
        position: "absolute",
        left: w * 0.20, top: h * 0.55,
        width: w * 0.60, height: h * 0.25,
        borderRadius: w * 0.30,
        backgroundColor: "rgba(26,188,156,1)",
      }, style]}
      pointerEvents="none"
    />
  );
}

function NarrativeFlicker({ w, h }: { w: number; h: number }) {
  const flash = useSharedValue(0);
  useEffect(() => {
    const id = setInterval(() => {
      flash.value = withSequence(
        withTiming(0.07, { duration: 80 }),
        withTiming(0,    { duration: 100 }),
        withTiming(0.04, { duration: 60 }),
        withTiming(0,    { duration: 120 })
      );
    }, 6000);
    return () => clearInterval(id);
  }, [flash]);
  const style = useAnimatedStyle(() => ({ opacity: flash.value }));
  return (
    <Animated.View
      style={[{
        position: "absolute", left: 0, top: 0,
        width: w, height: h,
        backgroundColor: "#1abc9c",
      }, style]}
      pointerEvents="none"
    />
  );
}

function StoryBackground({ width: w, height: h }: { width: number; height: number }) {
  return (
    <>
      <Svg width={w} height={h} style={{ position: "absolute", top: 0, left: 0 }}>
        <Defs>
          <LinearGradient id="i6Sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%"   stopColor="#020d0b" stopOpacity={1} />
            <Stop offset="15%"  stopColor="#051510" stopOpacity={0.92} />
            <Stop offset="35%"  stopColor="#041210" stopOpacity={0.85} />
            <Stop offset="55%"  stopColor="#061814" stopOpacity={0.80} />
            <Stop offset="75%"  stopColor="#041210" stopOpacity={0.88} />
            <Stop offset="100%" stopColor="#030e0c" stopOpacity={1} />
          </LinearGradient>
          <RadialGradient id="i6WaterGlow" cx="0.50" cy="0.60" r="0.55" fx="0.50" fy="0.60" gradientUnits="objectBoundingBox">
            <Stop offset="0%"   stopColor="#1abc9c" stopOpacity={0.16} />
            <Stop offset="40%"  stopColor="#148f77" stopOpacity={0.08} />
            <Stop offset="70%"  stopColor="#0d6b56" stopOpacity={0.04} />
            <Stop offset="100%" stopColor="#020d0b" stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id="i6FogBand" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%"   stopColor="#1abc9c" stopOpacity={0} />
            <Stop offset="40%"  stopColor="#1abc9c" stopOpacity={0.08} />
            <Stop offset="60%"  stopColor="#0e8a72" stopOpacity={0.06} />
            <Stop offset="100%" stopColor="#1abc9c" stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="i6LibraryGround" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%"   stopColor="#1a3028" stopOpacity={0.38} />
            <Stop offset="100%" stopColor="#0a1e16" stopOpacity={0.48} />
          </LinearGradient>
        </Defs>

        {/* Base layers */}
        <Rect x={0} y={0} width={w} height={h} fill="url(#i6Sky)" />
        <Rect x={0} y={0} width={w} height={h} fill="url(#i6WaterGlow)" />
        <Rect x={0} y={h * 0.40} width={w} height={h * 0.30} fill="url(#i6FogBand)" />
        <Rect x={0} y={h * 0.72} width={w} height={h * 0.28} fill="url(#i6LibraryGround)" />

        {/* Stone shelf silhouettes */}
        <Rect x={0} y={h * 0.30} width={w} height={6} rx={0} fill="rgba(20,60,45,0.38)" />
        <Rect x={0} y={h * 0.48} width={w} height={8} fill="rgba(20,60,45,0.42)" />
        <Rect x={0} y={h * 0.65} width={w} height={10} fill="rgba(20,60,45,0.45)" />

        {/* Stone column supports */}
        <Rect x={w * 0.08}  y={h * 0.20} width={10} height={h * 0.50} fill="rgba(15,50,38,0.48)" />
        <Rect x={w * 0.35}  y={h * 0.25} width={8}  height={h * 0.45} fill="rgba(15,50,38,0.42)" />
        <Rect x={w * 0.62}  y={h * 0.25} width={8}  height={h * 0.45} fill="rgba(15,50,38,0.42)" />
        <Rect x={w * 0.88}  y={h * 0.20} width={10} height={h * 0.50} fill="rgba(15,50,38,0.45)" />

        {/* Water surface ripple at h*0.68 */}
        <Path
          d={`M 0 ${h * 0.68} Q ${w * 0.25} ${h * 0.665} ${w * 0.50} ${h * 0.68} Q ${w * 0.75} ${h * 0.695} ${w} ${h * 0.68}`}
          stroke="rgba(26,188,156,0.22)" strokeWidth={1.5} fill="none"
        />
        <Ellipse cx={w * 0.50} cy={h * 0.70} rx={w * 0.35} ry={h * 0.04}
          fill="rgba(26,188,156,0.10)" stroke="rgba(26,188,156,0.20)" strokeWidth={1} />
        <Circle cx={w * 0.50} cy={h * 0.70} r={30} fill="none" stroke="rgba(26,188,156,0.14)" strokeWidth={1} />
        <Circle cx={w * 0.50} cy={h * 0.70} r={60} fill="none" stroke="rgba(26,188,156,0.10)" strokeWidth={1} />
        <Circle cx={w * 0.50} cy={h * 0.70} r={90} fill="none" stroke="rgba(26,188,156,0.07)" strokeWidth={1} />

        {/* Shelf edge teal glow lines */}
        <Path d={`M 0 ${h * 0.30} L ${w} ${h * 0.30}`} stroke="rgba(26,188,156,0.18)" strokeWidth={1} />
        <Path d={`M 0 ${h * 0.48} L ${w} ${h * 0.48}`} stroke="rgba(26,188,156,0.20)" strokeWidth={1} />
        <Path d={`M 0 ${h * 0.65} L ${w} ${h * 0.65}`} stroke="rgba(26,188,156,0.22)" strokeWidth={1} />

        {/* Parchment scroll fragments (8) */}
        {/* Scroll 1 */}
        <Rect x={w * 0.05} y={h * 0.22} width={52} height={30} rx={3} fill="#f4e4c1" opacity={0.38} />
        <Path d={`M ${w*0.05+6} ${h*0.22+10} L ${w*0.05+46} ${h*0.22+10}`} stroke="rgba(26,188,156,0.15)" strokeWidth={0.5} />
        <Path d={`M ${w*0.05+6} ${h*0.22+18} L ${w*0.05+46} ${h*0.22+18}`} stroke="rgba(26,188,156,0.15)" strokeWidth={0.5} />
        <Rect x={w * 0.05} y={h * 0.22} width={52} height={30} rx={3} fill="none" stroke="rgba(26,188,156,0.28)" strokeWidth={0.8} />
        {/* Scroll 2 */}
        <Rect x={w * 0.60} y={h * 0.18} width={46} height={26} rx={3} fill="#f4e4c1" opacity={0.35} />
        <Path d={`M ${w*0.60+5} ${h*0.18+9} L ${w*0.60+41} ${h*0.18+9}`} stroke="rgba(26,188,156,0.15)" strokeWidth={0.5} />
        <Path d={`M ${w*0.60+5} ${h*0.18+17} L ${w*0.60+41} ${h*0.18+17}`} stroke="rgba(26,188,156,0.15)" strokeWidth={0.5} />
        <Rect x={w * 0.60} y={h * 0.18} width={46} height={26} rx={3} fill="none" stroke="rgba(26,188,156,0.28)" strokeWidth={0.8} />
        {/* Scroll 3 */}
        <Rect x={w * 0.25} y={h * 0.35} width={40} height={24} rx={3} fill="#eadbb5" opacity={0.32} />
        <Path d={`M ${w*0.25+5} ${h*0.35+8} L ${w*0.25+35} ${h*0.35+8}`} stroke="rgba(26,188,156,0.15)" strokeWidth={0.5} />
        <Rect x={w * 0.25} y={h * 0.35} width={40} height={24} rx={3} fill="none" stroke="rgba(26,188,156,0.28)" strokeWidth={0.8} />
        {/* Scroll 4 */}
        <Rect x={w * 0.75} y={h * 0.42} width={50} height={28} rx={3} fill="#f4e4c1" opacity={0.38} />
        <Path d={`M ${w*0.75+6} ${h*0.42+10} L ${w*0.75+44} ${h*0.42+10}`} stroke="rgba(26,188,156,0.15)" strokeWidth={0.5} />
        <Path d={`M ${w*0.75+6} ${h*0.42+18} L ${w*0.75+44} ${h*0.42+18}`} stroke="rgba(26,188,156,0.15)" strokeWidth={0.5} />
        <Rect x={w * 0.75} y={h * 0.42} width={50} height={28} rx={3} fill="none" stroke="rgba(26,188,156,0.28)" strokeWidth={0.8} />
        {/* Scroll 5 */}
        <Rect x={w * 0.12} y={h * 0.55} width={44} height={26} rx={3} fill="#eadbb5" opacity={0.34} />
        <Path d={`M ${w*0.12+5} ${h*0.55+9} L ${w*0.12+39} ${h*0.55+9}`} stroke="rgba(26,188,156,0.15)" strokeWidth={0.5} />
        <Rect x={w * 0.12} y={h * 0.55} width={44} height={26} rx={3} fill="none" stroke="rgba(26,188,156,0.28)" strokeWidth={0.8} />
        {/* Scroll 6 */}
        <Rect x={w * 0.55} y={h * 0.58} width={48} height={28} rx={3} fill="#f4e4c1" opacity={0.40} />
        <Path d={`M ${w*0.55+6} ${h*0.58+10} L ${w*0.55+42} ${h*0.58+10}`} stroke="rgba(26,188,156,0.15)" strokeWidth={0.5} />
        <Path d={`M ${w*0.55+6} ${h*0.58+18} L ${w*0.55+42} ${h*0.58+18}`} stroke="rgba(26,188,156,0.15)" strokeWidth={0.5} />
        <Rect x={w * 0.55} y={h * 0.58} width={48} height={28} rx={3} fill="none" stroke="rgba(26,188,156,0.28)" strokeWidth={0.8} />
        {/* Scroll 7 */}
        <Rect x={w * 0.82} y={h * 0.62} width={36} height={22} rx={3} fill="#eadbb5" opacity={0.32} />
        <Path d={`M ${w*0.82+4} ${h*0.62+8} L ${w*0.82+32} ${h*0.62+8}`} stroke="rgba(26,188,156,0.15)" strokeWidth={0.5} />
        <Rect x={w * 0.82} y={h * 0.62} width={36} height={22} rx={3} fill="none" stroke="rgba(26,188,156,0.28)" strokeWidth={0.8} />
        {/* Scroll 8 */}
        <Rect x={w * 0.38} y={h * 0.75} width={54} height={30} rx={3} fill="#f4e4c1" opacity={0.42} />
        <Path d={`M ${w*0.38+6} ${h*0.75+10} L ${w*0.38+48} ${h*0.75+10}`} stroke="rgba(26,188,156,0.15)" strokeWidth={0.5} />
        <Path d={`M ${w*0.38+6} ${h*0.75+20} L ${w*0.38+48} ${h*0.75+20}`} stroke="rgba(26,188,156,0.15)" strokeWidth={0.5} />
        <Rect x={w * 0.38} y={h * 0.75} width={54} height={30} rx={3} fill="none" stroke="rgba(26,188,156,0.28)" strokeWidth={0.8} />

        {/* Narrative thread lines (5) */}
        <Path d={`M ${w*0.08} ${h*0.22} L ${w*0.55} ${h*0.35}`} stroke="rgba(26,188,156,0.30)" strokeWidth={1} />
        <Path d={`M ${w*0.62} ${h*0.18} L ${w*0.88} ${h*0.38}`} stroke="rgba(26,188,156,0.28)" strokeWidth={1} />
        <Path d={`M ${w*0.25} ${h*0.35} L ${w*0.75} ${h*0.52}`} stroke="rgba(26,188,156,0.25)" strokeWidth={0.8} />
        <Path d={`M ${w*0.05} ${h*0.55} L ${w*0.40} ${h*0.68}`} stroke="rgba(26,188,156,0.28)" strokeWidth={1} />
        <Path d={`M ${w*0.55} ${h*0.58} L ${w*0.85} ${h*0.70}`} stroke="rgba(26,188,156,0.25)" strokeWidth={0.8} />

        {/* Teal glow halos (3) */}
        <Circle cx={w * 0.25} cy={h * 0.38} r={70} fill="none" stroke="rgba(26,188,156,0.32)" strokeWidth={1.5} />
        <Circle cx={w * 0.72} cy={h * 0.55} r={60} fill="none" stroke="rgba(26,188,156,0.30)" strokeWidth={1.5} />
        <Circle cx={w * 0.50} cy={h * 0.20} r={50} fill="none" stroke="rgba(26,188,156,0.28)" strokeWidth={1} />


        {/* Teal spark dots (10) */}
        <Circle cx={w*0.14} cy={h*0.19} r={2}   fill="rgba(26,188,156,0.48)" />
        <Circle cx={w*0.43} cy={h*0.08} r={1.5} fill="rgba(26,188,156,0.42)" />
        <Circle cx={w*0.67} cy={h*0.14} r={2.5} fill="rgba(26,188,156,0.52)" />
        <Circle cx={w*0.88} cy={h*0.24} r={2}   fill="rgba(26,188,156,0.45)" />
        <Circle cx={w*0.32} cy={h*0.42} r={1.5} fill="rgba(26,188,156,0.38)" />
        <Circle cx={w*0.58} cy={h*0.50} r={2}   fill="rgba(26,188,156,0.44)" />
        <Circle cx={w*0.80} cy={h*0.60} r={2.5} fill="rgba(26,188,156,0.50)" />
        <Circle cx={w*0.22} cy={h*0.68} r={2}   fill="rgba(26,188,156,0.42)" />
        <Circle cx={w*0.47} cy={h*0.80} r={1.5} fill="rgba(26,188,156,0.38)" />
        <Circle cx={w*0.75} cy={h*0.88} r={2}   fill="rgba(26,188,156,0.46)" />
      </Svg>

      {/* Animated overlays */}
      <StoryPulse w={w} h={h} />
      <NarrativeFlicker w={w} h={h} />

      {/* Animated scroll drifts */}
      <ScrollDrift x={w * 0.08} delay={0} rotation={-14} canvasHeight={h} />
      <ScrollDrift x={w * 0.28} delay={2} rotation={10}  canvasHeight={h} />
      <ScrollDrift x={w * 0.50} delay={1} rotation={-7}  canvasHeight={h} />
      <ScrollDrift x={w * 0.70} delay={3} rotation={16}  canvasHeight={h} />
      <ScrollDrift x={w * 0.88} delay={1} rotation={-11} canvasHeight={h} />
    </>
  );
}

// ─── Island 7: Storm Palace Background ───────────────────────────────────────
function GoldFlicker({ x, y, delay }: { x: number; y: number; delay: number }) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay * 500 }),
        withTiming(0.55, { duration: 150 }),
        withTiming(0.15, { duration: 300 }),
        withTiming(0.55, { duration: 150 }),
        withTiming(0, { duration: 600 })
      ),
      -1, false
    );
    return () => cancelAnimation(opacity);
  }, [delay, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[{
        position: "absolute",
        left: x - 3, top: y - 3,
        width: 6, height: 6, borderRadius: 3,
        backgroundColor: "#f5c518",
      }, style]}
      pointerEvents="none"
    />
  );
}

function EchoRingBg({ cx, cy, delay }: { cx: number; cy: number; delay: number }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay * 800 }),
        withTiming(1, { duration: 3000, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 0 })
      ),
      -1, false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay * 800 }),
        withTiming(0.40, { duration: 300 }),
        withTiming(0, { duration: 2700 })
      ),
      -1, false
    );
    return () => { cancelAnimation(scale); cancelAnimation(opacity); };
  }, [delay, opacity, scale]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return (
    <Animated.View
      style={[{
        position: "absolute",
        left: cx - 120, top: cy - 120,
        width: 240, height: 240, borderRadius: 120,
        borderWidth: 2.5, borderColor: "#f5c518",
        backgroundColor: "transparent",
      }, style]}
      pointerEvents="none"
    />
  );
}

function StormGlow({ width, height }: { width: number; height: number }) {
  const glow = useSharedValue(0.04);
  useEffect(() => {
    glow.value = withRepeat(withSequence(
      withTiming(0.10, { duration: 5000, easing: Easing.inOut(Easing.quad) }),
      withTiming(0.04, { duration: 5000, easing: Easing.inOut(Easing.quad) }),
    ), -1, true);
    return () => { cancelAnimation(glow); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: glow.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: "absolute",
        left: width * 0.25, top: height * 0.35,
        width: width * 0.50, height: height * 0.20,
        borderRadius: width * 0.25,
        backgroundColor: "rgba(245,197,24,1)",
      }, style]}
    />
  );
}

function StormFlicker() {
  const opacity = useSharedValue(0);
  useEffect(() => {
    const id = setInterval(() => {
      opacity.value = withSequence(
        withTiming(0.08, { duration: 60 }),
        withTiming(0, { duration: 80 }),
        withTiming(0.05, { duration: 50 }),
        withTiming(0, { duration: 100 }),
      );
    }, 5000);
    return () => { clearInterval(id); cancelAnimation(opacity); };
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, backgroundColor: "#8e44ad" }, style]}
    />
  );
}

function StormBackground({ width: w, height: h }: { width: number; height: number }) {
  return (
    <>
      <Svg width={w} height={h} style={{ position: "absolute", top: 0, left: 0 }}>
        <Defs>
          <LinearGradient id="i7Sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#050308" stopOpacity="1" />
            <Stop offset="0.15" stopColor="#0a0515" stopOpacity="0.92" />
            <Stop offset="0.35" stopColor="#120a08" stopOpacity="0.85" />
            <Stop offset="0.55" stopColor="#1a1005" stopOpacity="0.80" />
            <Stop offset="0.75" stopColor="#0f0a02" stopOpacity="0.88" />
            <Stop offset="1" stopColor="#080500" stopOpacity="1" />
          </LinearGradient>
          <RadialGradient id="i7CenterGlow" cx="0.50" cy="0.45" rx="0.45" ry="0.35">
            <Stop offset="0" stopColor="#f5c518" stopOpacity="0.18" />
            <Stop offset="0.3" stopColor="#d4ac0d" stopOpacity="0.10" />
            <Stop offset="0.6" stopColor="#8e44ad" stopOpacity="0.04" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="i7StormBand" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000000" stopOpacity="0" />
            <Stop offset="0.4" stopColor="#8e44ad" stopOpacity="0.10" />
            <Stop offset="0.6" stopColor="#5b2c6f" stopOpacity="0.08" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="i7GroundStone" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#2a1e0a" stopOpacity="0.35" />
            <Stop offset="1" stopColor="#0f0a02" stopOpacity="0.45" />
          </LinearGradient>
        </Defs>

        {/* Base sky + center glow + storm band + ground stone */}
        <Rect x={0} y={0} width={w} height={h} fill="url(#i7Sky)" />
        <Rect x={0} y={0} width={w} height={h} fill="url(#i7CenterGlow)" />
        <Rect x={0} y={h*0.10} width={w} height={h*0.25} fill="url(#i7StormBand)" />
        <Rect x={0} y={h*0.70} width={w} height={h*0.30} fill="url(#i7GroundStone)" />

        {/* Storm clouds */}
        <Ellipse cx={w*0.20} cy={h*0.08} rx={w*0.25} ry={h*0.06} fill="rgba(30,15,50,0.35)" />
        <Ellipse cx={w*0.65} cy={h*0.05} rx={w*0.30} ry={h*0.05} fill="rgba(25,12,45,0.30)" />
        <Ellipse cx={w*0.85} cy={h*0.12} rx={w*0.20} ry={h*0.04} fill="rgba(35,18,55,0.28)" />
        {/* Cloud underlights */}
        <Ellipse cx={w*0.20} cy={h*0.10} rx={w*0.18} ry={h*0.02} fill="rgba(245,197,24,0.08)" />
        <Ellipse cx={w*0.65} cy={h*0.07} rx={w*0.22} ry={h*0.015} fill="rgba(245,197,24,0.06)" />

        {/* Amphitheater stone step arcs */}
        <Path d={`M ${w*0.10},${h*0.38} Q ${w*0.50},${h*0.28} ${w*0.90},${h*0.38}`} stroke="rgba(80,60,30,0.35)" strokeWidth={2} fill="none" />
        <Path d={`M ${w*0.05},${h*0.44} Q ${w*0.50},${h*0.34} ${w*0.95},${h*0.44}`} stroke="rgba(80,60,30,0.38)" strokeWidth={2.5} fill="none" />
        <Path d={`M 0,${h*0.50} Q ${w*0.50},${h*0.40} ${w},${h*0.50}`} stroke="rgba(80,60,30,0.42)" strokeWidth={3} fill="none" />
        {/* Stone fill between front tiers */}
        <Path d={`M 0,${h*0.50} Q ${w*0.50},${h*0.40} ${w},${h*0.50} L ${w},${h*0.55} Q ${w*0.50},${h*0.45} 0,${h*0.55} Z`} fill="rgba(30,22,10,0.40)" />
        {/* Arena floor */}
        <Ellipse cx={w*0.50} cy={h*0.52} rx={w*0.28} ry={h*0.06} fill="rgba(245,197,24,0.08)" stroke="rgba(245,197,24,0.18)" strokeWidth={1.5} />
        <Ellipse cx={w*0.50} cy={h*0.52} rx={w*0.15} ry={h*0.03} fill="rgba(245,197,24,0.14)" />

        {/* Ruined stone columns */}
        <G opacity={0.42}>
          <Rect x={w*0.08} y={h*0.32} width={8} height={h*0.22} rx={2} fill="rgba(60,45,20,0.50)" stroke="rgba(120,90,40,0.25)" strokeWidth={0.8} />
          <Rect x={w*0.06} y={h*0.30} width={12} height={6} rx={1} fill="rgba(70,52,25,0.48)" />
        </G>
        <G opacity={0.38}>
          <Rect x={w*0.85} y={h*0.36} width={8} height={h*0.18} rx={2} fill="rgba(60,45,20,0.48)" stroke="rgba(120,90,40,0.22)" strokeWidth={0.8} />
          <Path d={`M ${w*0.84},${h*0.36} L ${w*0.87},${h*0.33} L ${w*0.91},${h*0.35} L ${w*0.94},${h*0.36}`} fill="rgba(70,52,25,0.42)" />
        </G>
        <Rect x={w*0.28} y={h*0.40} width={6} height={h*0.12} rx={1.5} fill="rgba(55,40,18,0.45)" opacity={0.32} />
        <Rect x={w*0.68} y={h*0.42} width={6} height={h*0.10} rx={1.5} fill="rgba(55,40,18,0.42)" opacity={0.30} />

        {/* Lightning bolts (boosted) */}
        <Path d={`M ${w*0.48} 0 L ${w*0.52} ${h*0.12} L ${w*0.49} ${h*0.12} L ${w*0.53} ${h*0.22} L ${w*0.50} ${h*0.22} L ${w*0.52} ${h*0.32}`} stroke="rgba(245,197,24,0.45)" strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <Path d={`M ${w*0.12} ${h*0.05} L ${w*0.18} ${h*0.14} L ${w*0.14} ${h*0.14} L ${w*0.20} ${h*0.24}`} stroke="rgba(245,197,24,0.40)" strokeWidth={2} fill="none" strokeLinecap="round" />
        <Path d={`M ${w*0.72} ${h*0.10} L ${w*0.78} ${h*0.20} L ${w*0.74} ${h*0.20} L ${w*0.80} ${h*0.30}`} stroke="rgba(245,197,24,0.38)" strokeWidth={2} fill="none" strokeLinecap="round" />
        <Path d={`M ${w*0.30} ${h*0.52} L ${w*0.36} ${h*0.62} L ${w*0.32} ${h*0.62} L ${w*0.38} ${h*0.72}`} stroke="rgba(245,197,24,0.32)" strokeWidth={1.5} fill="none" strokeLinecap="round" />
        <Path d={`M ${w*0.60} ${h*0.68} L ${w*0.66} ${h*0.78} L ${w*0.62} ${h*0.78} L ${w*0.68} ${h*0.88}`} stroke="rgba(245,197,24,0.30)" strokeWidth={1.5} fill="none" strokeLinecap="round" />

        {/* Cracked ground lines (boosted) */}
        <Path d={`M ${w*0.05} ${h*0.55} L ${w*0.22} ${h*0.58} L ${w*0.18} ${h*0.61} L ${w*0.35} ${h*0.63}`} stroke="rgba(245,197,24,0.25)" strokeWidth={1.2} fill="none" />
        <Path d={`M ${w*0.55} ${h*0.60} L ${w*0.70} ${h*0.62} L ${w*0.67} ${h*0.65} L ${w*0.85} ${h*0.67}`} stroke="rgba(245,197,24,0.22)" strokeWidth={1.2} fill="none" />
        <Path d={`M ${w*0.20} ${h*0.80} L ${w*0.40} ${h*0.83} L ${w*0.36} ${h*0.86}`} stroke="rgba(245,197,24,0.20)" strokeWidth={1} fill="none" />

        {/* Concentric echo shockwave rings (static) */}
        <Circle cx={w*0.50} cy={h*0.52} r={40} fill="none" stroke="rgba(245,197,24,0.18)" strokeWidth={1} />
        <Circle cx={w*0.50} cy={h*0.52} r={70} fill="none" stroke="rgba(245,197,24,0.14)" strokeWidth={1} />
        <Circle cx={w*0.50} cy={h*0.52} r={100} fill="none" stroke="rgba(245,197,24,0.10)" strokeWidth={1} />
        <Circle cx={w*0.50} cy={h*0.52} r={130} fill="none" stroke="rgba(245,197,24,0.07)" strokeWidth={0.8} />

        {/* Gold glow halos (boosted) */}
        <Circle cx={w*0.50} cy={h*0.35} r={70} fill="none" stroke="rgba(245,197,24,0.32)" strokeWidth={1.5} />
        <Circle cx={w*0.38} cy={h*0.65} r={60} fill="none" stroke="rgba(245,197,24,0.30)" strokeWidth={1.5} />
        <Circle cx={w*0.82} cy={h*0.20} r={50} fill="none" stroke="rgba(245,197,24,0.28)" strokeWidth={1} />


        {/* Echo spark dots */}
        <Circle cx={w*0.14} cy={h*0.20} r={2} fill="rgba(245,197,24,0.45)" />
        <Circle cx={w*0.78} cy={h*0.15} r={1.5} fill="rgba(245,197,24,0.40)" />
        <Circle cx={w*0.42} cy={h*0.30} r={2.5} fill="rgba(245,197,24,0.48)" />
        <Circle cx={w*0.88} cy={h*0.45} r={2} fill="rgba(245,197,24,0.42)" />
        <Circle cx={w*0.22} cy={h*0.55} r={3} fill="rgba(245,197,24,0.52)" />
        <Circle cx={w*0.65} cy={h*0.58} r={1.5} fill="rgba(245,197,24,0.38)" />
        <Circle cx={w*0.10} cy={h*0.72} r={2} fill="rgba(245,197,24,0.45)" />
        <Circle cx={w*0.75} cy={h*0.78} r={2.5} fill="rgba(245,197,24,0.50)" />
        <Circle cx={w*0.50} cy={h*0.85} r={2} fill="rgba(245,197,24,0.42)" />
        <Circle cx={w*0.35} cy={h*0.92} r={1.5} fill="rgba(245,197,24,0.38)" />
      </Svg>

      {/* Animated overlays */}
      <StormGlow width={w} height={h} />
      <StormFlicker />

      {/* Animated gold flickers */}
      <GoldFlicker x={w * 0.12} y={h * 0.08} delay={0} />
      <GoldFlicker x={w * 0.75} y={h * 0.22} delay={1} />
      <GoldFlicker x={w * 0.35} y={h * 0.45} delay={2} />
      <GoldFlicker x={w * 0.60} y={h * 0.60} delay={3} />
      <GoldFlicker x={w * 0.18} y={h * 0.75} delay={1} />
      <GoldFlicker x={w * 0.88} y={h * 0.85} delay={4} />
      {/* Animated echo rings */}
      <EchoRingBg cx={w * 0.50} cy={h * 0.35} delay={0} />
      <EchoRingBg cx={w * 0.38} cy={h * 0.65} delay={4} />
    </>
  );
}

// Decorative SVG art per island (rendered in a 60×60 viewBox at the top of the canvas)
function IslandDeco({ islandNum }: { islandNum: number }) {
  switch (islandNum) {
    case 1: // Vocabulary — detailed frozen palm scene
      return (
        <G transform="translate(8, 52)">
          {/* Curved trunk */}
          <Path d="M18 56 Q17 44 19 32 Q20 20 21 14"
            stroke="#7a4422" strokeWidth={3.5} strokeLinecap="round" fill="none" />
          {/* 6 fronds — vibrant greens */}
          <Path d="M21 14 Q8 8 4 14"   stroke="#27ae60" strokeWidth={2.5} strokeLinecap="round" fill="none" />
          <Path d="M21 14 Q18 4 25 2"  stroke="#2ecc71" strokeWidth={2.5} strokeLinecap="round" fill="none" />
          <Path d="M21 14 Q30 7 36 13" stroke="#27ae60" strokeWidth={2.5} strokeLinecap="round" fill="none" />
          <Path d="M21 14 Q28 10 34 8" stroke="#52d68a" strokeWidth={2}   strokeLinecap="round" fill="none" />
          <Path d="M21 14 Q12 9 8 11"  stroke="#2ecc71" strokeWidth={2}   strokeLinecap="round" fill="none" />
          <Path d="M21 14 Q24 6 30 4"  stroke="#52d68a" strokeWidth={2}   strokeLinecap="round" fill="none" />
          {/* Frost overlays on main fronds */}
          <Path d="M21 14 Q8 8 4 14"   stroke="rgba(200,240,255,0.55)" strokeWidth={1} fill="none" />
          <Path d="M21 14 Q18 4 25 2"  stroke="rgba(200,240,255,0.50)" strokeWidth={1} fill="none" />
          <Path d="M21 14 Q30 7 36 13" stroke="rgba(200,240,255,0.50)" strokeWidth={1} fill="none" />
          {/* Icicle drops from frond tips */}
          <Polygon points="4,14 5,19 6,14"    fill="rgba(200,240,255,0.80)" />
          <Polygon points="25,2 26,7 27,2"    fill="rgba(200,240,255,0.80)" />
          <Polygon points="36,13 37,18 38,13" fill="rgba(200,240,255,0.80)" />
          <Polygon points="34,8 35,13 36,8"   fill="rgba(200,240,255,0.72)" />
          {/* Coconuts */}
          <Circle cx={20} cy={16} r={2.8} fill="#8b5a2b" opacity={0.90} />
          <Circle cx={23} cy={17} r={2.4} fill="#7a4e26" opacity={0.85} />
          <Circle cx={18} cy={18} r={2}   fill="#8b5a2b" opacity={0.80} />
          {/* SALITA ice block */}
          <Rect x={0} y={38} width={44} height={16} rx={3}
            fill="rgba(180,230,255,0.20)" stroke="rgba(220,245,255,0.60)" strokeWidth={1} />
          <Path d="M2 42 L42 42" stroke="rgba(255,255,255,0.25)" strokeWidth={0.5} fill="none" />
          <SvgText x={4} y={51} fontSize={9} fill="rgba(160,220,255,0.85)"
            fontStyle="italic" fontWeight="700">SALITA</SvgText>
        </G>
      );
    case 2: // Speed — electrified storm post
      return (
        <G transform="translate(8, 48)">
          {/* Telegraph pole */}
          <Path d="M20 58 L20 18" stroke="#5a3a2a" strokeWidth={3.5} strokeLinecap="round" fill="none" />
          <Path d="M10 22 L30 22" stroke="#5a3a2a" strokeWidth={2.5} strokeLinecap="round" fill="none" />
          {/* Drooping wire */}
          <Path d="M2 20 Q10 28 20 22 Q30 16 38 24" stroke="rgba(195,155,211,0.55)" strokeWidth={1} fill="none" />
          {/* Lightning bolt */}
          <Polygon points="16,2 12,14 15,14 11,26 22,12 17,12 20,2" fill="rgba(245,197,24,0.75)" stroke="rgba(255,255,255,0.25)" strokeWidth={0.5} />
          <Polygon points="16,2 12,14 15,14 11,26 22,12 17,12 20,2" fill="none" stroke="rgba(195,155,211,0.35)" strokeWidth={3} />
          {/* Spark at junction */}
          <Circle cx={20} cy={22} r={3} fill="rgba(220,190,255,0.60)" />
          <Circle cx={20} cy={22} r={5} fill="rgba(142,68,173,0.20)" />
          {/* BILIS electric block */}
          <Rect x={2} y={40} width={36} height={14} rx={3}
            fill="rgba(142,68,173,0.25)" stroke="rgba(195,155,211,0.55)" strokeWidth={1} />
          <Path d="M4 44 L36 44" stroke="rgba(255,255,255,0.20)" strokeWidth={0.5} fill="none" />
          <SvgText x={5} y={51} fontSize={9} fill="rgba(195,155,211,0.85)"
            fontStyle="italic" fontWeight="700">BILIS</SvgText>
        </G>
      );
    case 3: // Main Idea — misty mountain with lantern
      return (
        <G transform="translate(6, 48)">
          {/* Back mountain */}
          <Path d="M0 50 L8 28 L18 22 L28 30 L38 50 Z" fill="rgba(15,30,55,0.40)" />
          {/* Front mountain */}
          <Path d="M5 50 L14 30 L22 26 L30 34 L35 50 Z" fill="rgba(10,22,40,0.50)" />
          {/* Snow cap */}
          <Path d="M20 26 L17 30 L25 30 Z" fill="rgba(200,220,240,0.35)" />
          {/* Fog band */}
          <Ellipse cx={20} cy={38} rx={20} ry={4} fill="rgba(168,200,224,0.25)" />
          {/* Lantern */}
          <Circle cx={32} cy={20} r={5} fill="rgba(232,169,64,0.30)" />
          <Circle cx={32} cy={20} r={2.5} fill="rgba(245,197,24,0.65)" />
          <Circle cx={32} cy={20} r={1} fill="rgba(255,255,255,0.45)" />
          {/* DIWA stone block */}
          <Rect x={2} y={40} width={36} height={14} rx={3}
            fill="rgba(80,95,110,0.30)" stroke="rgba(168,200,224,0.50)" strokeWidth={1} />
          <Path d="M4 44 L36 44" stroke="rgba(255,255,255,0.20)" strokeWidth={0.5} fill="none" />
          <SvgText x={6} y={51} fontSize={9} fill="rgba(168,200,224,0.85)"
            fontStyle="italic" fontWeight="700">DIWA</SvgText>
        </G>
      );
    case 4: // Emotion — volcanic shore with lava crack + DAMDAMIN
      return (
        <G transform="translate(6, 48)">
          {/* Back volcanic peak */}
          <Path d="M0 52 L6 32 L14 24 L22 32 L30 52 Z" fill="rgba(30,8,8,0.42)" />
          {/* Front volcanic peak */}
          <Path d="M4 52 L12 34 L20 28 L28 36 L34 52 Z" fill="rgba(20,5,5,0.52)" />
          {/* Crater rim arc */}
          <Path d="M16 30 Q20 25 24 30" fill="none" stroke="rgba(180,40,20,0.38)" strokeWidth={1.5} />
          {/* Lava crack fissure */}
          <Path d="M8 46 L12 50 L16 48 L20 52" fill="none" stroke="rgba(231,76,60,0.52)" strokeWidth={2} strokeLinecap="round" />
          <Path d="M8 46 L12 50 L16 48 L20 52" fill="none" stroke="rgba(245,130,80,0.30)" strokeWidth={0.7} strokeLinecap="round" />
          {/* Ember bloom above crack */}
          <Circle cx={14} cy={44} r={7} fill="rgba(231,76,60,0.30)" />
          <Circle cx={14} cy={44} r={3} fill="rgba(245,130,80,0.55)" />
          {/* DAMDAMIN stone block */}
          <Rect x={0} y={54} width={46} height={14} rx={2} fill="rgba(60,15,10,0.32)" stroke="rgba(231,76,60,0.55)" strokeWidth={0.8} />
          <SvgText x={4} y={64} fontSize={8} fill="rgba(231,120,100,0.88)"
            fontStyle="italic" fontWeight="700">DAMDAMIN</SvgText>
        </G>
      );
    case 5: // Specific — harbour lighthouse with TANONG
      return (
        <G transform="translate(6, 48)">
          {/* Lighthouse beam fan */}
          <Path d="M30 10 L4 42 L12 42 Z" fill="rgba(230,126,34,0.18)" />
          <Path d="M30 10 L0 52 L8 52 Z" fill="rgba(230,126,34,0.12)" />
          {/* Lighthouse shaft */}
          <Path d="M26 10 L24 52 L36 52 L34 10 Z" fill="rgba(40,18,0,0.52)" />
          {/* Beacon housing */}
          <Circle cx={30} cy={10} r={7} fill="rgba(230,126,34,0.38)" />
          <Circle cx={30} cy={10} r={3} fill="rgba(245,197,24,0.65)" />
          {/* Dock wall strip */}
          <Rect x={0} y={52} width={46} height={8} rx={1} fill="rgba(35,15,0,0.48)" />
          {/* Crate stacks */}
          <Rect x={4}  y={44} width={10} height={9} rx={1} fill="rgba(50,22,5,0.45)" stroke="rgba(230,126,34,0.20)" strokeWidth={0.8} />
          <Rect x={16} y={46} width={8}  height={7} rx={1} fill="rgba(50,22,5,0.42)" stroke="rgba(230,126,34,0.18)" strokeWidth={0.8} />
          {/* TANONG stone block */}
          <Rect x={0} y={60} width={44} height={14} rx={2} fill="rgba(40,18,0,0.35)" stroke="rgba(230,126,34,0.55)" strokeWidth={0.8} />
          <SvgText x={4} y={70} fontSize={9} fill="rgba(230,150,60,0.88)"
            fontStyle="italic" fontWeight="700">TANONG</SvgText>
        </G>
      );
    case 6: // Narrative — ancient scroll library
      return (
        <G transform="translate(4, 46)">
          {/* Stone shelf bands */}
          <Rect x={0}  y={14} width={46} height={4} rx={1} fill="rgba(15,50,38,0.42)" stroke="rgba(26,188,156,0.22)" strokeWidth={0.6} />
          <Rect x={0}  y={24} width={46} height={4} rx={1} fill="rgba(15,50,38,0.38)" stroke="rgba(26,188,156,0.18)" strokeWidth={0.6} />
          <Rect x={0}  y={34} width={46} height={4} rx={1} fill="rgba(15,50,38,0.35)" stroke="rgba(26,188,156,0.16)" strokeWidth={0.6} />
          {/* Column stubs */}
          <Rect x={6}  y={10} width={4} height={28} rx={1} fill="rgba(15,50,38,0.48)" />
          <Rect x={36} y={10} width={4} height={28} rx={1} fill="rgba(15,50,38,0.45)" />
          {/* Parchment scroll 1 */}
          <Rect x={12} y={16} width={10} height={7} rx={1} fill="#f4e4c1" opacity={0.72} stroke="rgba(26,188,156,0.32)" strokeWidth={0.6} />
          <Path d={`M 14 19 L 20 19`} stroke="rgba(26,188,156,0.18)" strokeWidth={0.5} />
          {/* Parchment scroll 2 */}
          <Rect x={26} y={26} width={10} height={7} rx={1} fill="#f4e4c1" opacity={0.68} stroke="rgba(26,188,156,0.32)" strokeWidth={0.6} />
          <Path d={`M 28 29 L 34 29`} stroke="rgba(26,188,156,0.18)" strokeWidth={0.5} />
          {/* Narrative thread connecting scrolls */}
          <Path d={`M 22 20 Q 28 24 26 30`} fill="none" stroke="rgba(26,188,156,0.40)" strokeWidth={1} />
          {/* Water ripple ellipse at bottom */}
          <Ellipse cx={23} cy={44} rx={18} ry={4} fill="none" stroke="rgba(26,188,156,0.22)" strokeWidth={0.8} />
          <Ellipse cx={23} cy={44} rx={10} ry={2} fill="rgba(26,188,156,0.10)" />
          {/* KWENTO stone block */}
          <Rect x={0} y={56} width={46} height={14} rx={2} fill="rgba(4,18,14,0.35)" stroke="rgba(26,188,156,0.55)" strokeWidth={0.8} />
          <SvgText x={4} y={66} fontSize={9} fill="rgba(26,188,156,0.88)"
            fontStyle="italic" fontWeight="700">KWENTO</SvgText>
        </G>
      );
    case 7: // Final — storm amphitheater with ALINGAWNGAW
      return (
        <G transform="translate(4, 46)">
          {/* Storm cloud mass */}
          <Ellipse cx={22} cy={4} rx={18} ry={5} fill="rgba(40,20,60,0.35)" />
          <Ellipse cx={22} cy={5} rx={12} ry={3} fill="rgba(245,197,24,0.08)" />
          {/* Lightning bolt */}
          <Polygon points="20,2 17,10 19,10 16,18 24,9 21,9 23,2" fill="rgba(245,197,24,0.72)" stroke="rgba(255,255,255,0.20)" strokeWidth={0.5} />
          {/* Amphitheater steps */}
          <Path d="M4 26 Q22 18 40 26" fill="none" stroke="rgba(80,60,30,0.48)" strokeWidth={1.5} />
          <Path d="M2 32 Q22 24 42 32" fill="none" stroke="rgba(80,60,30,0.42)" strokeWidth={1.8} />
          <Path d="M0 38 Q22 30 44 38" fill="none" stroke="rgba(80,60,30,0.38)" strokeWidth={2} />
          {/* Arena center glow */}
          <Ellipse cx={22} cy={34} rx={10} ry={4} fill="rgba(245,197,24,0.22)" />
          <Ellipse cx={22} cy={34} rx={5} ry={2} fill="rgba(245,197,24,0.45)" />
          {/* Echo ring marks */}
          <Circle cx={22} cy={34} r={8} fill="none" stroke="rgba(245,197,24,0.18)" strokeWidth={0.8} />
          <Circle cx={22} cy={34} r={14} fill="none" stroke="rgba(245,197,24,0.12)" strokeWidth={0.6} />
          {/* Broken column stubs */}
          <Rect x={6} y={24} width={3} height={10} rx={1} fill="rgba(60,45,20,0.45)" />
          <Rect x={36} y={26} width={3} height={8} rx={1} fill="rgba(60,45,20,0.40)" />
          {/* ALINGAWNGAW stone block */}
          <Rect x={0} y={56} width={48} height={14} rx={2} fill="rgba(16,12,0,0.35)" stroke="rgba(245,197,24,0.55)" strokeWidth={0.8} />
          <SvgText x={2} y={66} fontSize={6.5} fill="rgba(245,197,24,0.88)" fontStyle="italic" fontWeight="700">ALINGAWNGAW</SvgText>
        </G>
      );
    default:
      return null;
  }
}

export default function IslandScreen() {
  // BUG 23 FIX: use hook so dimensions update on orientation/resize instead of stale module-load value
  const { width: sw } = useWindowDimensions();
  const CANVAS_H = Math.round(sw * 2.46); // proportional to design reference (960 / 390)

  const { islandId } = useLocalSearchParams<{ islandId: string }>();
  const { user } = useAuthStore();
  const characterMode = user?.characterModeEnabled ?? false;
  const [phase, setPhase] = useState<"ingay" | "captain" | "map">("map");

  const { data: island, isLoading } = useQuery({
    queryKey: ["island", islandId],
    queryFn: () => apiClient.getIsland(islandId),
    refetchOnMount: true,
  });
  const queryClient = useQueryClient();
  const [devBusy, setDevBusy] = useState(false);
  const invalidateProgressQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["island", islandId] });
    queryClient.invalidateQueries({ queryKey: ["islands"] });
    queryClient.invalidateQueries({ queryKey: ["progress"] });
  };
  const handleDevComplete = async () => {
    if (devBusy) return;
    setDevBusy(true);
    try {
      await apiClient.markIslandComplete(islandId);
      invalidateProgressQueries();
    } catch (e) {
      console.warn("[dev] markIslandComplete failed", e);
    } finally {
      setDevBusy(false);
    }
  };
  const handleDevUncomplete = async () => {
    if (devBusy) return;
    setDevBusy(true);
    try {
      await apiClient.markIslandUncomplete(islandId);
      invalidateProgressQueries();
    } catch (e) {
      console.warn("[dev] markIslandUncomplete failed", e);
    } finally {
      setDevBusy(false);
    }
  };

  // Set initial phase based on DB ingaySeen — runs once after island loads
  useEffect(() => {
    if (!island || !characterMode) return;
    setPhase((island as any).ingaySeen ? "captain" : "ingay");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [island?.id, characterMode]);

  // Captain intro entrance animation (slide-up + fade-in)
  const captainEntranceY = useSharedValue(40);
  const captainEntranceOpacity = useSharedValue(0);
  const captainEntranceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: captainEntranceY.value }],
    opacity: captainEntranceOpacity.value,
  }));
  useEffect(() => {
    if (phase !== "captain") return;
    captainEntranceY.value = 40;
    captainEntranceOpacity.value = 0;
    captainEntranceY.value = withTiming(0, { duration: 420 });
    captainEntranceOpacity.value = withTiming(1, { duration: 380 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (isLoading || !island) {
    return (
      <View className="flex-1 bg-ocean-deep items-center justify-center">
        <ActivityIndicator color="#f5c518" size="large" />
      </View>
    );
  }

  const accentColor = ISLAND_COLORS[(island.number ?? 1) - 1] ?? "#27ae60";

  // === INGAY WARNING ===
  if (phase === "ingay" && characterMode) {
    return (
      <IngayWarning
        islandName={island.name}
        skillFocus={island.skillFocus}
        dialogue={(island as any).ingayDialogue}
        onDismiss={() => {
          apiClient.markIngaySeen(islandId).catch(() => {});
          setPhase("captain");
        }}
        audioUrl={island.ingayAudioUrl}
      />
    );
  }

  // === CAPTAIN INTRO ===
  if (phase === "captain" && characterMode) {
    return (
      <SafeAreaView className="flex-1 bg-ocean-deep" edges={["top"]}>
        <Animated.View style={[{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }, captainEntranceStyle]}>
          <Text className="text-parchment-dark text-sm mb-6">Island {island.number}</Text>
          <CaptainSalita
            state="talking"
            dialogue={island.npcDialogueIntro ?? `Listen carefully. ${island.name} holds many secrets.`}
            audioUrl={island.npcAudioIntro}
            size={180}
          />
          <Text className="text-gold text-xl font-bold mt-6 mb-2 text-center">{island.name}</Text>
          <Text className="text-parchment text-sm text-center mb-10">Skill focus: {island.skillFocus}</Text>
          <TouchableOpacity
            onPress={() => setPhase("map")}
            className="bg-gold rounded-xl px-10 py-4 w-full items-center"
          >
            <Text className="text-ocean-deep font-bold text-lg">Let's go ⚓</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    );
  }

  const isDevUser = (island as any).isDevUser ?? false;

  // Compute pin states
  const pins = island.pins ?? [];
  const pinStates = pins.map((pin: any, idx: number) => {
    const isCompleted = pin.isCompleted ?? false;
    // Completed pins are always re-enterable; new pins require previous pin passed at 100%
    const isUnlocked = isDevUser || idx === 0 || isCompleted || (pins[idx - 1]?.isCompleted ?? false);
    const isCurrent = isUnlocked && !isCompleted;
    return { ...pin, isCompleted, isUnlocked, isCurrent };
  });

  const completedChallenges = pinStates.filter((p: any) => p.isCompleted).length;

  // Warning: all pins completed but cumulative average below 70%
  const allPinsCompleted = (island as any).allPinsCompleted ?? false;
  const islandPassed = (island as any).islandPassed ?? false;
  const cumulativeAccuracy = (island as any).cumulativeAccuracy ?? null;
  const showShardWarning = allPinsCompleted && !islandPassed;

  const positions = PIN_FRACS.slice(0, pins.length).map((f) => ({
    x: f.xf * sw,
    y: f.yf * CANVAS_H,
  }));
  const ropePath = buildRopePath(positions);

  const handlePinPress = (pin: any, isUnlocked: boolean) => {
    if (!isUnlocked) return;
    const currentIdx = pinStates.findIndex((p: any) => p.id === pin.id);
    const nextPin = pinStates[currentIdx + 1];
    if (pin.isCompleted) {
      router.push(`/(main)/quest/${pin.id}?mode=result${nextPin ? `&nextPinId=${nextPin.id}` : ""}`);
    } else {
      router.push(`/(main)/quest/${pin.id}${nextPin ? `?nextPinId=${nextPin.id}` : ""}`);
    }
  };

  const handleBack = () => {
    Alert.alert("Leave Island?", "Your progress is saved.", [
      { text: "Stay", style: "cancel" },
      { text: "Go Back", onPress: () => router.replace("/(main)/map") },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-ocean-deep" edges={["top"]}>
      <BackgroundMusic islandNumber={island.number} bgMusicUrl={island.bgMusicUrl} />
      <MuteButton />
      {/* Header */}
      <View className="px-5 pt-2 pb-3">
        <TouchableOpacity onPress={handleBack}>
          <Text className="text-gold text-sm mb-3">← Back</Text>
        </TouchableOpacity>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-parchment-dark text-xs">Island {island.number}</Text>
            <Text className="text-gold text-xl font-bold">{island.name}</Text>
            <Text className="text-parchment-dark text-xs">{island.skillFocus}</Text>
          </View>
          <View className="items-end">
            <Text className="text-parchment-dark text-xs mb-1">Challenges</Text>
            <View className="flex-row items-center gap-1">
              {pinStates.map((p: any, i: number) => (
                <View
                  key={i}
                  style={{
                    width: 10, height: 10, borderRadius: 5,
                    backgroundColor: p.isCompleted && (p.accuracy ?? 0) === 100
                      ? "#f5c518"
                      : p.isCompleted && (p.accuracy ?? 0) < 100
                      ? "#ef4444"
                      : "rgba(255,255,255,0.15)",
                  }}
                />
              ))}
            </View>
            <Text className="text-gold text-xs mt-1">{completedChallenges} / {pins.length}</Text>
          </View>
        </View>
      </View>

      {/* Cumulative accuracy bar — shown only after all pins completed */}
      {allPinsCompleted && cumulativeAccuracy !== null && (() => {
        const fillColor = islandPassed ? "#4ade80" : cumulativeAccuracy >= 50 ? "#f5c518" : "#f87171";
        return (
          <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ color: "#9ca3af", fontSize: 12, fontWeight: "600" }}>Island Average</Text>
              <Text style={{ color: fillColor, fontSize: 13, fontWeight: "700" }}>
                {cumulativeAccuracy}% {islandPassed ? "✓ Passed" : "· needs 70%"}
              </Text>
            </View>
            <View style={{ height: 8, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 4, position: "relative" }}>
              {/* Filled portion */}
              <View style={{
                position: "absolute", left: 0, top: 0, bottom: 0,
                width: `${Math.min(cumulativeAccuracy, 100)}%`,
                backgroundColor: fillColor,
                borderRadius: 4,
              }} />
              {/* 70% threshold tick */}
              <View style={{
                position: "absolute",
                left: "70%",
                top: -3, bottom: -3,
                width: 1.5,
                backgroundColor: "rgba(255,255,255,0.45)",
              }} />
            </View>
            <Text style={{ color: "rgba(255,255,255,0.28)", fontSize: 9, marginTop: 3, paddingLeft: "70%" }}>
              70%
            </Text>
          </View>
        );
      })()}

      {/* Map canvas */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ width: sw, height: CANVAS_H + 80, position: "relative" }}>

          {/* Island 1 — Frozen ocean background layer */}
          {island.number === 1 && <FrozenOceanBackground width={sw} height={CANVAS_H + 80} />}

          {/* Island 2 — Speedy purple background layer */}
          {island.number === 2 && <SpeedyBackground width={sw} height={CANVAS_H + 80} />}

          {/* Island 3 — Foggy deep navy background layer */}
          {island.number === 3 && <FoggyBackground width={sw} height={CANVAS_H + 80} />}

          {/* Island 4 — Ember ash background layer */}
          {island.number === 4 && <EmberBackground width={sw} height={CANVAS_H + 80} />}

          {/* Island 5 — Scattered records background layer */}
          {island.number === 5 && <ScatteredBackground width={sw} height={CANVAS_H + 80} />}

          {/* Island 6 — Story fragments background layer */}
          {island.number === 6 && <StoryBackground width={sw} height={CANVAS_H + 80} />}

          {/* Island 7 — Storm palace background layer */}
          {island.number === 7 && <StormBackground width={sw} height={CANVAS_H + 80} />}

          {/* SVG background — rope + deco */}
          <Svg width={sw} height={CANVAS_H + 80} style={{ position: "absolute", top: 0, left: 0 }}>

            {/* Subtle wave lines */}
            {[120, 280, 440, 600, 760, 900].map((y, i) => (
              <Path
                key={i}
                d={`M 0 ${y} Q ${sw * 0.25} ${y - 12} ${sw * 0.5} ${y} Q ${sw * 0.75} ${y + 12} ${sw} ${y}`}
                stroke="rgba(255,255,255,0.025)"
                strokeWidth="2"
                fill="none"
              />
            ))}

            {/* Island decorative art */}
            <IslandDeco islandNum={island.number ?? 1} />

            {/* Rope shadow */}
            <Path d={ropePath} stroke="rgba(0,0,0,0.3)" strokeWidth="9" fill="none" strokeLinecap="round" />
            {/* Rope body */}
            <Path
              d={ropePath}
              stroke={island.number === 1 ? "rgba(140,200,230,0.40)" : "#6b4f1a"}
              strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray="12,8"
            />
            {/* Rope highlight */}
            <Path
              d={ropePath}
              stroke={island.number === 1 ? "rgba(200,240,255,0.55)" : "#c4942a"}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="12,8"
              strokeDashoffset="5"
              opacity={0.55}
            />
            {/* Island 1 frost crystallization layer */}
            {island.number === 1 && (
              <Path
                d={ropePath}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="1"
                fill="none"
                strokeLinecap="round"
                strokeDasharray="3,6"
              />
            )}
          </Svg>

          {/* Pin nodes */}
          {pinStates.map((pin: any, idx: number) => {
            const pos = positions[idx];
            if (!pos) return null;
            return (
              <PinNode
                key={pin.id}
                pin={pin}
                pos={pos}
                accentColor={accentColor}
                islandNum={island.number ?? 1}
                onPress={() => handlePinPress(pin, pin.isUnlocked)}
              />
            );
          })}
        </View>
      </ScrollView>

      {/* Captain Salita warning — all pins done but island average below 70% */}
      {showShardWarning && (
        <View style={{
          marginHorizontal: 16,
          marginBottom: 12,
          backgroundColor: "rgba(20,10,0,0.92)",
          borderRadius: 14,
          borderWidth: 1,
          borderColor: "rgba(245,197,24,0.4)",
          padding: 16,
        }}>
          <CaptainSalita
            state="talking"
            dialogue={`Your voyage across this island scored ${cumulativeAccuracy ?? 0}% — you need 70% to sail on. Replay any challenge to raise your average, sailor.`}
            size={110}
          />
        </View>
      )}

      {isDevUser && (
        <View
          style={{
            position: "absolute",
            bottom: 20,
            left: 16,
            right: 16,
            flexDirection: "row",
            gap: 8,
            padding: 10,
            borderRadius: 12,
            backgroundColor: "rgba(20,10,40,0.85)",
            borderWidth: 1,
            borderColor: "rgba(245,197,24,0.5)",
          }}
        >
          <Text style={{ color: "#f5c518", fontSize: 10, fontWeight: "700", alignSelf: "center" }}>DEV</Text>
          <TouchableOpacity
            disabled={devBusy}
            onPress={handleDevComplete}
            style={{ flex: 1, backgroundColor: "#16a34a", paddingVertical: 8, borderRadius: 8, alignItems: "center", opacity: devBusy ? 0.5 : 1 }}
          >
            <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>Mark Complete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={devBusy}
            onPress={handleDevUncomplete}
            style={{ flex: 1, backgroundColor: "#dc2626", paddingVertical: 8, borderRadius: 8, alignItems: "center", opacity: devBusy ? 0.5 : 1 }}
          >
            <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>Mark Uncomplete</Text>
          </TouchableOpacity>
        </View>
      )}

    </SafeAreaView>
  );
}

// ─── Pin Node ────────────────────────────────────────────────────────────────

function PinNode({
  pin, pos, accentColor, islandNum, onPress,
}: {
  pin: any;
  pos: { x: number; y: number };
  accentColor: string;
  islandNum: number;
  onPress: () => void;
}) {
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);

  useEffect(() => {
    if (pin.isCurrent) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.7, { duration: 950, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 0 })
        ),
        -1,
        false
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 150 }),
          withTiming(0, { duration: 800 })
        ),
        -1,
        false
      );
    }
  }, [pin.isCurrent, pulseOpacity, pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const isFailed = pin.isCompleted && (pin.accuracy ?? 0) < 100;
  const isPassed = pin.isCompleted && (pin.accuracy ?? 0) === 100;

  const ringColor = isPassed
    ? "#f5c518"
    : isFailed
    ? "#ef4444"
    : pin.isCurrent
    ? accentColor
    : pin.isUnlocked
    ? "rgba(255,255,255,0.35)"
    : "rgba(255,255,255,0.12)";
  const ringWidth = isPassed || isFailed || pin.isCurrent ? 3.5 : 1.5;

  const DIAMETER = PIN_R * 2;

  return (
    <View
      style={{
        position: "absolute",
        left: pos.x - PIN_R,
        top: pos.y - PIN_R,
        width: DIAMETER,
        height: DIAMETER,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Pulse ring */}
      {pin.isCurrent && (
        <Animated.View
          style={[{
            position: "absolute",
            width: DIAMETER,
            height: DIAMETER,
            borderRadius: PIN_R,
            backgroundColor: accentColor,
          }, pulseStyle]}
        />
      )}

      <TouchableOpacity
        onPress={onPress}
        disabled={!pin.isUnlocked}
        activeOpacity={0.75}
        style={{ alignItems: "center", justifyContent: "center" }}
      >
        <Svg width={DIAMETER} height={DIAMETER} viewBox="0 0 64 64">
          {/* Pin circle */}
          <Circle
            cx="32" cy="32" r="30"
            fill={!pin.isUnlocked ? "#1c2a38" : ISLAND_PIN_BG[(islandNum - 1)] ?? "#0f1e30"}
            stroke={ringColor}
            strokeWidth={ringWidth}
            opacity={!pin.isUnlocked ? 0.5 : 1}
          />

          {/* Island 1 — frost ring + ice crystal accents */}
          {islandNum === 1 && (
            <>
              <Circle cx="32" cy="32" r="30" fill="none" stroke="rgba(150,220,255,0.20)" strokeWidth={1} strokeDasharray="3,5" />
              {/* N crystal */}
              <Polygon points="32,2 29,7 32,5 35,7" fill="rgba(180,230,255,0.25)" />
              {/* S crystal */}
              <Polygon points="32,62 29,57 32,59 35,57" fill="rgba(180,230,255,0.18)" />
              {/* E crystal */}
              <Polygon points="62,32 57,29 59,32 57,35" fill="rgba(180,230,255,0.22)" />
              {/* W crystal */}
              <Polygon points="2,32 7,29 5,32 7,35" fill="rgba(180,230,255,0.20)" />
            </>
          )}

          {/* Locked */}
          {!pin.isUnlocked && (
            <>
              <Path
                d="M24 32 L24 26 Q24 20 32 20 Q40 20 40 26 L40 32"
                stroke="rgba(255,255,255,0.3)" strokeWidth="3.5" fill="none" strokeLinecap="round"
              />
              <Rect x="20" y="30" width="24" height="17" rx="3"
                fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"
              />
              <Circle cx="32" cy="40" r="2.5" fill="rgba(255,255,255,0.4)" />
            </>
          )}

          {/* Challenge headphones */}
          {pin.isUnlocked && !pin.isCompleted && (
            <>
              <SvgText x="32" y="22" textAnchor="middle" fill={accentColor} fontSize="10" fontWeight="bold">
                {`P${pin.number}`}
              </SvgText>
              <SvgText x="32" y="42" textAnchor="middle" fill={accentColor} fontSize="18">🎧</SvgText>
            </>
          )}

          {/* Passed state — all correct */}
          {isPassed && (
            <>
              <SvgText x="32" y="38" textAnchor="middle" fill="#f5c518" fontSize="22">🎧</SvgText>
              <Circle cx="50" cy="14" r="10" fill="#155724" stroke="#f5c518" strokeWidth="1.5" />
              <Path
                d="M45 14 L49 18 L56 9"
                stroke="#2ecc71" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
              />
            </>
          )}

          {/* Failed state — any wrong answer */}
          {isFailed && (
            <>
              <SvgText x="32" y="38" textAnchor="middle" fill="#ef4444" fontSize="22">🎧</SvgText>
              <Circle cx="50" cy="14" r="10" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1.5" />
              <Path
                d="M46 10 L54 18 M54 10 L46 18"
                stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" fill="none"
              />
            </>
          )}
        </Svg>

        {/* Label below pin */}
        <View
          style={{
            marginTop: 4,
            paddingHorizontal: 7,
            paddingVertical: 2,
            backgroundColor: "rgba(15,30,48,0.92)",
            borderRadius: 6,
            borderWidth: 1,
            borderColor: isPassed
              ? "rgba(245,197,24,0.35)"
              : isFailed
              ? "rgba(239,68,68,0.45)"
              : pin.isCurrent
              ? `${accentColor}50`
              : "transparent",
          }}
        >
          <Text
            style={{
              color: !pin.isUnlocked
                ? "#374151"
                : isPassed
                ? "#f5c518"
                : isFailed
                ? "#f87171"
                : pin.isCurrent
                ? accentColor
                : "#f4e4c1",
              fontSize: 9,
              fontWeight: "600",
              textAlign: "center",
            }}
          >
            {`CHALLENGE ${pin.number}`}
          </Text>
          {pin.isCompleted && pin.accuracy !== null && (
            <Text
              style={{
                color: pin.accuracy >= 70 ? "#4ade80" : "#f87171",
                fontSize: 9,
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              {`${pin.accuracy}%`}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}
