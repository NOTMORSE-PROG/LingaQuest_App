import { useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Svg, {
  Path, Circle, Ellipse, Rect, Polygon, G, Line,
  Text as SvgText, Defs, LinearGradient, RadialGradient, Stop,
} from "react-native-svg";
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, Easing, cancelAnimation,
} from "react-native-reanimated";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { Island, IslandProgress } from "@/types";
import { MuteButton } from "@/components/audio/MuteButton";

const NODE_R = 48;       // island circle radius (upgraded from 36)
const LPAD = 32;         // extra horizontal padding for labels

// Fractional positions of each island center (xf * SW, yf * CANVAS_H)
const POS_FRACS = [
  { xf: 0.50, yf: 0.065 },
  { xf: 0.22, yf: 0.178 },
  { xf: 0.76, yf: 0.293 },
  { xf: 0.24, yf: 0.408 },
  { xf: 0.76, yf: 0.523 },
  { xf: 0.24, yf: 0.638 },
  { xf: 0.50, yf: 0.800 },
];

// Per-island visual theme
const OCEAN_COLORS = ["#1e5631", "#4a235a", "#1a4a6e", "#7d1515", "#7e3a0a", "#0e6655", "#7d6608"];
const LAND_COLORS  = ["#27ae60", "#8e44ad", "#3498db", "#e74c3c", "#e67e22", "#1abc9c", "#f5c518"];

// Build rope sub-path between two consecutive islands
function buildSegmentPath(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  const mid = ((p1.y + p2.y) / 2).toFixed(0);
  return `M ${p1.x.toFixed(0)} ${p1.y.toFixed(0)} C ${p1.x.toFixed(0)} ${mid}, ${p2.x.toFixed(0)} ${mid}, ${p2.x.toFixed(0)} ${p2.y.toFixed(0)}`;
}

// Midpoint of a bezier segment (approximate)
function segmentMidpoint(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

// ─── Animated Components ─────────────────────────────────────────────────────

function AnimatedWave({ yOffset, amplitude, period, color, sw, canvasH }: {
  yOffset: number; amplitude: number; period: number; color: string; sw: number; canvasH: number;
}) {
  const tx = useSharedValue(0);
  useEffect(() => {
    tx.value = withRepeat(
      withSequence(
        withTiming(-20, { duration: period, easing: Easing.inOut(Easing.sin) }),
        withTiming(20, { duration: period, easing: Easing.inOut(Easing.sin) })
      ),
      -1, true
    );
    return () => { cancelAnimation(tx); };
  }, [period, tx]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));

  const y = Math.round(yOffset * canvasH);
  return (
    <Animated.View
      style={[{ position: "absolute", top: 0, left: -30, width: sw + 60, height: canvasH }, style]}
      pointerEvents="none"
    >
      <Svg width={sw + 60} height={canvasH}>
        <Path
          d={`M -30 ${y} Q ${sw * 0.15} ${y - amplitude} ${sw * 0.3} ${y} Q ${sw * 0.45} ${y + amplitude} ${sw * 0.6} ${y} Q ${sw * 0.75} ${y - amplitude * 0.8} ${sw + 30} ${y}`}
          stroke={color}
          strokeWidth="2"
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
}

function CausticPulse({ cx, cy, rx, ry, delay }: {
  cx: number; cy: number; rx: number; ry: number; delay: number;
}) {
  const opacity = useSharedValue(0.03);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.03, { duration: delay * 400 }),
        withTiming(0.09, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.03, { duration: 2500, easing: Easing.inOut(Easing.sin) })
      ),
      -1, false
    );
    return () => cancelAnimation(opacity);
  }, [delay, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[{ position: "absolute", left: cx - rx, top: cy - ry, width: rx * 2, height: ry * 2, borderRadius: rx, backgroundColor: "rgba(52,152,219,0.5)" }, style]}
      pointerEvents="none"
    />
  );
}

function FloatingElement({ children, x, y, driftX, driftY, period }: {
  children: React.ReactNode; x: number; y: number; driftX: number; driftY: number; period: number;
}) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  useEffect(() => {
    tx.value = withRepeat(
      withSequence(
        withTiming(-driftX, { duration: period, easing: Easing.inOut(Easing.sin) }),
        withTiming(driftX, { duration: period, easing: Easing.inOut(Easing.sin) })
      ),
      -1, true
    );
    ty.value = withRepeat(
      withSequence(
        withTiming(-driftY, { duration: period * 0.8, easing: Easing.inOut(Easing.sin) }),
        withTiming(driftY, { duration: period * 0.8, easing: Easing.inOut(Easing.sin) })
      ),
      -1, true
    );
    return () => { cancelAnimation(tx); cancelAnimation(ty); };
  }, [driftX, driftY, period, tx, ty]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));
  return (
    <Animated.View style={[{ position: "absolute", left: x, top: y }, style]} pointerEvents="none">
      {children}
    </Animated.View>
  );
}

function RisingBubble({ x, startY, size, delay, canvasH }: {
  x: number; startY: number; size: number; delay: number; canvasH: number;
}) {
  const ty = useSharedValue(0);
  const opacity = useSharedValue(0);
  useEffect(() => {
    ty.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(-(startY * 0.4), { duration: 7000 + delay * 600, easing: Easing.linear })
      ),
      -1, false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay * 500 }),
        withTiming(0.2, { duration: 1000 }),
        withTiming(0.15, { duration: 4000 }),
        withTiming(0, { duration: 1500 })
      ),
      -1, false
    );
    return () => { cancelAnimation(ty); cancelAnimation(opacity); };
  }, [delay, startY, ty, opacity, canvasH]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
    opacity: opacity.value,
  }));
  return (
    <Animated.View
      style={[{
        position: "absolute", left: x - size, top: startY - size,
        width: size * 2, height: size * 2, borderRadius: size,
        backgroundColor: "rgba(255,255,255,0.5)",
      }, style]}
      pointerEvents="none"
    />
  );
}

function TwinkleStar({ x, y, size, delay }: {
  x: number; y: number; size: number; delay: number;
}) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay * 500 }),
        withTiming(0.5, { duration: 400 }),
        withTiming(0.15, { duration: 600 }),
        withTiming(0.5, { duration: 400 }),
        withTiming(0, { duration: 800 })
      ),
      -1, false
    );
    return () => cancelAnimation(opacity);
  }, [delay, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const half = size;
  return (
    <Animated.View style={[{ position: "absolute", left: x - half, top: y - half, width: half * 2, height: half * 2 }, style]} pointerEvents="none">
      <Svg width={half * 2} height={half * 2}>
        <Path
          d={`M ${half} 0 L ${half + half * 0.3} ${half - half * 0.3} L ${half * 2} ${half} L ${half + half * 0.3} ${half + half * 0.3} L ${half} ${half * 2} L ${half - half * 0.3} ${half + half * 0.3} L 0 ${half} L ${half - half * 0.3} ${half - half * 0.3} Z`}
          fill="#f5c518"
        />
      </Svg>
    </Animated.View>
  );
}

function SwayingSeaweed({ x, y, height, delay, color }: {
  x: number; y: number; height: number; delay: number; color: string;
}) {
  const tx = useSharedValue(0);
  useEffect(() => {
    tx.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 5000 + delay * 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(6, { duration: 5000 + delay * 700, easing: Easing.inOut(Easing.sin) })
      ),
      -1, true
    );
    return () => cancelAnimation(tx);
  }, [delay, tx]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  return (
    <Animated.View style={[{ position: "absolute", left: x, top: y - height }, style]} pointerEvents="none">
      <Svg width={20} height={height}>
        <Path
          d={`M 10 ${height} Q 4 ${height * 0.7} 12 ${height * 0.5} Q 6 ${height * 0.3} 10 0`}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
}

function RockingShip({ x, y, sw, canvasH }: { x: number; y: number; sw: number; canvasH: number }) {
  const rot = useSharedValue(0);
  const ty = useSharedValue(0);
  useEffect(() => {
    rot.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(3, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1, true
    );
    ty.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(4, { duration: 2400, easing: Easing.inOut(Easing.sin) })
      ),
      -1, true
    );
    return () => { cancelAnimation(rot); cancelAnimation(ty); };
  }, [rot, ty]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }, { rotate: `${rot.value}deg` }],
  }));
  return (
    <Animated.View style={[{ position: "absolute", left: x, top: y }, style]} pointerEvents="none">
      <Svg width={60} height={50}>
        {/* Hull */}
        <Path d="M0 24 Q30 38 60 24 L52 8 L8 8 Z" fill="#5d3a1a" stroke="#3e2410" strokeWidth="1.5" />
        <Path d="M5 14 L55 14" stroke="#c8a415" strokeWidth="1.5" />
        {/* Mast */}
        <Line x1="30" y1="8" x2="30" y2="-28" stroke="#3e2410" strokeWidth="2.5" />
        {/* Main sail */}
        <Path d="M30 -26 L54 -10 L30 0 Z" fill="rgba(244,228,193,0.9)" stroke="#d4b896" strokeWidth="1" />
        {/* Flag */}
        <Polygon points="30,-28 42,-23 30,-18" fill="#e94560" />
        {/* Coral accent sail */}
        <Path d="M30 -14 L12 -4 L30 2 Z" fill="rgba(233,69,96,0.3)" stroke="rgba(233,69,96,0.5)" strokeWidth="0.5" />
        {/* Porthole */}
        <Circle cx="20" cy="16" r="3" fill="#1a1a2e" stroke="#c8a415" strokeWidth="1" />
        <Circle cx="40" cy="16" r="3" fill="#1a1a2e" stroke="#c8a415" strokeWidth="1" />
      </Svg>
    </Animated.View>
  );
}

function WhaleSpout({ x, y }: { x: number; y: number }) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 3000 }),
        withTiming(0.5, { duration: 800 }),
        withTiming(0.5, { duration: 1200 }),
        withTiming(0, { duration: 800 })
      ),
      -1, false
    );
    return () => cancelAnimation(opacity);
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[{ position: "absolute", left: x - 8, top: y - 22 }, style]} pointerEvents="none">
      <Svg width={16} height={22}>
        <Path d="M4 22 Q2 12 6 4" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <Path d="M12 22 Q14 12 10 4" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" fill="none" />
        <Circle cx="8" cy="2" r="2" fill="rgba(255,255,255,0.4)" />
      </Svg>
    </Animated.View>
  );
}

function CloudDrift({ x, y, w, h, delay }: { x: number; y: number; w: number; h: number; delay: number }) {
  const tx = useSharedValue(0);
  useEffect(() => {
    tx.value = withRepeat(
      withSequence(
        withTiming(-15, { duration: 10000 + delay * 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(15, { duration: 10000 + delay * 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1, true
    );
    return () => cancelAnimation(tx);
  }, [delay, tx]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  return (
    <Animated.View style={[{ position: "absolute", left: x, top: y }, style]} pointerEvents="none">
      <Svg width={w} height={h}>
        <Ellipse cx={w * 0.5} cy={h * 0.55} rx={w * 0.45} ry={h * 0.4} fill="rgba(255,255,255,0.10)" />
        <Ellipse cx={w * 0.3} cy={h * 0.45} rx={w * 0.3} ry={h * 0.35} fill="rgba(255,255,255,0.08)" />
        <Ellipse cx={w * 0.7} cy={h * 0.5} rx={w * 0.28} ry={h * 0.32} fill="rgba(255,255,255,0.07)" />
      </Svg>
    </Animated.View>
  );
}

// SVG art for each island (drawn in a 96×96 viewBox — upgraded from 72×72)
function IslandArt({ idx }: { idx: number }) {
  switch (idx) {
    case 0: // Vocabulary — tropical palm
      return (
        <>
          <Ellipse cx="48" cy="69" rx="35" ry="19" fill="#c8a96e" />
          <Ellipse cx="48" cy="68" rx="30" ry="14" fill="#e8d5a8" opacity={0.3} />
          <Path d="M45 67 L47 29" stroke="#5d4037" strokeWidth="5" strokeLinecap="round" />
          <Path d="M47 30 Q24 20 17 31" stroke="#27ae60" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <Path d="M47 30 Q40 12 50 8" stroke="#2ecc71" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <Path d="M47 30 Q61 17 69 29" stroke="#27ae60" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <Path d="M47 30 Q55 14 62 18" stroke="#1abc9c" strokeWidth="3" strokeLinecap="round" fill="none" />
          <Circle cx="17" cy="32" r="4.5" fill="#d4a756" />
          <Circle cx="22" cy="38" r="3" fill="#c8a415" />
        </>
      );
    case 1: // Speed — lightning bolt
      return (
        <>
          <Ellipse cx="48" cy="72" rx="33" ry="16" fill="#4a235a" />
          <Circle cx="48" cy="48" r="28" fill="rgba(142,68,173,0.15)" />
          <Polygon
            points="49,14 35,47 44,47 37,81 68,44 53,44 64,14"
            fill="#f5c518" stroke="#e67e22" strokeWidth="2"
          />
          <Path d="M35 20 L28 14" stroke="#f5c518" strokeWidth="1.5" opacity={0.4} />
          <Path d="M65 20 L72 14" stroke="#f5c518" strokeWidth="1.5" opacity={0.4} />
        </>
      );
    case 2: // Main Idea — mountain with cloud
      return (
        <>
          <Ellipse cx="48" cy="73" rx="35" ry="17" fill="#2c6e49" />
          <Path d="M13 73 L48 16 L83 73 Z" fill="#5d7a8a" />
          <Path d="M30 42 L48 16 L66 42 Q48 38 30 42 Z" fill="white" />
          <Path d="M13 73 L48 16 L48 73 Z" fill="rgba(93,122,138,0.7)" />
          <Ellipse cx="72" cy="35" rx="12" ry="8" fill="rgba(255,255,255,0.75)" />
          <Ellipse cx="67" cy="39" rx="9" ry="7" fill="rgba(255,255,255,0.6)" />
          <Circle cx="25" cy="60" r="3" fill="#2c6e49" opacity={0.5} />
          <Circle cx="70" cy="62" r="2.5" fill="#2c6e49" opacity={0.4} />
        </>
      );
    case 3: // Emotion — volcano
      return (
        <>
          <Ellipse cx="48" cy="75" rx="35" ry="16" fill="#7d1515" />
          <Path d="M16 75 L48 19 L80 75 Z" fill="#c0392b" />
          <Path d="M16 75 L48 19 L48 75 Z" fill="#a93226" />
          <Ellipse cx="48" cy="21" rx="13" ry="9" fill="#ff6b35" />
          <Ellipse cx="48" cy="19" rx="7" ry="5" fill="#f5c518" />
          <Path d="M40 13 Q37 5 43 3" stroke="#ff9900" strokeWidth="3" strokeLinecap="round" fill="none" opacity={0.8} />
          <Path d="M48 11 Q48 3 50 0" stroke="#ff6b35" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity={0.6} />
          <Path d="M55 13 Q60 7 57 3" stroke="#e67e22" strokeWidth="2" strokeLinecap="round" fill="none" opacity={0.5} />
          {/* Lava streams */}
          <Path d="M42 35 Q38 55 35 70" stroke="#ff6b35" strokeWidth="2" opacity={0.3} fill="none" />
          <Path d="M54 35 Q58 55 61 70" stroke="#ff6b35" strokeWidth="1.5" opacity={0.25} fill="none" />
        </>
      );
    case 4: // Specific Info — lighthouse
      return (
        <>
          <Ellipse cx="48" cy="72" rx="35" ry="19" fill="#c8a96e" />
          <Ellipse cx="48" cy="71" rx="28" ry="12" fill="#e8d5a8" opacity={0.3} />
          <Rect x="41" y="29" width="14" height="43" rx="2" fill="white" stroke="#ccc" strokeWidth="2" />
          <Rect x="41" y="37" width="14" height="7" fill="#e74c3c" />
          <Rect x="41" y="52" width="14" height="7" fill="#e74c3c" />
          <Circle cx="48" cy="29" r="10" fill="#f5c518" stroke="#e67e22" strokeWidth="2" />
          {/* Light beams */}
          <Path d="M58 24 L78 13" stroke="#f5c518" strokeWidth="2.5" strokeLinecap="round" opacity={0.6} />
          <Path d="M58 29 L76 35" stroke="#f5c518" strokeWidth="2" strokeLinecap="round" opacity={0.35} />
          <Path d="M38 24 L18 13" stroke="#f5c518" strokeWidth="2" strokeLinecap="round" opacity={0.4} />
          {/* Rocks */}
          <Ellipse cx="22" cy="72" rx="8" ry="5" fill="#8b7355" opacity={0.5} />
          <Ellipse cx="74" cy="73" rx="6" ry="4" fill="#7a6548" opacity={0.4} />
        </>
      );
    case 5: // Narrative — scroll
      return (
        <>
          <Ellipse cx="48" cy="69" rx="35" ry="19" fill="#16a085" />
          <Rect x="25" y="27" width="46" height="35" rx="5" fill="#f4e4c1" stroke="#d4a756" strokeWidth="2" />
          <Ellipse cx="25" cy="44" rx="7" ry="17" fill="#e8cfa0" stroke="#d4a756" strokeWidth="2" />
          <Ellipse cx="71" cy="44" rx="7" ry="17" fill="#e8cfa0" stroke="#d4a756" strokeWidth="2" />
          <Path d="M33 35 L63 35" stroke="#a0785a" strokeWidth="2.5" strokeLinecap="round" />
          <Path d="M33 44 L63 44" stroke="#a0785a" strokeWidth="2.5" strokeLinecap="round" />
          <Path d="M33 53 L51 53" stroke="#a0785a" strokeWidth="2.5" strokeLinecap="round" />
          {/* Quill */}
          <Path d="M66 25 L74 14" stroke="#d4a756" strokeWidth="2" strokeLinecap="round" />
          <Path d="M74 14 Q78 10 76 8 Q74 10 70 12" fill="#f4e4c1" />
        </>
      );
    case 6: // Final — crystal spire
      return (
        <>
          <Ellipse cx="48" cy="75" rx="36" ry="16" fill="#b7950b" />
          <Polygon points="48,10 29,53 48,67 67,53" fill="#f5c518" stroke="#e67e22" strokeWidth="2" />
          <Polygon points="48,10 36,53 48,67" fill="#f7d060" opacity={0.5} />
          <Circle cx="48" cy="37" r="19" fill="rgba(245,197,24,0.15)" />
          {/* Stars */}
          <Path d="M21 27 L23 17 L27 27 L34 29 L27 32 L23 41 L21 32 L12 29 Z" fill="#f5c518" />
          <Path d="M69 37 L72 29 L75 37 L83 40 L75 43 L72 51 L69 43 L61 40 Z" fill="#f5c518" opacity={0.8} />
          <Path d="M40 70 L41 66 L43 70 L47 71 L43 72 L41 76 L40 72 L36 71 Z" fill="#ffd700" opacity={0.6} />
          {/* Crown glow */}
          <Circle cx="48" cy="10" r="5" fill="rgba(255,215,0,0.3)" />
        </>
      );
    default:
      return null;
  }
}

// Star shape path builder for decorative stars
function starPath(cx: number, cy: number, outerR: number, innerR: number) {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return `M ${points.join(" L ")} Z`;
}

export default function MapScreen() {
  const { width: sw } = useWindowDimensions();
  const CANVAS_H = Math.round(sw * 3.0); // slightly taller for breathing room with bigger islands

  const { user } = useAuthStore();

  const {
    data: islands,
    isLoading,
    isError: isIslandsError,
    refetch: refetchIslands,
  } = useQuery({
    queryKey: ["islands"],
    queryFn: () => apiClient.getIslands(),
    refetchOnMount: true,
  });

  const { data: progress, isError: isProgressError } = useQuery({
    queryKey: ["progress", user?.id],
    queryFn: () => apiClient.getProgress(),
    enabled: !!user,
    refetchOnMount: true,
  });

  if (isLoading) {
    return (
      <View className="flex-1 bg-ocean-deep items-center justify-center">
        <ActivityIndicator color="#f5c518" size="large" />
        <Text className="text-parchment mt-4 text-sm">Loading the Listening Sea...</Text>
      </View>
    );
  }

  if (isIslandsError || isProgressError || !islands) {
    return (
      <View className="flex-1 bg-ocean-deep items-center justify-center px-8">
        <Text className="text-5xl mb-4">🌊</Text>
        <Text className="text-gold text-xl font-bold text-center mb-2">The sea is unreachable</Text>
        <Text className="text-parchment text-sm text-center mb-8">
          Could not load the map. Check your connection and try again.
        </Text>
        <TouchableOpacity
          onPress={() => refetchIslands()}
          className="bg-gold rounded-xl px-8 py-3 w-full items-center"
        >
          <Text className="text-ocean-deep font-bold">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const completedSet = new Set<string>(
    (progress ?? [])
      .filter((p: IslandProgress) => p.isCompleted)
      .map((p: IslandProgress) => p.islandId)
  );
  const completedCount = completedSet.size;

  const positions = POS_FRACS.map((p) => ({ x: p.xf * sw, y: p.yf * CANVAS_H }));

  const currentIdx = (islands as Island[]).findIndex(
    (isl) => !isl.isLocked && !completedSet.has(isl.id)
  );

  return (
    <View style={{ flex: 1 }}>
      <MuteButton />
    <ScrollView className="flex-1 bg-ocean-deep" showsVerticalScrollIndicator={false}>
      {/* ── Header with Progress Bar ────────────────────── */}
      <View className="px-6 pt-14 pb-2">
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <Text className="text-gold text-3xl font-bold">The Listening Sea</Text>
            <Text className="text-parchment-dark text-sm mt-1">Seven islands. Seven skills. One legend.</Text>
          </View>
        </View>
        {/* Progress bar */}
        <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center" }}>
          <View style={{
            flex: 1, height: 10, borderRadius: 5,
            backgroundColor: "rgba(15,52,96,0.6)", borderWidth: 1, borderColor: "rgba(245,197,24,0.2)",
          }}>
            <View style={{
              width: `${Math.round((completedCount / 7) * 100)}%` as unknown as number,
              height: "100%", borderRadius: 5,
              backgroundColor: "#f5c518",
            }} />
          </View>
          <Text style={{ color: "#f5c518", fontSize: 12, fontWeight: "700", marginLeft: 8 }}>
            {completedCount}/7
          </Text>
        </View>
      </View>

      {/* ── Map canvas ──────────────────────────────────── */}
      <View style={{ width: sw, height: CANVAS_H + 60, position: "relative" }}>

        {/* ── Background SVG ─────────────────────────────── */}
        <Svg width={sw} height={CANVAS_H + 60} style={{ position: "absolute", top: 0, left: 0 }}>
          <Defs>
            {/* Ocean gradient */}
            <LinearGradient id="oceanGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#0f3460" stopOpacity="1" />
              <Stop offset="0.25" stopColor="#16213e" stopOpacity="1" />
              <Stop offset="0.6" stopColor="#1a1a2e" stopOpacity="1" />
              <Stop offset="1" stopColor="#0d0d1a" stopOpacity="1" />
            </LinearGradient>
            {/* Sun glow */}
            <RadialGradient id="sunGlow" cx="0.5" cy="0.5" rx="0.5" ry="0.5">
              <Stop offset="0" stopColor="#f5c518" stopOpacity="0.2" />
              <Stop offset="0.6" stopColor="#f5c518" stopOpacity="0.05" />
              <Stop offset="1" stopColor="#f5c518" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Gradient background */}
          <Rect x="0" y="0" width={sw} height={CANVAS_H + 60} fill="url(#oceanGrad)" />

          {/* Per-island biome color zones */}
          {positions.map((pos, i) => (
            <Circle key={`zone-${i}`} cx={pos.x} cy={pos.y} r={90} fill={OCEAN_COLORS[i]} opacity={0.06} />
          ))}

          {/* Sun glow — top right */}
          <Circle cx={sw - 40} cy={30} r={50} fill="url(#sunGlow)" />

          {/* ── Static wave lines (more visible) ────────── */}
          {[
            { yf: 0.08, amp: 12, color: "rgba(52,152,219,0.08)" },
            { yf: 0.16, amp: 16, color: "rgba(255,255,255,0.06)" },
            { yf: 0.26, amp: 10, color: "rgba(52,152,219,0.07)" },
            { yf: 0.36, amp: 18, color: "rgba(255,255,255,0.05)" },
            { yf: 0.46, amp: 14, color: "rgba(52,152,219,0.06)" },
            { yf: 0.56, amp: 20, color: "rgba(255,255,255,0.05)" },
            { yf: 0.66, amp: 12, color: "rgba(52,152,219,0.07)" },
            { yf: 0.76, amp: 16, color: "rgba(255,255,255,0.06)" },
            { yf: 0.86, amp: 14, color: "rgba(52,152,219,0.08)" },
            { yf: 0.94, amp: 10, color: "rgba(255,255,255,0.05)" },
          ].map(({ yf, amp, color }, i) => {
            const y = Math.round(yf * CANVAS_H);
            return (
              <Path
                key={`wave-${i}`}
                d={`M 0 ${y} Q ${sw * 0.25} ${y - amp} ${sw * 0.5} ${y} Q ${sw * 0.75} ${y + amp} ${sw} ${y}`}
                stroke={color}
                strokeWidth="2"
                fill="none"
              />
            );
          })}

          {/* ── Seagulls — top zone ─────────────────────── */}
          <Path d={`M ${sw * 0.18} ${CANVAS_H * 0.025} Q ${sw * 0.20} ${CANVAS_H * 0.018} ${sw * 0.22} ${CANVAS_H * 0.025}`} stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" fill="none" />
          <Path d={`M ${sw * 0.65} ${CANVAS_H * 0.035} Q ${sw * 0.67} ${CANVAS_H * 0.028} ${sw * 0.69} ${CANVAS_H * 0.035}`} stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" fill="none" />
          <Path d={`M ${sw * 0.40} ${CANVAS_H * 0.015} Q ${sw * 0.42} ${CANVAS_H * 0.008} ${sw * 0.44} ${CANVAS_H * 0.015}`} stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none" />

          {/* ── Rope segments (color-coded by progress) ─── */}
          {positions.map((pos, i) => {
            if (i === 0) return null;
            const prev = positions[i - 1];
            const segPath = buildSegmentPath(prev, pos);
            const isl = (islands as Island[])[i];
            const prevIsl = (islands as Island[])[i - 1];
            const segCompleted = completedSet.has(prevIsl?.id ?? "") && completedSet.has(isl?.id ?? "");
            const segAvailable = !isl?.isLocked;

            return (
              <G key={`rope-${i}`}>
                {/* Shadow */}
                <Path d={segPath} stroke="rgba(0,0,0,0.25)" strokeWidth="10" fill="none" strokeLinecap="round" />
                {/* Main trail */}
                <Path
                  d={segPath}
                  stroke={segCompleted ? "#d4a756" : segAvailable ? "#8b6f3a" : "#3a3a4a"}
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Gold dotted overlay */}
                <Path
                  d={segPath}
                  stroke={segCompleted ? "#f5c518" : "rgba(200,164,21,0.3)"}
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="3,10"
                />
                {/* Completed glow */}
                {segCompleted && (
                  <Path d={segPath} stroke="rgba(245,197,24,0.12)" strokeWidth="16" fill="none" strokeLinecap="round" />
                )}
              </G>
            );
          })}

          {/* ── Waypoint markers at segment midpoints ───── */}
          {positions.map((pos, i) => {
            if (i === 0) return null;
            const mid = segmentMidpoint(positions[i - 1], pos);
            const isl = (islands as Island[])[i];
            const prevIsl = (islands as Island[])[i - 1];
            const segCompleted = completedSet.has(prevIsl?.id ?? "") && completedSet.has(isl?.id ?? "");

            if (segCompleted) {
              // Gold X marker
              return (
                <G key={`wp-${i}`}>
                  <Circle cx={mid.x} cy={mid.y} r={8} fill="rgba(245,197,24,0.15)" />
                  <Path d={`M ${mid.x - 4} ${mid.y - 4} L ${mid.x + 4} ${mid.y + 4}`} stroke="#f5c518" strokeWidth="2" strokeLinecap="round" />
                  <Path d={`M ${mid.x + 4} ${mid.y - 4} L ${mid.x - 4} ${mid.y + 4}`} stroke="#f5c518" strokeWidth="2" strokeLinecap="round" />
                </G>
              );
            }
            if (isl?.isLocked) {
              // Tiny skull
              return (
                <G key={`wp-${i}`} opacity={0.2}>
                  <Circle cx={mid.x} cy={mid.y - 2} r={5} fill="rgba(255,255,255,0.3)" />
                  <Circle cx={mid.x - 2} cy={mid.y - 3} r={1.2} fill="#1a1a2e" />
                  <Circle cx={mid.x + 2} cy={mid.y - 3} r={1.2} fill="#1a1a2e" />
                  <Path d={`M ${mid.x - 3} ${mid.y + 3} L ${mid.x + 3} ${mid.y + 3}`} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                </G>
              );
            }
            return null;
          })}

          {/* ── Compass rose — top-right (upgraded 2x) ──── */}
          <G transform={`translate(${sw - 78}, 20)`}>
            <Circle cx="28" cy="28" r="26" fill="rgba(245,197,24,0.08)" stroke="rgba(245,197,24,0.35)" strokeWidth="2" />
            <Circle cx="28" cy="28" r="22" fill="none" stroke="rgba(245,197,24,0.15)" strokeWidth="1" />
            {/* N — gold */}
            <Polygon points="28,4 23,22 28,18 33,22" fill="#f5c518" />
            {/* S */}
            <Polygon points="28,52 23,34 28,38 33,34" fill="rgba(255,255,255,0.3)" />
            {/* E */}
            <Polygon points="52,28 34,23 38,28 34,33" fill="rgba(255,255,255,0.3)" />
            {/* W */}
            <Polygon points="4,28 22,23 18,28 22,33" fill="rgba(255,255,255,0.3)" />
            {/* NE/SE/SW/NW ticks */}
            <Line x1="44" y1="12" x2="40" y2="16" stroke="rgba(245,197,24,0.25)" strokeWidth="1.5" />
            <Line x1="44" y1="44" x2="40" y2="40" stroke="rgba(245,197,24,0.2)" strokeWidth="1.5" />
            <Line x1="12" y1="44" x2="16" y2="40" stroke="rgba(245,197,24,0.2)" strokeWidth="1.5" />
            <Line x1="12" y1="12" x2="16" y2="16" stroke="rgba(245,197,24,0.2)" strokeWidth="1.5" />
            <Circle cx="28" cy="28" r="5" fill="#f5c518" />
            <Circle cx="28" cy="28" r="2.5" fill="#1a1a2e" />
            <SvgText x="28" y="0" textAnchor="middle" fill="#f5c518" fontSize="9" fontWeight="bold">N</SvgText>
            <SvgText x="28" y="62" textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="7">S</SvgText>
            <SvgText x="58" y="31" textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="7">E</SvgText>
            <SvgText x="-2" y="31" textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="7">W</SvgText>
          </G>

          {/* ── Sea serpent (upper-mid zone, right) ──────── */}
          <Path
            d={`M ${sw * 0.82} ${CANVAS_H * 0.22} Q ${sw * 0.88} ${CANVAS_H * 0.20} ${sw * 0.92} ${CANVAS_H * 0.23} Q ${sw * 0.96} ${CANVAS_H * 0.26} ${sw * 0.90} ${CANVAS_H * 0.28} Q ${sw * 0.84} ${CANVAS_H * 0.30} ${sw * 0.88} ${CANVAS_H * 0.32}`}
            stroke="#1abc9c"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            opacity={0.18}
          />
          <Circle cx={sw * 0.82} cy={CANVAS_H * 0.22} r={4} fill="#1abc9c" opacity={0.22} />
          <Circle cx={sw * 0.81} cy={CANVAS_H * 0.218} r={1.5} fill="#fff" opacity={0.3} />

          {/* ── School of fish (upper-mid zone, left) ────── */}
          {[
            { dx: 0, dy: 0 }, { dx: 8, dy: -5 }, { dx: 6, dy: 6 },
            { dx: 15, dy: -2 }, { dx: 14, dy: 7 },
          ].map((f, i) => (
            <Polygon
              key={`fish-${i}`}
              points={`${sw * 0.08 + f.dx},${CANVAS_H * 0.30 + f.dy - 3} ${sw * 0.08 + f.dx + 6},${CANVAS_H * 0.30 + f.dy} ${sw * 0.08 + f.dx},${CANVAS_H * 0.30 + f.dy + 3} ${sw * 0.08 + f.dx - 3},${CANVAS_H * 0.30 + f.dy}`}
              fill="rgba(52,152,219,0.22)"
            />
          ))}

          {/* ── Floating barrel (upper-mid) ─────────────── */}
          <G transform={`translate(${(sw * 0.62).toFixed(0)}, ${(CANVAS_H * 0.35).toFixed(0)})`} opacity={0.25}>
            <Rect x="-8" y="-12" width="16" height="24" rx="4" fill="#8b4513" />
            <Ellipse cx="0" cy="-12" rx="8" ry="4" fill="#a0522d" />
            <Line x1="-8" y1="-2" x2="8" y2="-2" stroke="#5d4037" strokeWidth="1.5" />
            <Line x1="-8" y1="6" x2="8" y2="6" stroke="#5d4037" strokeWidth="1.5" />
          </G>

          {/* ── Whale (mid zone, left — upgraded 2x) ────── */}
          <G transform={`translate(${(sw * 0.06).toFixed(0)}, ${(CANVAS_H * 0.47).toFixed(0)})`}>
            <Ellipse cx="40" cy="12" rx="42" ry="16" fill="#2980b9" opacity={0.4} />
            <Path d="M82 12 Q94 2 98 8 Q94 12 98 16 Q94 12 82 12" fill="#2980b9" opacity={0.4} />
            {/* Belly highlight */}
            <Ellipse cx="35" cy="18" rx="30" ry="6" fill="rgba(52,152,219,0.15)" />
            <Circle cx="12" cy="7" r="3.5" fill="white" opacity={0.7} />
            <Circle cx="13" cy="6" r="1.5" fill="#1a1a2e" opacity={0.8} />
            {/* Mouth */}
            <Path d="M2 14 Q8 18 16 16" stroke="rgba(255,255,255,0.25)" strokeWidth="1" fill="none" />
          </G>

          {/* ── Jellyfish (mid zone) ─────────────────────── */}
          <G transform={`translate(${(sw * 0.85).toFixed(0)}, ${(CANVAS_H * 0.48).toFixed(0)})`} opacity={0.18}>
            <Ellipse cx="12" cy="8" rx="12" ry="8" fill="#ff6b8a" />
            <Path d="M3 14 Q0 26 4 32" stroke="#ff6b8a" strokeWidth="1.5" fill="none" />
            <Path d="M8 14 Q6 28 9 34" stroke="#ff6b8a" strokeWidth="1.5" fill="none" />
            <Path d="M16 14 Q18 28 15 34" stroke="#ff6b8a" strokeWidth="1.5" fill="none" />
            <Path d="M21 14 Q24 26 20 32" stroke="#ff6b8a" strokeWidth="1.5" fill="none" />
          </G>
          <G transform={`translate(${(sw * 0.14).toFixed(0)}, ${(CANVAS_H * 0.55).toFixed(0)})`} opacity={0.15}>
            <Ellipse cx="10" cy="6" rx="10" ry="6" fill="#e94560" />
            <Path d="M3 10 Q1 20 4 26" stroke="#e94560" strokeWidth="1.5" fill="none" />
            <Path d="M10 10 Q9 22 11 28" stroke="#e94560" strokeWidth="1.5" fill="none" />
            <Path d="M17 10 Q19 20 16 26" stroke="#e94560" strokeWidth="1.5" fill="none" />
          </G>

          {/* ── Anchor (mid zone) ────────────────────────── */}
          <G transform={`translate(${(sw * 0.52).toFixed(0)}, ${(CANVAS_H * 0.50).toFixed(0)})`} opacity={0.18}>
            <Line x1="0" y1="0" x2="0" y2="24" stroke="#808080" strokeWidth="3" strokeLinecap="round" />
            <Line x1="-8" y1="0" x2="8" y2="0" stroke="#808080" strokeWidth="3" strokeLinecap="round" />
            <Circle cx="0" cy="-4" r="4" fill="none" stroke="#808080" strokeWidth="2" />
            <Path d="M -12 20 Q -10 28 0 24 Q 10 28 12 20" stroke="#808080" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </G>

          {/* ── Treasure chest (lower-mid — upgraded) ────── */}
          <G transform={`translate(${(sw * 0.58).toFixed(0)}, ${(CANVAS_H * 0.58).toFixed(0)})`}>
            {/* Glow */}
            <Ellipse cx="0" cy="0" rx="30" ry="20" fill="rgba(245,197,24,0.06)" />
            {/* Chest */}
            <Rect x="-18" y="-12" width="36" height="24" rx="4" fill="#8b6914" stroke="#5d4037" strokeWidth="2" opacity={0.8} />
            <Rect x="-18" y="-12" width="36" height="10" rx="4" fill="#a07818" stroke="#5d4037" strokeWidth="2" opacity={0.8} />
            <Circle cx="0" cy="-1" r="5" fill="#f5c518" stroke="#e67e22" strokeWidth="1.5" opacity={0.8} />
            {/* Coins */}
            <Circle cx="-22" cy="8" r="4" fill="#f5c518" opacity={0.5} />
            <Circle cx="20" cy="6" r="3.5" fill="#ffd700" opacity={0.45} />
            <Circle cx="-16" cy="14" r="3" fill="#c8a415" opacity={0.4} />
            <Circle cx="24" cy="12" r="2.5" fill="#f5c518" opacity={0.35} />
          </G>

          {/* ── Octopus (lower-mid zone, left) ───────────── */}
          <G transform={`translate(${(sw * 0.80).toFixed(0)}, ${(CANVAS_H * 0.65).toFixed(0)})`} opacity={0.18}>
            <Ellipse cx="16" cy="10" rx="16" ry="12" fill="#e94560" />
            <Circle cx="10" cy="7" r="2.5" fill="white" />
            <Circle cx="22" cy="7" r="2.5" fill="white" />
            <Circle cx="10" cy="8" r="1.2" fill="#1a1a2e" />
            <Circle cx="22" cy="8" r="1.2" fill="#1a1a2e" />
            <Path d="M2 18 Q-4 30 0 36" stroke="#e94560" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <Path d="M8 20 Q4 34 8 40" stroke="#e94560" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <Path d="M24 20 Q28 34 24 40" stroke="#e94560" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <Path d="M30 18 Q36 30 32 36" stroke="#e94560" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </G>

          {/* ── Coral reef cluster (lower-mid, right) ────── */}
          <G transform={`translate(${(sw * 0.04).toFixed(0)}, ${(CANVAS_H * 0.71).toFixed(0)})`} opacity={0.15}>
            <Path d="M0 30 L5 10 L10 30" stroke="#e67e22" strokeWidth="2.5" fill="none" />
            <Path d="M5 10 L2 4 M5 10 L8 4" stroke="#e67e22" strokeWidth="2" fill="none" />
            <Path d="M14 30 L20 8 L26 30" stroke="#e94560" strokeWidth="2.5" fill="none" />
            <Path d="M20 8 L17 2 M20 8 L23 2" stroke="#e94560" strokeWidth="2" fill="none" />
            <Path d="M30 30 L34 15 L38 30" stroke="#ff6b8a" strokeWidth="2" fill="none" />
          </G>

          {/* ── Rocky outcrops (edges) ──────────────────── */}
          <Polygon points={`0,${CANVAS_H * 0.25} 12,${CANVAS_H * 0.23} 8,${CANVAS_H * 0.25}`} fill="rgba(100,85,70,0.2)" />
          <Polygon points={`${sw},${CANVAS_H * 0.42} ${sw - 16},${CANVAS_H * 0.40} ${sw - 10},${CANVAS_H * 0.42}`} fill="rgba(100,85,70,0.18)" />
          <Polygon points={`0,${CANVAS_H * 0.58} 18,${CANVAS_H * 0.555} 14,${CANVAS_H * 0.58}`} fill="rgba(100,85,70,0.15)" />
          <Polygon points={`${sw},${CANVAS_H * 0.73} ${sw - 20},${CANVAS_H * 0.715} ${sw - 14},${CANVAS_H * 0.73}`} fill="rgba(100,85,70,0.17)" />

          {/* ── Palm tree silhouettes (edges) ──────────── */}
          {/* Near island 1, left edge */}
          <G transform={`translate(${(sw * 0.02).toFixed(0)}, ${(CANVAS_H * 0.06).toFixed(0)})`} opacity={0.12}>
            <Line x1="6" y1="40" x2="6" y2="12" stroke="#27ae60" strokeWidth="2.5" />
            <Path d="M6 14 Q-2 8 -4 14" stroke="#27ae60" strokeWidth="2" fill="none" />
            <Path d="M6 14 Q12 6 16 12" stroke="#27ae60" strokeWidth="2" fill="none" />
          </G>
          {/* Near island 6, right edge */}
          <G transform={`translate(${(sw * 0.92).toFixed(0)}, ${(CANVAS_H * 0.62).toFixed(0)})`} opacity={0.12}>
            <Line x1="6" y1="36" x2="6" y2="10" stroke="#1abc9c" strokeWidth="2.5" />
            <Path d="M6 12 Q-2 6 -4 12" stroke="#1abc9c" strokeWidth="2" fill="none" />
            <Path d="M6 12 Q14 6 16 12" stroke="#1abc9c" strokeWidth="2" fill="none" />
          </G>

          {/* ── Message in a bottle (near island 3) ─────── */}
          <G transform={`translate(${(sw * 0.56).toFixed(0)}, ${(CANVAS_H * 0.27).toFixed(0)})`} opacity={0.22}>
            <Rect x="-4" y="-10" width="8" height="16" rx="3" fill="rgba(139,105,20,0.7)" />
            <Ellipse cx="0" cy="-10" rx="4" ry="2.5" fill="rgba(160,120,30,0.6)" />
            <Line x1="0" y1="-12" x2="0" y2="-18" stroke="#f4e4c1" strokeWidth="1" />
            <Rect x="-2" y="-20" width="6" height="4" rx="1" fill="#f4e4c1" opacity={0.8} />
          </G>

          {/* ── Kraken tentacles (bottom edge) ──────────── */}
          <Path
            d={`M ${sw * 0.10} ${CANVAS_H + 10} Q ${sw * 0.08} ${CANVAS_H * 0.90} ${sw * 0.14} ${CANVAS_H * 0.87}`}
            stroke="#4a235a" strokeWidth="5" strokeLinecap="round" fill="none" opacity={0.15}
          />
          <Path
            d={`M ${sw * 0.88} ${CANVAS_H + 10} Q ${sw * 0.92} ${CANVAS_H * 0.91} ${sw * 0.86} ${CANVAS_H * 0.88}`}
            stroke="#4a235a" strokeWidth="4" strokeLinecap="round" fill="none" opacity={0.12}
          />

          {/* ── Stars (bottom zone — upgraded to 8) ─────── */}
          {[
            { x: sw * 0.12, y: CANVAS_H * 0.77, s: 8, o: 0.3 },
            { x: sw * 0.85, y: CANVAS_H * 0.75, s: 7, o: 0.25 },
            { x: sw * 0.70, y: CANVAS_H * 0.82, s: 9, o: 0.35 },
            { x: sw * 0.30, y: CANVAS_H * 0.84, s: 6, o: 0.2 },
            { x: sw * 0.55, y: CANVAS_H * 0.78, s: 7, o: 0.28 },
            { x: sw * 0.42, y: CANVAS_H * 0.86, s: 8, o: 0.32 },
            { x: sw * 0.20, y: CANVAS_H * 0.80, s: 5, o: 0.22 },
            { x: sw * 0.78, y: CANVAS_H * 0.87, s: 6, o: 0.25 },
          ].map(({ x, y, s, o }, i) => (
            <Path key={`star-${i}`} d={starPath(x, y, s, s * 0.4)} fill="#f5c518" opacity={o} />
          ))}

          {/* ── Ornamental corner flourishes ─────────────── */}
          <Path
            d={`M 12 ${CANVAS_H - 12} Q 12 ${CANVAS_H - 40} 30 ${CANVAS_H - 40}`}
            stroke="rgba(245,197,24,0.18)" strokeWidth="2" fill="none" strokeLinecap="round"
          />
          <Path
            d={`M ${sw - 12} ${CANVAS_H - 12} Q ${sw - 12} ${CANVAS_H - 40} ${sw - 30} ${CANVAS_H - 40}`}
            stroke="rgba(245,197,24,0.18)" strokeWidth="2" fill="none" strokeLinecap="round"
          />
          <Path
            d="M 12 12 Q 12 40 30 40"
            stroke="rgba(245,197,24,0.15)" strokeWidth="2" fill="none" strokeLinecap="round"
          />
          <Path
            d={`M ${sw - 12} 12 Q ${sw - 12} 40 ${sw - 30} 40`}
            stroke="rgba(245,197,24,0.15)" strokeWidth="2" fill="none" strokeLinecap="round"
          />

          {/* ── Parchment map border ─────────────────────── */}
          <Rect
            x="6" y="6" width={sw - 12} height={CANVAS_H + 48}
            rx="12" fill="none"
            stroke="rgba(212,184,150,0.15)" strokeWidth="1.5"
          />

          {/* ── Ghost text ("Here be dragons" etc.) ──────── */}
          <SvgText x={sw * 0.08} y={CANVAS_H * 0.18} fontSize={9} fill="rgba(244,228,193,0.10)" fontStyle="italic">Here be dragons</SvgText>
          <SvgText x={sw * 0.60} y={CANVAS_H * 0.52} fontSize={8} fill="rgba(244,228,193,0.08)" fontStyle="italic">Unknown waters</SvgText>
          <SvgText x={sw * 0.15} y={CANVAS_H * 0.90} fontSize={9} fill="rgba(244,228,193,0.10)" fontStyle="italic">The Deep</SvgText>

          {/* ── Island glow auras (behind nodes) ─────────── */}
          {(islands as Island[]).map((island, idx) => {
            const pos = positions[idx];
            if (!pos || island.isLocked) return null;
            const isCurrent = idx === currentIdx;
            return (
              <Circle
                key={`glow-${idx}`}
                cx={pos.x}
                cy={pos.y}
                r={NODE_R + 14}
                fill={LAND_COLORS[idx]}
                opacity={isCurrent ? 0.20 : 0.10}
              />
            );
          })}
        </Svg>

        {/* ── Animated overlays (outside main SVG) ───────── */}

        {/* Animated wave bands */}
        {[
          { yf: 0.12, amp: 14, period: 5000, color: "rgba(52,152,219,0.08)" },
          { yf: 0.32, amp: 18, period: 6500, color: "rgba(255,255,255,0.05)" },
          { yf: 0.52, amp: 12, period: 5500, color: "rgba(52,152,219,0.06)" },
          { yf: 0.72, amp: 16, period: 7000, color: "rgba(255,255,255,0.05)" },
          { yf: 0.92, amp: 14, period: 6000, color: "rgba(52,152,219,0.07)" },
        ].map(({ yf, amp, period, color }, i) => (
          <AnimatedWave key={`awave-${i}`} yOffset={yf} amplitude={amp} period={period} color={color} sw={sw} canvasH={CANVAS_H} />
        ))}

        {/* Caustic light patches */}
        <CausticPulse cx={sw * 0.25} cy={CANVAS_H * 0.15} rx={60} ry={40} delay={0} />
        <CausticPulse cx={sw * 0.75} cy={CANVAS_H * 0.35} rx={50} ry={35} delay={2} />
        <CausticPulse cx={sw * 0.20} cy={CANVAS_H * 0.55} rx={55} ry={38} delay={4} />
        <CausticPulse cx={sw * 0.70} cy={CANVAS_H * 0.75} rx={45} ry={30} delay={1} />
        <CausticPulse cx={sw * 0.50} cy={CANVAS_H * 0.90} rx={60} ry={40} delay={3} />

        {/* Clouds */}
        <CloudDrift x={sw * 0.05} y={CANVAS_H * 0.01} w={70} h={30} delay={0} />
        <CloudDrift x={sw * 0.55} y={CANVAS_H * 0.005} w={60} h={25} delay={1} />
        <CloudDrift x={sw * 0.30} y={CANVAS_H * 0.03} w={50} h={22} delay={2} />

        {/* Rocking ship */}
        <RockingShip x={sw * 0.35} y={CANVAS_H * 0.22} sw={sw} canvasH={CANVAS_H} />

        {/* Whale spout */}
        <WhaleSpout x={sw * 0.06 + 20} y={CANVAS_H * 0.47 - 6} />

        {/* Floating jellyfish bob */}
        <FloatingElement x={sw * 0.85} y={CANVAS_H * 0.48} driftX={3} driftY={6} period={4000}>
          <View style={{ width: 1, height: 1 }} />
        </FloatingElement>

        {/* Rising bubbles */}
        <RisingBubble x={sw * 0.30} startY={CANVAS_H * 0.50} size={3} delay={0} canvasH={CANVAS_H} />
        <RisingBubble x={sw * 0.45} startY={CANVAS_H * 0.55} size={4} delay={1} canvasH={CANVAS_H} />
        <RisingBubble x={sw * 0.60} startY={CANVAS_H * 0.48} size={2.5} delay={2} canvasH={CANVAS_H} />
        <RisingBubble x={sw * 0.72} startY={CANVAS_H * 0.52} size={3.5} delay={3} canvasH={CANVAS_H} />
        <RisingBubble x={sw * 0.18} startY={CANVAS_H * 0.58} size={3} delay={4} canvasH={CANVAS_H} />
        <RisingBubble x={sw * 0.55} startY={CANVAS_H * 0.45} size={2} delay={5} canvasH={CANVAS_H} />

        {/* Twinkling stars (bottom zone) */}
        <TwinkleStar x={sw * 0.15} y={CANVAS_H * 0.78} size={7} delay={0} />
        <TwinkleStar x={sw * 0.82} y={CANVAS_H * 0.76} size={6} delay={1} />
        <TwinkleStar x={sw * 0.68} y={CANVAS_H * 0.83} size={8} delay={2} />
        <TwinkleStar x={sw * 0.38} y={CANVAS_H * 0.85} size={6} delay={3} />

        {/* Swaying seaweed */}
        <SwayingSeaweed x={sw * 0.04} y={CANVAS_H * 0.68} height={40} delay={0} color="rgba(39,174,96,0.18)" />
        <SwayingSeaweed x={sw * 0.92} y={CANVAS_H * 0.72} height={35} delay={1} color="rgba(26,188,156,0.16)" />
        <SwayingSeaweed x={sw * 0.08} y={CANVAS_H * 0.78} height={30} delay={2} color="rgba(39,174,96,0.15)" />
        <SwayingSeaweed x={sw * 0.88} y={CANVAS_H * 0.82} height={38} delay={3} color="rgba(46,204,113,0.14)" />

        {/* ── Island Nodes ───────────────────────────────── */}
        {(islands as Island[]).map((island, idx) => {
          const pos = positions[idx];
          if (!pos) return null;
          const isCompleted = completedSet.has(island.id);
          const isLocked = island.isLocked;
          const isCurrent = idx === currentIdx;

          return (
            <IslandNode
              key={island.id}
              island={island}
              idx={idx}
              x={pos.x}
              y={pos.y}
              isCompleted={isCompleted}
              isLocked={isLocked}
              isCurrent={isCurrent}
              completionPercent={island.cumulativeAccuracy}
            />
          );
        })}
      </View>
    </ScrollView>
    </View>
  );
}

function IslandNode({
  island, idx, x, y, isCompleted, isLocked, isCurrent, completionPercent,
}: {
  island: Island;
  idx: number;
  x: number;
  y: number;
  isCompleted: boolean;
  isLocked: boolean;
  isCurrent: boolean;
  completionPercent?: number | null;
}) {
  // Inner pulse (fast)
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);
  // Outer pulse (slow)
  const outerScale = useSharedValue(1);
  const outerOpacity = useSharedValue(0);
  // Gold shimmer for completed
  const shimmerOpacity = useSharedValue(0);

  useEffect(() => {
    if (isCurrent) {
      // Inner pulse
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.6, { duration: 1000, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 0 })
        ),
        -1, false
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.45, { duration: 150 }),
          withTiming(0, { duration: 850 })
        ),
        -1, false
      );
      // Outer pulse (slower, larger)
      outerScale.value = withRepeat(
        withSequence(
          withTiming(2.0, { duration: 1800, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 0 })
        ),
        -1, false
      );
      outerOpacity.value = withRepeat(
        withSequence(
          withTiming(0.25, { duration: 200 }),
          withTiming(0, { duration: 1600 })
        ),
        -1, false
      );
    }
    if (isCompleted) {
      shimmerOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.2, { duration: 1500, easing: Easing.inOut(Easing.sin) })
        ),
        -1, true
      );
    }
    return () => {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      cancelAnimation(outerScale);
      cancelAnimation(outerOpacity);
      cancelAnimation(shimmerOpacity);
    };
  }, [isCurrent, isCompleted, pulseOpacity, pulseScale, outerScale, outerOpacity, shimmerOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const outerPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: outerScale.value }],
    opacity: outerOpacity.value,
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
  }));

  const oceanColor = OCEAN_COLORS[idx] ?? "#1a3a5c";
  const landColor = LAND_COLORS[idx] ?? "#27ae60";
  const ringColor = isCompleted ? "#f5c518" : isCurrent ? landColor : "rgba(255,255,255,0.18)";
  const ringWidth = isCompleted ? 4.5 : isCurrent ? 4 : 2;

  const containerW = NODE_R * 2 + LPAD * 2;

  return (
    <View
      style={{
        position: "absolute",
        left: x - NODE_R - LPAD,
        top: y - NODE_R,
        width: containerW,
        alignItems: "center",
      }}
    >
      <TouchableOpacity
        disabled={isLocked}
        onPress={() => router.push(`/(main)/island/${island.id}`)}
        activeOpacity={0.7}
        style={{ alignItems: "center" }}
      >
        {/* Island circle + pulse rings — all in an explicit fixed-size container so
            absolute positions are relative to the same 96×96 origin regardless of label width */}
        <View style={{ width: NODE_R * 2, height: NODE_R * 2 }}>
          {/* Outer pulse ring */}
          {isCurrent && (
            <Animated.View
              style={[{
                position: "absolute",
                top: 0,
                left: 0,
                width: NODE_R * 2,
                height: NODE_R * 2,
                borderRadius: NODE_R,
                backgroundColor: landColor,
              }, outerPulseStyle]}
              pointerEvents="none"
            />
          )}

          {/* Inner pulse ring */}
          {isCurrent && (
            <Animated.View
              style={[{
                position: "absolute",
                top: 0,
                left: 0,
                width: NODE_R * 2,
                height: NODE_R * 2,
                borderRadius: NODE_R,
                backgroundColor: landColor,
              }, pulseStyle]}
              pointerEvents="none"
            />
          )}

          {/* Gold shimmer ring for completed */}
          {isCompleted && (
            <Animated.View
              style={[{
                position: "absolute",
                top: -3,
                left: -3,
                width: NODE_R * 2 + 6,
                height: NODE_R * 2 + 6,
                borderRadius: NODE_R + 3,
                borderWidth: 2,
                borderColor: "#f5c518",
              }, shimmerStyle]}
              pointerEvents="none"
            />
          )}

          {/* Island circle SVG */}
          <Svg width={NODE_R * 2} height={NODE_R * 2} viewBox="0 0 96 96">
          {/* Ocean fill */}
          <Circle
            cx="48" cy="48" r="46"
            fill={isLocked ? "#1c2a38" : oceanColor}
            stroke={ringColor}
            strokeWidth={ringWidth}
            opacity={isLocked ? 0.55 : 1}
          />

          {/* Beach strip */}
          {!isLocked && (
            <Ellipse cx="48" cy="62" rx="34" ry="10" fill="rgba(244,228,193,0.15)" />
          )}

          {/* Island art (visible faintly when locked, full when unlocked) */}
          <G opacity={isLocked ? 0.2 : 1}>
            <IslandArt idx={idx} />
          </G>

          {/* Chain overlay for locked islands */}
          {isLocked && (
            <>
              <Path
                d="M20 35 Q30 28 48 30 Q66 28 76 35"
                stroke="rgba(255,255,255,0.3)" strokeWidth="3" fill="none" strokeLinecap="round"
              />
              <Path
                d="M24 50 Q36 44 48 46 Q60 44 72 50"
                stroke="rgba(255,255,255,0.25)" strokeWidth="3" fill="none" strokeLinecap="round"
              />
              {/* Lock icon */}
              <Path
                d="M38 48 L38 40 Q38 30 48 30 Q58 30 58 40 L58 48"
                stroke="rgba(255,255,255,0.45)" strokeWidth="4" fill="none" strokeLinecap="round"
              />
              <Rect x="32" y="46" width="32" height="24" rx="5"
                fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" strokeWidth="2"
              />
              <Circle cx="48" cy="58" r="4" fill="rgba(255,255,255,0.5)" />
            </>
          )}

          {/* Completed badge — larger gold star */}
          {isCompleted && (
            <>
              <Circle cx="72" cy="22" r="14" fill="#155724" stroke="#f5c518" strokeWidth="2.5" />
              <Path
                d={starPath(72, 21, 9, 4)}
                fill="#f5c518"
              />
            </>
          )}

          {/* Island number */}
          <Circle cx="22" cy="74" r="13" fill="#1a1a2e" stroke={isCompleted ? "#f5c518" : "rgba(255,255,255,0.25)"} strokeWidth="2" />
          <SvgText
            x="22" y="79"
            textAnchor="middle"
            fill={isCompleted ? "#f5c518" : "#94a3b8"}
            fontSize="13"
            fontWeight="bold"
          >
            {idx + 1}
          </SvgText>
          </Svg>
        </View>{/* end island circle + rings wrapper */}

        {/* "YOU ARE HERE" arrow for current island */}
        {isCurrent && (
          <View style={{ marginTop: -2, alignItems: "center" }}>
            <Svg width={14} height={10}>
              <Polygon points="7,0 0,10 14,10" fill={landColor} />
            </Svg>
          </View>
        )}

        {/* Island name label — parchment ribbon style */}
        <View
          style={{
            marginTop: isCurrent ? 2 : 5,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "rgba(22,33,62,0.92)",
            borderRadius: 8,
            maxWidth: containerW,
            borderWidth: 1.5,
            borderColor: isCompleted
              ? "rgba(245,197,24,0.4)"
              : isCurrent
              ? `${landColor}60`
              : "rgba(255,255,255,0.08)",
            overflow: "hidden",
          }}
        >
          {/* Accent stripe */}
          <View style={{
            width: 4,
            alignSelf: "stretch",
            backgroundColor: isLocked ? "#3a3a4a" : isCompleted ? "#f5c518" : landColor,
            borderTopLeftRadius: 8,
            borderBottomLeftRadius: 8,
          }} />
          <View style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text
              style={{
                color: isLocked ? "#4b5563" : isCompleted ? "#f5c518" : isCurrent ? landColor : "#f4e4c1",
                fontSize: 10,
                fontWeight: "700",
                textAlign: "center",
              }}
              numberOfLines={1}
            >
              {island.name}
            </Text>
            {isCompleted && completionPercent != null && (
              <Text style={{
                color: "#ffd700",
                fontSize: 9,
                fontWeight: "700",
                textAlign: "center",
                marginTop: 1,
              }}>
                {Math.round(completionPercent)}% accuracy
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}
