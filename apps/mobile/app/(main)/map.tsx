import { useEffect } from "react";
import { View, Text, Dimensions, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Svg, {
  Path, Circle, Ellipse, Rect, Polygon, G, Line,
  Text as SvgText,
} from "react-native-svg";
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, Easing,
} from "react-native-reanimated";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { Island, IslandProgress } from "@linguaquest/shared";

const { width: SW } = Dimensions.get("window");
const CANVAS_H = 1080;
const NODE_R = 36;       // island circle radius
const LPAD = 24;         // extra horizontal padding for labels

// Fractional positions of each island center (xf * SW, yf * CANVAS_H)
const POS_FRACS = [
  { xf: 0.50, yf: 0.073 },
  { xf: 0.22, yf: 0.198 },
  { xf: 0.76, yf: 0.323 },
  { xf: 0.24, yf: 0.448 },
  { xf: 0.76, yf: 0.573 },
  { xf: 0.24, yf: 0.698 },
  { xf: 0.50, yf: 0.840 },
];

// Per-island visual theme
const OCEAN_COLORS = ["#1e5631", "#4a235a", "#1a4a6e", "#7d1515", "#7e3a0a", "#0e6655", "#7d6608"];
const LAND_COLORS  = ["#27ae60", "#8e44ad", "#3498db", "#e74c3c", "#e67e22", "#1abc9c", "#f5c518"];

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

// SVG art for each island (drawn in a 72×72 viewBox)
function IslandArt({ idx }: { idx: number }) {
  switch (idx) {
    case 0: // Vocabulary — tropical palm
      return (
        <>
          <Ellipse cx="36" cy="52" rx="26" ry="14" fill="#c8a96e" />
          <Path d="M34 50 L35 22" stroke="#5d4037" strokeWidth="4" strokeLinecap="round" />
          <Path d="M35 23 Q18 15 13 23" stroke="#27ae60" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <Path d="M35 23 Q30 9 38 6" stroke="#2ecc71" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <Path d="M35 23 Q46 13 52 22" stroke="#27ae60" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <Circle cx="13" cy="24" r="3.5" fill="#d4a756" />
        </>
      );
    case 1: // Speed — lightning bolt
      return (
        <>
          <Ellipse cx="36" cy="54" rx="25" ry="12" fill="#4a235a" />
          <Polygon
            points="37,11 26,35 33,35 28,61 51,33 40,33 48,11"
            fill="#f5c518" stroke="#e67e22" strokeWidth="1.5"
          />
        </>
      );
    case 2: // Main Idea — mountain with cloud
      return (
        <>
          <Ellipse cx="36" cy="55" rx="26" ry="13" fill="#2c6e49" />
          <Path d="M10 55 L36 12 L62 55 Z" fill="#5d7a8a" />
          <Path d="M24 30 L36 12 L48 30 Q36 28 24 30 Z" fill="white" />
          <Ellipse cx="54" cy="26" rx="9" ry="6" fill="rgba(255,255,255,0.75)" />
          <Ellipse cx="50" cy="29" rx="7" ry="5" fill="rgba(255,255,255,0.6)" />
        </>
      );
    case 3: // Emotion — volcano
      return (
        <>
          <Ellipse cx="36" cy="56" rx="26" ry="12" fill="#7d1515" />
          <Path d="M12 56 L36 14 L60 56 Z" fill="#c0392b" />
          <Ellipse cx="36" cy="16" rx="10" ry="7" fill="#ff6b35" />
          <Ellipse cx="36" cy="14" rx="5" ry="3.5" fill="#f5c518" />
          <Path d="M30 10 Q28 4 32 2" stroke="#ff9900" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity={0.8} />
          <Path d="M36 8 Q36 2 38 0" stroke="#ff6b35" strokeWidth="2" strokeLinecap="round" fill="none" opacity={0.6} />
        </>
      );
    case 4: // Specific Info — lighthouse
      return (
        <>
          <Ellipse cx="36" cy="54" rx="26" ry="14" fill="#c8a96e" />
          <Rect x="31" y="22" width="10" height="32" rx="2" fill="white" stroke="#ccc" strokeWidth="1.5" />
          <Rect x="31" y="28" width="10" height="5" fill="#e74c3c" />
          <Rect x="31" y="39" width="10" height="5" fill="#e74c3c" />
          <Circle cx="36" cy="22" r="7" fill="#f5c518" stroke="#e67e22" strokeWidth="1.5" />
          <Path d="M43 18 L58 10" stroke="#f5c518" strokeWidth="2" strokeLinecap="round" opacity={0.7} />
          <Path d="M43 22 L57 26" stroke="#f5c518" strokeWidth="1.5" strokeLinecap="round" opacity={0.4} />
        </>
      );
    case 5: // Narrative — scroll
      return (
        <>
          <Ellipse cx="36" cy="52" rx="26" ry="14" fill="#16a085" />
          <Rect x="19" y="20" width="34" height="26" rx="4" fill="#f4e4c1" stroke="#d4a756" strokeWidth="1.5" />
          <Ellipse cx="19" cy="33" rx="5" ry="13" fill="#e8cfa0" stroke="#d4a756" strokeWidth="1.5" />
          <Ellipse cx="53" cy="33" rx="5" ry="13" fill="#e8cfa0" stroke="#d4a756" strokeWidth="1.5" />
          <Path d="M25 26 L47 26" stroke="#a0785a" strokeWidth="2" strokeLinecap="round" />
          <Path d="M25 33 L47 33" stroke="#a0785a" strokeWidth="2" strokeLinecap="round" />
          <Path d="M25 40 L38 40" stroke="#a0785a" strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case 6: // Final — crystal spire
      return (
        <>
          <Ellipse cx="36" cy="56" rx="27" ry="12" fill="#b7950b" />
          <Polygon points="36,8 22,40 36,50 50,40" fill="#f5c518" stroke="#e67e22" strokeWidth="1.5" />
          <Polygon points="36,8 27,40 36,50" fill="#f7d060" opacity={0.5} />
          <Circle cx="36" cy="28" r="14" fill="rgba(245,197,24,0.15)" />
          <Path d="M16 20 L18 13 L20 20 L27 22 L20 24 L18 31 L16 24 L9 22 Z" fill="#f5c518" />
          <Path d="M52 28 L54 22 L56 28 L62 30 L56 32 L54 38 L52 32 L46 30 Z" fill="#f5c518" opacity={0.8} />
        </>
      );
    default:
      return null;
  }
}

export default function MapScreen() {
  const { user } = useAuthStore();

  const { data: islands, isLoading } = useQuery({
    queryKey: ["islands"],
    queryFn: () => apiClient.getIslands(),
  });

  const { data: progress } = useQuery({
    queryKey: ["progress", user?.id],
    queryFn: () => apiClient.getProgress(),
    enabled: !!user,
  });

  if (isLoading || !islands) {
    return (
      <View className="flex-1 bg-ocean-deep items-center justify-center">
        <ActivityIndicator color="#f5c518" size="large" />
        <Text className="text-parchment mt-4 text-sm">Loading the Listening Sea...</Text>
      </View>
    );
  }

  const completedSet = new Set<string>(
    (progress ?? [])
      .filter((p: IslandProgress) => p.isCompleted)
      .map((p: IslandProgress) => p.islandId)
  );

  const positions = POS_FRACS.map((p) => ({ x: p.xf * SW, y: p.yf * CANVAS_H }));
  const ropePath = buildRopePath(positions);

  const currentIdx = (islands as Island[]).findIndex(
    (isl) => !isl.isLocked && !completedSet.has(isl.id)
  );

  return (
    <ScrollView className="flex-1 bg-ocean-deep" showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="px-6 pt-14 pb-3">
        <Text className="text-gold text-3xl font-bold">The Listening Sea</Text>
        <Text className="text-parchment-dark text-sm mt-1">Seven islands. Seven skills. One legend.</Text>
      </View>

      {/* Map canvas */}
      <View style={{ width: SW, height: CANVAS_H + 60, position: "relative" }}>

        {/* ── Background SVG ─────────────────────────────── */}
        <Svg width={SW} height={CANVAS_H + 60} style={{ position: "absolute", top: 0, left: 0 }}>

          {/* Subtle wave lines */}
          {[110, 260, 410, 560, 710, 860, 1010].map((y, i) => (
            <Path
              key={i}
              d={`M 0 ${y} Q ${SW * 0.25} ${y - 14} ${SW * 0.5} ${y} Q ${SW * 0.75} ${y + 14} ${SW} ${y}`}
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="2"
              fill="none"
            />
          ))}

          {/* Rope shadow */}
          <Path
            d={ropePath}
            stroke="rgba(0,0,0,0.28)"
            strokeWidth="9"
            fill="none"
            strokeLinecap="round"
          />
          {/* Rope body */}
          <Path
            d={ropePath}
            stroke="#6b4f1a"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="13,8"
          />
          {/* Rope highlight */}
          <Path
            d={ropePath}
            stroke="#c4942a"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="13,8"
            strokeDashoffset="5"
            opacity={0.55}
          />

          {/* Compass rose — top-right */}
          <G transform={`translate(${SW - 58}, 36)`}>
            <Circle cx="22" cy="22" r="20" fill="rgba(245,197,24,0.07)" stroke="rgba(245,197,24,0.28)" strokeWidth="1.5" />
            {/* N — gold */}
            <Polygon points="22,4 18,18 22,15 26,18" fill="#f5c518" />
            {/* S */}
            <Polygon points="22,40 18,26 22,29 26,26" fill="rgba(255,255,255,0.35)" />
            {/* E */}
            <Polygon points="40,22 26,18 29,22 26,26" fill="rgba(255,255,255,0.35)" />
            {/* W */}
            <Polygon points="4,22 18,18 15,22 18,26" fill="rgba(255,255,255,0.35)" />
            <Circle cx="22" cy="22" r="4" fill="#f5c518" />
            <Circle cx="22" cy="22" r="2" fill="#1a1a2e" />
            <SvgText x="22" y="0" textAnchor="middle" fill="#f5c518" fontSize="8" fontWeight="bold">N</SvgText>
          </G>

          {/* Small sailing ship (between islands 2 & 3) */}
          <G transform={`translate(${(SW * 0.5 - 15).toFixed(0)}, 268)`}>
            <Path d="M0 10 Q15 17 30 10 L26 2 L4 2 Z" fill="#4a3520" stroke="#2c1e0f" strokeWidth="1.5" />
            <Line x1="15" y1="2" x2="15" y2="-20" stroke="#2c1e0f" strokeWidth="2" />
            <Path d="M15 -18 L30 -8 L15 -4 Z" fill="rgba(244,228,193,0.85)" stroke="#d4b896" strokeWidth="1" />
            <Polygon points="15,-20 22,-16 15,-12" fill="#e94560" />
          </G>

          {/* Whale (left side, between islands 4 & 5) */}
          <G transform={`translate(${(SW * 0.08).toFixed(0)}, 534)`}>
            <Ellipse cx="26" cy="8" rx="28" ry="11" fill="#2980b9" opacity={0.5} />
            <Path d="M54 8 Q62 1 65 5 Q62 8 65 11 Q62 8 54 8" fill="#2980b9" opacity={0.5} />
            <Circle cx="10" cy="5" r="2.5" fill="white" opacity={0.75} />
            <Path d="M12 -3 Q10 -11 14 -17" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round" fill="none" />
          </G>

          {/* Treasure chest (between islands 5 & 6) */}
          <G transform={`translate(${(SW * 0.56).toFixed(0)}, 660)`}>
            <Rect x="-12" y="-9" width="24" height="16" rx="3" fill="#8b6914" stroke="#5d4037" strokeWidth="1.5" opacity={0.75} />
            <Rect x="-12" y="-9" width="24" height="7" rx="3" fill="#a07818" stroke="#5d4037" strokeWidth="1.5" opacity={0.75} />
            <Circle cx="0" cy="-1" r="4" fill="#f5c518" stroke="#e67e22" strokeWidth="1" opacity={0.75} />
          </G>

          {/* Stars near final island */}
          {[[SW * 0.15, 870], [SW * 0.82, 840], [SW * 0.68, 920]].map(([sx, sy], i) => (
            <Path
              key={i}
              d={`M ${sx} ${sy - 6} L ${sx + 2} ${sy - 2} L ${sx + 6} ${sy - 2} L ${sx + 3} ${sy + 1} L ${sx + 4} ${sy + 5} L ${sx} ${sy + 3} L ${sx - 4} ${sy + 5} L ${sx - 3} ${sy + 1} L ${sx - 6} ${sy - 2} L ${sx - 2} ${sy - 2} Z`}
              fill="#f5c518"
              opacity={0.3 + i * 0.1}
            />
          ))}
        </Svg>

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
            />
          );
        })}
      </View>
    </ScrollView>
  );
}

function IslandNode({
  island, idx, x, y, isCompleted, isLocked, isCurrent,
}: {
  island: Island;
  idx: number;
  x: number;
  y: number;
  isCompleted: boolean;
  isLocked: boolean;
  isCurrent: boolean;
}) {
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);

  useEffect(() => {
    if (isCurrent) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.6, { duration: 1000, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 0 })
        ),
        -1,
        false
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.45, { duration: 150 }),
          withTiming(0, { duration: 850 })
        ),
        -1,
        false
      );
    }
  }, [isCurrent, pulseOpacity, pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const oceanColor = OCEAN_COLORS[idx] ?? "#1a3a5c";
  const landColor = LAND_COLORS[idx] ?? "#27ae60";
  const ringColor = isCompleted ? "#f5c518" : isCurrent ? landColor : "rgba(255,255,255,0.18)";
  const ringWidth = isCompleted || isCurrent ? 3.5 : 1.5;

  // Container centers on (x, y) with extra horizontal space for label
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
        {/* Pulse ring (behind SVG) */}
        {isCurrent && (
          <Animated.View
            style={[{
              position: "absolute",
              top: 0,
              left: LPAD,
              width: NODE_R * 2,
              height: NODE_R * 2,
              borderRadius: NODE_R,
              backgroundColor: landColor,
            }, pulseStyle]}
          />
        )}

        {/* Island circle */}
        <Svg width={NODE_R * 2} height={NODE_R * 2} viewBox="0 0 72 72">
          {/* Ocean fill */}
          <Circle
            cx="36" cy="36" r="34"
            fill={isLocked ? "#1c2a38" : oceanColor}
            stroke={ringColor}
            strokeWidth={ringWidth}
            opacity={isLocked ? 0.55 : 1}
          />

          {/* Island art (only when unlocked) */}
          {!isLocked && <IslandArt idx={idx} />}

          {/* Lock icon */}
          {isLocked && (
            <>
              <Path
                d="M28 36 L28 28 Q28 20 36 20 Q44 20 44 28 L44 36"
                stroke="rgba(255,255,255,0.4)" strokeWidth="4" fill="none" strokeLinecap="round"
              />
              <Rect x="23" y="34" width="26" height="20" rx="4"
                fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"
              />
              <Circle cx="36" cy="45" r="3" fill="rgba(255,255,255,0.5)" />
            </>
          )}

          {/* Completed badge */}
          {isCompleted && (
            <>
              <Circle cx="55" cy="17" r="11" fill="#155724" stroke="#f5c518" strokeWidth="2" />
              <Path
                d="M50 17 L54 21 L61 12"
                stroke="#2ecc71" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
              />
            </>
          )}

          {/* Island number */}
          <Circle cx="17" cy="55" r="10" fill="#1a1a2e" stroke={isCompleted ? "#f5c518" : "rgba(255,255,255,0.25)"} strokeWidth="1.5" />
          <SvgText
            x="17" y="59"
            textAnchor="middle"
            fill={isCompleted ? "#f5c518" : "#94a3b8"}
            fontSize="10"
            fontWeight="bold"
          >
            {idx + 1}
          </SvgText>
        </Svg>

        {/* Island name label */}
        <View
          style={{
            marginTop: 5,
            paddingHorizontal: 7,
            paddingVertical: 3,
            backgroundColor: "rgba(22,33,62,0.92)",
            borderRadius: 6,
            maxWidth: containerW,
            borderWidth: 1,
            borderColor: isCompleted
              ? "rgba(245,197,24,0.35)"
              : isCurrent
              ? `${landColor}50`
              : "transparent",
          }}
        >
          <Text
            style={{
              color: isLocked ? "#4b5563" : isCompleted ? "#f5c518" : isCurrent ? landColor : "#f4e4c1",
              fontSize: 9.5,
              fontWeight: "600",
              textAlign: "center",
            }}
            numberOfLines={1}
          >
            {island.name}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}
