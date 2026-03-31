import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Svg, { Path, Circle, Rect, Ellipse, Polygon, G, Text as SvgText } from "react-native-svg";
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

// ─── Island 1: Frozen Ocean Background ───────────────────────────────────────
function IceFloe({ x, y, w, h, delay }: { x: number; y: number; w: number; h: number; delay: number }) {
  const tx = useSharedValue(0);
  useEffect(() => {
    tx.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 4000 + delay * 800, easing: Easing.inOut(Easing.sin) }),
        withTiming(8, { duration: 4000 + delay * 800, easing: Easing.inOut(Easing.sin) })
      ),
      -1, true
    );
    return () => { cancelAnimation(tx); };
  }, [delay, tx]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  return (
    <Animated.View
      style={[{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: h / 2, backgroundColor: "rgba(180,230,255,0.15)" }, style]}
      pointerEvents="none"
    />
  );
}

function FrozenOceanBackground({ width, height }: { width: number; height: number }) {
  const waveY = height * 0.75;
  const wavePath = `M 0 ${waveY} Q ${width * 0.25} ${waveY - 14} ${width * 0.5} ${waveY} Q ${width * 0.75} ${waveY + 14} ${width} ${waveY}`;
  return (
    <>
      <Svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }}>
        {/* Ice tint overlay */}
        <Rect x={0} y={0} width={width} height={height} fill="#0d1e35" opacity={0.55} />
        <Rect x={0} y={height * 0.65} width={width} height={height * 0.35} fill="#1a3a5c" opacity={0.22} />
        {/* Frozen ocean surface */}
        <Path d={wavePath} stroke="rgba(100,200,230,0.10)" strokeWidth={2} fill="rgba(100,200,230,0.03)" />
        {/* Frost sparkles */}
        <Circle cx={width * 0.06} cy={height * 0.08} r={2} fill="rgba(180,230,255,0.28)" />
        <Circle cx={width * 0.91} cy={height * 0.13} r={2} fill="rgba(180,230,255,0.25)" />
        <Circle cx={width * 0.14} cy={height * 0.24} r={1.5} fill="rgba(180,230,255,0.22)" />
        <Circle cx={width * 0.82} cy={height * 0.31} r={2} fill="rgba(180,230,255,0.20)" />
        <Circle cx={width * 0.07} cy={height * 0.48} r={1.5} fill="rgba(180,230,255,0.18)" />
        <Circle cx={width * 0.87} cy={height * 0.57} r={2} fill="rgba(180,230,255,0.20)" />
        {/* Frozen vocabulary fragments */}
        <SvgText x={width * 0.06} y={height * 0.18} fontSize={8} fill="rgba(150,210,240,0.20)" fontStyle="italic">...ela...</SvgText>
        <SvgText x={width * 0.60} y={height * 0.36} fontSize={8} fill="rgba(150,210,240,0.16)" fontStyle="italic">...per...</SvgText>
        <SvgText x={width * 0.22} y={height * 0.63} fontSize={8} fill="rgba(150,210,240,0.18)" fontStyle="italic">...scar...</SvgText>
      </Svg>
      {/* Animated ice floes — use height prop (not module-level constant) */}
      <IceFloe x={width * 0.05} y={height * 0.76} w={60} h={18} delay={0} />
      <IceFloe x={width * 0.46} y={height * 0.81} w={40} h={12} delay={1} />
      <IceFloe x={width * 0.64} y={height * 0.73} w={80} h={20} delay={2} />
      <IceFloe x={width * 0.24} y={height * 0.87} w={35} h={10} delay={3} />
    </>
  );
}

// ─── Island 2: Speedy Purple Background ──────────────────────────────────────
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

function SpeedyBackground({ width, height }: { width: number; height: number }) {
  return (
    <>
      <Svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }}>
        {/* Dark purple base */}
        <Rect x={0} y={0} width={width} height={height} fill="#120820" opacity={0.65} />
        {/* Ghost horizontal streaks */}
        {[0.10, 0.18, 0.27, 0.38, 0.47, 0.58, 0.68, 0.79].map((yf, i) => (
          <Path
            key={i}
            d={`M 0 ${height * yf} L ${width} ${height * yf}`}
            stroke="#a569bd"
            strokeWidth="1"
            opacity={i % 2 === 0 ? 0.06 : 0.10}
          />
        ))}
        {/* Diamond accents */}
        <Rect x={width * 0.15 - 5} y={height * 0.20 - 5} width={10} height={10} fill="rgba(142,68,173,0.18)" transform={`rotate(45, ${width * 0.15}, ${height * 0.20})`} />
        <Rect x={width * 0.70 - 5} y={height * 0.35 - 5} width={10} height={10} fill="rgba(142,68,173,0.18)" transform={`rotate(45, ${width * 0.70}, ${height * 0.35})`} />
        <Rect x={width * 0.30 - 5} y={height * 0.55 - 5} width={10} height={10} fill="rgba(142,68,173,0.18)" transform={`rotate(45, ${width * 0.30}, ${height * 0.55})`} />
        <Rect x={width * 0.85 - 5} y={height * 0.65 - 5} width={10} height={10} fill="rgba(142,68,173,0.18)" transform={`rotate(45, ${width * 0.85}, ${height * 0.65})`} />
        <Rect x={width * 0.50 - 5} y={height * 0.80 - 5} width={10} height={10} fill="rgba(142,68,173,0.18)" transform={`rotate(45, ${width * 0.50}, ${height * 0.80})`} />
        {/* Circular ripple arcs */}
        <Circle cx={width * 0.20} cy={height * 0.40} r={30} fill="none" stroke="rgba(142,68,173,0.12)" strokeWidth="1" />
        <Circle cx={width * 0.75} cy={height * 0.70} r={40} fill="none" stroke="rgba(142,68,173,0.10)" strokeWidth="1" />
        {/* Speed text fragments */}
        <SvgText x={width * 0.08} y={height * 0.15} fontSize={8} fill="rgba(165,105,189,0.12)" fontStyle="italic">···</SvgText>
        <SvgText x={width * 0.55} y={height * 0.30} fontSize={8} fill="rgba(165,105,189,0.12)">{">>"}</SvgText>
        <SvgText x={width * 0.28} y={height * 0.62} fontSize={7} fill="rgba(165,105,189,0.12)" fontStyle="italic">fast</SvgText>
        <SvgText x={width * 0.70} y={height * 0.50} fontSize={8} fill="rgba(165,105,189,0.10)">···</SvgText>
        <SvgText x={width * 0.12} y={height * 0.85} fontSize={7} fill="rgba(165,105,189,0.11)">{">>"}</SvgText>
      </Svg>
      {/* Animated speed bolts */}
      <SpeedBolt y={height * 0.15} w={80}  totalWidth={width} delay={0} color="rgba(142,68,173,0.22)" />
      <SpeedBolt y={height * 0.28} w={120} totalWidth={width} delay={1} color="rgba(180,100,220,0.18)" />
      <SpeedBolt y={height * 0.41} w={60}  totalWidth={width} delay={2} color="rgba(142,68,173,0.20)" />
      <SpeedBolt y={height * 0.55} w={100} totalWidth={width} delay={3} color="rgba(160,80,200,0.16)" />
      <SpeedBolt y={height * 0.68} w={80}  totalWidth={width} delay={1} color="rgba(142,68,173,0.22)" />
      <SpeedBolt y={height * 0.82} w={50}  totalWidth={width} delay={4} color="rgba(180,100,220,0.18)" />
    </>
  );
}

// ─── Island 3: Foggy Deep Navy Background ────────────────────────────────────
function FogDrift({ x, y, w, h, delay }: { x: number; y: number; w: number; h: number; delay: number }) {
  const tx = useSharedValue(0);
  useEffect(() => {
    tx.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 6000 + delay * 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(12, { duration: 6000 + delay * 1200, easing: Easing.inOut(Easing.sin) })
      ),
      -1, true
    );
    return () => { tx.value = 0; };
  }, [delay, tx]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  return (
    <Animated.View
      style={[{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: h / 2, backgroundColor: "rgba(160,210,240,0.06)" }, style]}
      pointerEvents="none"
    />
  );
}

function FoggyBackground({ width, height }: { width: number; height: number }) {
  return (
    <>
      <Svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }}>
        {/* Very dark navy base */}
        <Rect x={0} y={0} width={width} height={height} fill="#070e1a" opacity={0.60} />
        <Rect x={0} y={height * 0.60} width={width} height={height * 0.40} fill="#0a1628" opacity={0.18} />
        {/* Horizontal mist bands */}
        <Path d={`M 0 ${height * 0.12} L ${width * 0.80} ${height * 0.12}`} stroke="rgba(120,190,230,1)" strokeWidth="18" opacity={0.04} />
        <Path d={`M ${width * 0.10} ${height * 0.26} L ${width * 0.90} ${height * 0.26}`} stroke="rgba(120,190,230,1)" strokeWidth="22" opacity={0.06} />
        <Path d={`M 0 ${height * 0.42} L ${width * 0.70} ${height * 0.42}`} stroke="rgba(120,190,230,1)" strokeWidth="16" opacity={0.05} />
        <Path d={`M ${width * 0.20} ${height * 0.58} L ${width * 0.95} ${height * 0.58}`} stroke="rgba(120,190,230,1)" strokeWidth="20" opacity={0.08} />
        <Path d={`M 0 ${height * 0.73} L ${width * 0.85} ${height * 0.73}`} stroke="rgba(120,190,230,1)" strokeWidth="14" opacity={0.05} />
        <Path d={`M ${width * 0.05} ${height * 0.88} L ${width * 0.88} ${height * 0.88}`} stroke="rgba(120,190,230,1)" strokeWidth="18" opacity={0.06} />
        {/* Fog halo circles */}
        <Circle cx={width * 0.10} cy={height * 0.20} r={50} fill="none" stroke="rgba(52,152,219,0.08)" strokeWidth="1" />
        <Circle cx={width * 0.85} cy={height * 0.55} r={60} fill="none" stroke="rgba(52,152,219,0.07)" strokeWidth="1" />
        <Circle cx={width * 0.35} cy={height * 0.82} r={45} fill="none" stroke="rgba(52,152,219,0.08)" strokeWidth="1" />
        {/* Ghost text fragments */}
        <SvgText x={width * 0.06} y={height * 0.18} fontSize={8} fill="rgba(100,180,230,0.10)" fontStyle="italic">...main...</SvgText>
        <SvgText x={width * 0.55} y={height * 0.38} fontSize={8} fill="rgba(100,180,230,0.10)" fontStyle="italic">...idea...</SvgText>
        <SvgText x={width * 0.20} y={height * 0.65} fontSize={7} fill="rgba(100,180,230,0.09)" fontStyle="italic">...fog...</SvgText>
      </Svg>
      {/* Animated fog drift banks */}
      <FogDrift x={width * 0.00} y={height *0.12} w={width * 0.65} h={60} delay={0} />
      <FogDrift x={width * 0.35} y={height *0.30} w={width * 0.55} h={50} delay={1} />
      <FogDrift x={width * 0.05} y={height *0.52} w={width * 0.70} h={70} delay={2} />
      <FogDrift x={width * 0.20} y={height *0.70} w={width * 0.60} h={55} delay={3} />
      <FogDrift x={width * 0.00} y={height *0.88} w={width * 0.75} h={65} delay={1} />
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
        withTiming(0.18, { duration: 1200 }),
        withTiming(0.18, { duration: 3000 }),
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
      style={[{ position: "absolute", left: x, top: 0, width: 3, height: 3, borderRadius: 2, backgroundColor: color }, style]}
      pointerEvents="none"
    />
  );
}

function EmberBackground({ width, height }: { width: number; height: number }) {
  return (
    <>
      <Svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }}>
        {/* Very dark charcoal-ash base */}
        <Rect x={0} y={0} width={width} height={height} fill="#100808" opacity={0.65} />
        {/* Subtle grey desaturation wash — conveys emotional flatness */}
        <Rect x={0} y={0} width={width} height={height} fill="#222222" opacity={0.07} />
        {/* Ash dust specks */}
        <Circle cx={width * 0.08} cy={height * 0.12} r={1.5} fill="rgba(180,120,100,0.08)" />
        <Circle cx={width * 0.25} cy={height * 0.22} r={2}   fill="rgba(180,120,100,0.07)" />
        <Circle cx={width * 0.60} cy={height * 0.18} r={1.5} fill="rgba(180,120,100,0.09)" />
        <Circle cx={width * 0.82} cy={height * 0.28} r={2}   fill="rgba(180,120,100,0.07)" />
        <Circle cx={width * 0.15} cy={height * 0.42} r={1.5} fill="rgba(180,120,100,0.08)" />
        <Circle cx={width * 0.45} cy={height * 0.50} r={2}   fill="rgba(180,120,100,0.08)" />
        <Circle cx={width * 0.75} cy={height * 0.55} r={1.5} fill="rgba(180,120,100,0.07)" />
        <Circle cx={width * 0.30} cy={height * 0.68} r={2}   fill="rgba(180,120,100,0.09)" />
        <Circle cx={width * 0.65} cy={height * 0.75} r={1.5} fill="rgba(180,120,100,0.07)" />
        <Circle cx={width * 0.90} cy={height * 0.85} r={2}   fill="rgba(180,120,100,0.08)" />
        {/* Faint warmth glow halos — suppressed emotion trying to surface */}
        <Circle cx={width * 0.20} cy={height * 0.35} r={60} fill="none" stroke="rgba(231,76,60,0.07)" strokeWidth="1" />
        <Circle cx={width * 0.78} cy={height * 0.58} r={55} fill="none" stroke="rgba(231,76,60,0.07)" strokeWidth="1" />
        <Circle cx={width * 0.45} cy={height * 0.82} r={65} fill="none" stroke="rgba(231,76,60,0.06)" strokeWidth="1" />
        {/* Ghost emotion text fragments */}
        <SvgText x={width * 0.07} y={height * 0.20} fontSize={8} fill="rgba(200,100,80,0.09)" fontStyle="italic">...feel...</SvgText>
        <SvgText x={width * 0.52} y={height * 0.42} fontSize={8} fill="rgba(200,100,80,0.09)" fontStyle="italic">...warm...</SvgText>
        <SvgText x={width * 0.20} y={height * 0.70} fontSize={7} fill="rgba(200,100,80,0.08)" fontStyle="italic">...heart...</SvgText>
      </Svg>
      {/* Animated ember floats rising from below */}
      <EmberFloat x={width * 0.12} delay={0} color="rgba(231,76,60,0.18)" canvasHeight={height} />
      <EmberFloat x={width * 0.34} delay={2} color="rgba(200,80,40,0.15)" canvasHeight={height} />
      <EmberFloat x={width * 0.55} delay={1} color="rgba(231,76,60,0.18)" canvasHeight={height} />
      <EmberFloat x={width * 0.72} delay={3} color="rgba(245,130,80,0.14)" canvasHeight={height} />
      <EmberFloat x={width * 0.88} delay={1} color="rgba(231,76,60,0.16)" canvasHeight={height} />
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
        withTiming(0.12, { duration: 2000 }),
        withTiming(0.12, { duration: 4000 }),
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

function ScatteredBackground({ width, height }: { width: number; height: number }) {
  return (
    <>
      <Svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }}>
        {/* Dark amber-brown base */}
        <Rect x={0} y={0} width={width} height={height} fill="#130900" opacity={0.62} />
        {/* Faint ledger grid lines */}
        {[0.15, 0.30, 0.48, 0.64, 0.80].map((yf, i) => (
          <Path key={i} d={`M 0 ${height * yf} L ${width} ${height * yf}`} stroke="rgba(230,126,34,0.04)" strokeWidth="1" />
        ))}
        {/* Scattered number/letter fragments */}
        <SvgText x={width * 0.06} y={height * 0.12} fontSize={9}  fill="rgba(230,126,34,0.09)" transform={`rotate(-14, ${width * 0.06}, ${height * 0.12})`}>42</SvgText>
        <SvgText x={width * 0.28} y={height * 0.22} fontSize={8}  fill="rgba(230,126,34,0.08)" transform={`rotate(10, ${width * 0.28}, ${height * 0.22})`}>3rd</SvgText>
        <SvgText x={width * 0.55} y={height * 0.18} fontSize={9}  fill="rgba(230,126,34,0.10)" transform={`rotate(-8, ${width * 0.55}, ${height * 0.18})`}>A?</SvgText>
        <SvgText x={width * 0.78} y={height * 0.30} fontSize={8}  fill="rgba(230,126,34,0.09)" transform={`rotate(16, ${width * 0.78}, ${height * 0.30})`}>No.</SvgText>
        <SvgText x={width * 0.15} y={height * 0.52} fontSize={10} fill="rgba(230,126,34,0.07)" transform={`rotate(-20, ${width * 0.15}, ${height * 0.52})`}>§</SvgText>
        <SvgText x={width * 0.44} y={height * 0.60} fontSize={8}  fill="rgba(230,126,34,0.08)" transform={`rotate(6, ${width * 0.44}, ${height * 0.60})`}>...</SvgText>
        <SvgText x={width * 0.70} y={height * 0.70} fontSize={9}  fill="rgba(230,126,34,0.10)" transform={`rotate(-12, ${width * 0.70}, ${height * 0.70})`}>±</SvgText>
        <SvgText x={width * 0.88} y={height * 0.45} fontSize={9}  fill="rgba(230,126,34,0.09)" transform={`rotate(22, ${width * 0.88}, ${height * 0.45})`}>{">"}</SvgText>
        {/* Orange lighthouse glow halos */}
        <Circle cx={width * 0.22} cy={height * 0.38} r={55} fill="none" stroke="rgba(230,126,34,0.07)" strokeWidth="1" />
        <Circle cx={width * 0.75} cy={height * 0.72} r={65} fill="none" stroke="rgba(230,126,34,0.06)" strokeWidth="1" />
      </Svg>
      {/* Animated scatter drifts */}
      <ScatterDrift char="7"  x={width * 0.08} startY={height *0.75} angle={-18} delay={0} />
      <ScatterDrift char="B"  x={width * 0.25} startY={height *0.60} angle={12}  delay={1} />
      <ScatterDrift char="?"  x={width * 0.45} startY={height *0.82} angle={-8}  delay={2} />
      <ScatterDrift char="42" x={width * 0.62} startY={height *0.50} angle={22}  delay={3} />
      <ScatterDrift char="C"  x={width * 0.78} startY={height *0.70} angle={-15} delay={1} />
      <ScatterDrift char="!"  x={width * 0.90} startY={height *0.88} angle={10}  delay={4} />
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
        withTiming(0.09, { duration: 2000 }),
        withTiming(0.09, { duration: 8000 }),
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

function StoryBackground({ width, height }: { width: number; height: number }) {
  return (
    <>
      <Svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }}>
        {/* Very dark teal-black base */}
        <Rect x={0} y={0} width={width} height={height} fill="#051510" opacity={0.62} />
        {/* Tilted parchment fragment shapes */}
        <Rect x={width * 0.06} y={height * 0.10} width={38} height={22} rx={3} fill="#f4e4c1" opacity={0.07} transform={`rotate(-14, ${width * 0.06}, ${height * 0.10})`} />
        <Rect x={width * 0.55} y={height * 0.22} width={44} height={26} rx={3} fill="#f4e4c1" opacity={0.06} transform={`rotate(10, ${width * 0.55}, ${height * 0.22})`} />
        <Rect x={width * 0.20} y={height * 0.48} width={36} height={20} rx={3} fill="#f4e4c1" opacity={0.08} transform={`rotate(-8, ${width * 0.20}, ${height * 0.48})`} />
        <Rect x={width * 0.72} y={height * 0.60} width={40} height={24} rx={3} fill="#f4e4c1" opacity={0.07} transform={`rotate(18, ${width * 0.72}, ${height * 0.60})`} />
        <Rect x={width * 0.40} y={height * 0.80} width={34} height={20} rx={3} fill="#f4e4c1" opacity={0.06} transform={`rotate(-12, ${width * 0.40}, ${height * 0.80})`} />
        {/* Teal narrative thread lines */}
        <Path d={`M ${width * 0.05} ${height * 0.18} L ${width * 0.45} ${height * 0.32}`} stroke="rgba(26,188,156,0.07)" strokeWidth="1" />
        <Path d={`M ${width * 0.55} ${height * 0.35} L ${width * 0.90} ${height * 0.55}`} stroke="rgba(26,188,156,0.07)" strokeWidth="1" />
        <Path d={`M ${width * 0.10} ${height * 0.58} L ${width * 0.60} ${height * 0.72}`} stroke="rgba(26,188,156,0.06)" strokeWidth="1" />
        <Path d={`M ${width * 0.30} ${height * 0.85} L ${width * 0.80} ${height * 0.92}`} stroke="rgba(26,188,156,0.06)" strokeWidth="1" />
        {/* Narrative connective text fragments */}
        <SvgText x={width * 0.07} y={height * 0.15} fontSize={8} fill="rgba(26,188,156,0.10)" fontStyle="italic">...then...</SvgText>
        <SvgText x={width * 0.52} y={height * 0.30} fontSize={8} fill="rgba(26,188,156,0.09)" fontStyle="italic">...but...</SvgText>
        <SvgText x={width * 0.18} y={height * 0.55} fontSize={7} fill="rgba(26,188,156,0.10)" fontStyle="italic">...and so...</SvgText>
        <SvgText x={width * 0.65} y={height * 0.68} fontSize={8} fill="rgba(26,188,156,0.09)">[end]</SvgText>
        <SvgText x={width * 0.35} y={height * 0.88} fontSize={8} fill="rgba(26,188,156,0.09)">[?]</SvgText>
        {/* Teal glow halos */}
        <Circle cx={width * 0.18} cy={height * 0.35} r={55} fill="none" stroke="rgba(26,188,156,0.07)" strokeWidth="1" />
        <Circle cx={width * 0.78} cy={height * 0.72} r={60} fill="none" stroke="rgba(26,188,156,0.06)" strokeWidth="1" />
      </Svg>
      {/* Animated scroll drifts */}
      <ScrollDrift x={width * 0.08} delay={0} rotation={-14} canvasHeight={height} />
      <ScrollDrift x={width * 0.28} delay={2} rotation={10}  canvasHeight={height} />
      <ScrollDrift x={width * 0.50} delay={1} rotation={-7}  canvasHeight={height} />
      <ScrollDrift x={width * 0.70} delay={3} rotation={16}  canvasHeight={height} />
      <ScrollDrift x={width * 0.88} delay={1} rotation={-11} canvasHeight={height} />
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
        withTiming(0.18, { duration: 150 }),
        withTiming(0.04, { duration: 300 }),
        withTiming(0.18, { duration: 150 }),
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
        left: x - 2, top: y - 2,
        width: 4, height: 4, borderRadius: 2,
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
        withTiming(0.11, { duration: 300 }),
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
        borderWidth: 1.5, borderColor: "#f5c518",
        backgroundColor: "transparent",
      }, style]}
      pointerEvents="none"
    />
  );
}

function StormBackground({ width, height }: { width: number; height: number }) {
  return (
    <>
      <Svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }}>
        {/* Dark gold-tinged base */}
        <Rect x={0} y={0} width={width} height={height} fill="#0a0700" opacity={0.72} />
        {/* Jagged lightning bolt paths */}
        <Path d={`M ${width*0.12} ${height*0.05} L ${width*0.18} ${height*0.14} L ${width*0.14} ${height*0.14} L ${width*0.20} ${height*0.24}`} stroke="rgba(245,197,24,0.07)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <Path d={`M ${width*0.72} ${height*0.10} L ${width*0.78} ${height*0.20} L ${width*0.74} ${height*0.20} L ${width*0.80} ${height*0.30}`} stroke="rgba(245,197,24,0.07)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <Path d={`M ${width*0.30} ${height*0.52} L ${width*0.36} ${height*0.62} L ${width*0.32} ${height*0.62} L ${width*0.38} ${height*0.72}`} stroke="rgba(245,197,24,0.06)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <Path d={`M ${width*0.60} ${height*0.68} L ${width*0.66} ${height*0.78} L ${width*0.62} ${height*0.78} L ${width*0.68} ${height*0.88}`} stroke="rgba(245,197,24,0.06)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* Cracked ground lines */}
        <Path d={`M ${width*0.05} ${height*0.40} L ${width*0.22} ${height*0.43} L ${width*0.18} ${height*0.46} L ${width*0.35} ${height*0.48}`} stroke="rgba(245,197,24,0.05)" strokeWidth="1" fill="none" />
        <Path d={`M ${width*0.55} ${height*0.55} L ${width*0.70} ${height*0.57} L ${width*0.67} ${height*0.60} L ${width*0.85} ${height*0.62}`} stroke="rgba(245,197,24,0.05)" strokeWidth="1" fill="none" />
        <Path d={`M ${width*0.20} ${height*0.80} L ${width*0.40} ${height*0.83} L ${width*0.36} ${height*0.86}`} stroke="rgba(245,197,24,0.04)" strokeWidth="1" fill="none" />
        {/* Echo text fragments from all 6 islands */}
        <SvgText x={width*0.05} y={height*0.12} fontSize={8} fill="rgba(245,197,24,0.09)" fontStyle="italic">...ela...</SvgText>
        <SvgText x={width*0.68} y={height*0.18} fontSize={8} fill="rgba(245,197,24,0.08)" fontStyle="italic">...fast...</SvgText>
        <SvgText x={width*0.12} y={height*0.38} fontSize={8} fill="rgba(245,197,24,0.09)" fontStyle="italic">...fog...</SvgText>
        <SvgText x={width*0.72} y={height*0.50} fontSize={8} fill="rgba(245,197,24,0.08)" fontStyle="italic">...feel...</SvgText>
        <SvgText x={width*0.08} y={height*0.65} fontSize={8} fill="rgba(245,197,24,0.09)" fontStyle="italic">...42...</SvgText>
        <SvgText x={width*0.60} y={height*0.78} fontSize={8} fill="rgba(245,197,24,0.08)" fontStyle="italic">...then...</SvgText>
        {/* Gold glow halos */}
        <Circle cx={width*0.50} cy={height*0.35} r={70} fill="none" stroke="rgba(245,197,24,0.07)" strokeWidth="1" />
        <Circle cx={width*0.38} cy={height*0.65} r={60} fill="none" stroke="rgba(245,197,24,0.08)" strokeWidth="1" />
        <Circle cx={width*0.82} cy={height*0.20} r={50} fill="none" stroke="rgba(245,197,24,0.06)" strokeWidth="1" />
      </Svg>
      {/* Animated gold flickers */}
      <GoldFlicker x={width * 0.12} y={height *0.08} delay={0} />
      <GoldFlicker x={width * 0.75} y={height *0.22} delay={1} />
      <GoldFlicker x={width * 0.35} y={height *0.45} delay={2} />
      <GoldFlicker x={width * 0.60} y={height *0.60} delay={3} />
      <GoldFlicker x={width * 0.18} y={height *0.75} delay={1} />
      <GoldFlicker x={width * 0.88} y={height *0.85} delay={4} />
      {/* Animated echo rings */}
      <EchoRingBg cx={width * 0.50} cy={height *0.35} delay={0} />
      <EchoRingBg cx={width * 0.38} cy={height *0.65} delay={4} />
    </>
  );
}

// Decorative SVG art per island (rendered in a 60×60 viewBox at the top of the canvas)
function IslandDeco({ islandNum }: { islandNum: number }) {
  switch (islandNum) {
    case 1: // Vocabulary — palm tree
      return (
        <G transform="translate(20, 60)">
          <Path d="M10 56 L11 28" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />
          <Path d="M11 29 Q-2 22 -5 29" stroke="#27ae60" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <Path d="M11 29 Q9 18 15 15" stroke="#2ecc71" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <Path d="M11 29 Q20 21 24 28" stroke="#27ae60" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </G>
      );
    case 2: // Speed — lightning bolt
      return (
        <G transform="translate(12, 55)">
          <Polygon points="10,4 4,20 8,20 5,36 18,16 12,16 16,4" fill="#f5c518" opacity={0.35} />
        </G>
      );
    case 3: // Main Idea — mountain
      return (
        <G transform="translate(15, 50)">
          <Path d="M0 40 L18 8 L36 40 Z" fill="#5d7a8a" opacity={0.3} />
          <Path d="M10 20 L18 8 L26 20 Q18 18 10 20 Z" fill="white" opacity={0.25} />
        </G>
      );
    case 4: // Emotion — flame
      return (
        <G transform="translate(18, 55)">
          <Path d="M10 36 Q4 24 10 16 Q8 26 16 20 Q10 30 18 36 Z" fill="#e74c3c" opacity={0.3} />
        </G>
      );
    case 5: // Specific — lighthouse
      return (
        <G transform="translate(18, 50)">
          <Rect x="6" y="12" width="8" height="24" rx="1" fill="white" opacity={0.25} />
          <Circle cx="10" cy="12" r="5" fill="#f5c518" opacity={0.3} />
        </G>
      );
    case 6: // Narrative — scroll
      return (
        <G transform="translate(14, 52)">
          <Rect x="2" y="8" width="24" height="18" rx="3" fill="#f4e4c1" opacity={0.25} />
          <Ellipse cx="2" cy="17" rx="3" ry="9" fill="#e8cfa0" opacity={0.2} />
        </G>
      );
    case 7: // Final — crystal
      return (
        <G transform="translate(16, 52)">
          <Polygon points="14,4 6,22 14,28 22,22" fill="#f5c518" opacity={0.28} />
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

  // Compute pin states
  const pins = island.pins ?? [];
  const pinStates = pins.map((pin: any, idx: number) => {
    const isCompleted = pin.isCompleted ?? false;
    // Completed pins are always re-enterable; new pins require previous pin passed at 100%
    const isUnlocked = idx === 0 || isCompleted || (pins[idx - 1]?.isCompleted ?? false);
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
            <Path d={ropePath} stroke="#6b4f1a" strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray="12,8" />
            {/* Rope highlight */}
            <Path
              d={ropePath}
              stroke="#c4942a"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="12,8"
              strokeDashoffset="5"
              opacity={0.55}
            />
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

    </SafeAreaView>
  );
}

// ─── Pin Node ────────────────────────────────────────────────────────────────

function PinNode({
  pin, pos, accentColor, onPress,
}: {
  pin: any;
  pos: { x: number; y: number };
  accentColor: string;
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
            fill={!pin.isUnlocked ? "#1c2a38" : "#0f1e30"}
            stroke={ringColor}
            strokeWidth={ringWidth}
            opacity={!pin.isUnlocked ? 0.5 : 1}
          />

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
