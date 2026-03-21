import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Dimensions, Modal, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Svg, { Path, Circle, Rect, Ellipse, Polygon, G, Text as SvgText } from "react-native-svg";
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, Easing,
} from "react-native-reanimated";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { IngayWarning } from "@/components/characters/IngayWarning";
import { CaptainSalita } from "@/components/characters/CaptainSalita";

const { width: SW } = Dimensions.get("window");
const CANVAS_H = 960;
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
  const { islandId } = useLocalSearchParams<{ islandId: string }>();
  const { user } = useAuthStore();
  const characterMode = user?.characterModeEnabled ?? false;
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<"ingay" | "captain" | "map">(
    characterMode ? "ingay" : "map"
  );
  const [checkpointPin, setCheckpointPin] = useState<{ id: string; shardName: string } | null>(null);

  const { data: island, isLoading } = useQuery({
    queryKey: ["island", islandId],
    queryFn: () => apiClient.getIsland(islandId),
  });

  const claimCheckpointMutation = useMutation({
    mutationFn: (pinId: string) =>
      apiClient.submitProgress({ pinId, answer: "A", hintsUsed: 0, accuracy: 100 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["island", islandId] });
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      setCheckpointPin(null);
    },
  });

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
        onDismiss={() => setPhase("captain")}
        audioUrl={island.ingayAudioUrl}
      />
    );
  }

  // === CAPTAIN INTRO ===
  if (phase === "captain" && characterMode) {
    return (
      <SafeAreaView className="flex-1 bg-ocean-deep" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-8">
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
        </View>
      </SafeAreaView>
    );
  }

  // Compute pin states
  const pins = island.pins ?? [];
  const pinStates = pins.map((pin: any, idx: number) => {
    const isCompleted = pin.isCompleted ?? false;
    const isUnlocked = idx === 0 || (pins[idx - 1]?.isCompleted ?? false);
    const isCurrent = isUnlocked && !isCompleted;
    return { ...pin, isCompleted, isUnlocked, isCurrent };
  });

  const completedChallenges = pinStates.filter(
    (p: any) => p.isCompleted && p.type === "CHALLENGE"
  ).length;

  const positions = PIN_FRACS.slice(0, pins.length).map((f) => ({
    x: f.xf * SW,
    y: f.yf * CANVAS_H,
  }));
  const ropePath = buildRopePath(positions);

  const handlePinPress = (pin: any, isUnlocked: boolean) => {
    if (!isUnlocked) return;
    if (pin.type === "CHECKPOINT") {
      if (!pin.isCompleted) {
        setCheckpointPin({ id: pin.id, shardName: island.shardItemName ?? "Shard" });
      }
      return;
    }
    router.push(`/(main)/quest/${pin.id}`);
  };

  const handleBack = () => {
    Alert.alert("Leave Island?", "Your progress is saved. Return to the map?", [
      { text: "Stay", style: "cancel" },
      { text: "Back to Map", onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-ocean-deep" edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-2 pb-3">
        <TouchableOpacity onPress={handleBack}>
          <Text className="text-gold text-sm mb-3">← Back to Map</Text>
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
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={{
                    width: 10, height: 10, borderRadius: 5,
                    backgroundColor: i < completedChallenges ? "#f5c518" : "rgba(255,255,255,0.15)",
                  }}
                />
              ))}
            </View>
            <Text className="text-gold text-xs mt-1">{completedChallenges} / 4</Text>
          </View>
        </View>
      </View>

      {/* Map canvas */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ width: SW, height: CANVAS_H + 80, position: "relative" }}>

          {/* SVG background — rope + deco */}
          <Svg width={SW} height={CANVAS_H + 80} style={{ position: "absolute", top: 0, left: 0 }}>

            {/* Subtle wave lines */}
            {[120, 280, 440, 600, 760, 900].map((y, i) => (
              <Path
                key={i}
                d={`M 0 ${y} Q ${SW * 0.25} ${y - 12} ${SW * 0.5} ${y} Q ${SW * 0.75} ${y + 12} ${SW} ${y}`}
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

      {/* CHECKPOINT MODAL */}
      <Modal
        visible={!!checkpointPin}
        transparent
        animationType="fade"
        onRequestClose={() => setCheckpointPin(null)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", alignItems: "center", padding: 28 }}>
          <View style={{ backgroundColor: "#0f1e30", borderRadius: 20, padding: 28, width: "100%", borderWidth: 2, borderColor: "#f5c518" }}>
            <Text style={{ color: "#f5c518", fontSize: 32, textAlign: "center", marginBottom: 4 }}>⭐</Text>
            <Text style={{ color: "#f5c518", fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 6 }}>
              {island.shardItemName ?? "Shard Unlocked!"}
            </Text>
            <Text style={{ color: "#c4a35a", fontSize: 13, textAlign: "center", marginBottom: 12 }}>
              {island.shardDescription ?? "A shard of understanding."}
            </Text>
            <View style={{ backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 14, marginBottom: 20 }}>
              <Text style={{ color: "#e2c97e", fontSize: 12, fontStyle: "italic", textAlign: "center", lineHeight: 19 }}>
                "{island.npcDialogueSuccess ?? "Well done, sailor. The shard is yours."}"
              </Text>
              <Text style={{ color: "#6b7280", fontSize: 11, textAlign: "center", marginTop: 6 }}>
                — Captain Salita
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => claimCheckpointMutation.mutate(checkpointPin!.id)}
              disabled={claimCheckpointMutation.isPending}
              style={{ backgroundColor: "#f5c518", borderRadius: 12, paddingVertical: 14, alignItems: "center" }}
            >
              {claimCheckpointMutation.isPending ? (
                <ActivityIndicator color="#0f1e30" />
              ) : (
                <Text style={{ color: "#0f1e30", fontWeight: "bold", fontSize: 16 }}>Continue →</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  const isCheckpoint = pin.type === "CHECKPOINT";
  const ringColor = pin.isCompleted
    ? "#f5c518"
    : pin.isCurrent
    ? accentColor
    : pin.isUnlocked
    ? "rgba(255,255,255,0.35)"
    : "rgba(255,255,255,0.12)";
  const ringWidth = pin.isCompleted || pin.isCurrent ? 3.5 : 1.5;

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
            fill={!pin.isUnlocked ? "#1c2a38" : isCheckpoint ? "#1a3a2a" : "#0f1e30"}
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

          {/* Checkpoint star */}
          {pin.isUnlocked && isCheckpoint && !pin.isCompleted && (
            <>
              <SvgText x="32" y="38" textAnchor="middle" fill="#f5c518" fontSize="24">⭐</SvgText>
            </>
          )}

          {/* Challenge headphones */}
          {pin.isUnlocked && !isCheckpoint && !pin.isCompleted && (
            <>
              <SvgText x="32" y="22" textAnchor="middle" fill={accentColor} fontSize="10" fontWeight="bold">
                {`P${pin.number}`}
              </SvgText>
              <SvgText x="32" y="42" textAnchor="middle" fill={accentColor} fontSize="18">🎧</SvgText>
            </>
          )}

          {/* Completed state */}
          {pin.isCompleted && (
            <>
              {isCheckpoint
                ? <SvgText x="32" y="38" textAnchor="middle" fill="#f5c518" fontSize="22">⭐</SvgText>
                : <SvgText x="32" y="38" textAnchor="middle" fill="#f5c518" fontSize="22">🎧</SvgText>
              }
              {/* Gold check badge */}
              <Circle cx="50" cy="14" r="10" fill="#155724" stroke="#f5c518" strokeWidth="1.5" />
              <Path
                d="M45 14 L49 18 L56 9"
                stroke="#2ecc71" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
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
            borderColor: pin.isCompleted
              ? "rgba(245,197,24,0.35)"
              : pin.isCurrent
              ? `${accentColor}50`
              : "transparent",
          }}
        >
          <Text
            style={{
              color: !pin.isUnlocked
                ? "#374151"
                : pin.isCompleted
                ? "#f5c518"
                : pin.isCurrent
                ? accentColor
                : "#f4e4c1",
              fontSize: 9,
              fontWeight: "600",
              textAlign: "center",
            }}
          >
            {isCheckpoint ? "CHECKPOINT" : `CHALLENGE ${pin.number < 3 ? pin.number : pin.number - 1}`}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}
