import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Dimensions, AccessibilityInfo } from "react-native";
import { router } from "expo-router";
import { useMultiplayerStore, destroyPusher } from "@/stores/multiplayer";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const CONFETTI_COUNT = 32;
const CONFETTI_COLORS = ["#f5c518", "#e94560", "#22c55e", "#3b82f6", "#a855f7", "#fb923c", "#ffd700"];

function ConfettiPiece({ index, enabled }: { index: number; enabled: boolean }) {
  const startX = useMemo(() => Math.random() * SCREEN_W, []);
  const drift = useMemo(() => (Math.random() - 0.5) * 80, []);
  const delay = useMemo(() => Math.random() * 600, []);
  const duration = useMemo(() => 1800 + Math.random() * 1400, []);
  const rotateEnd = useMemo(() => 360 + Math.random() * 720, []);
  const size = useMemo(() => 6 + Math.random() * 6, []);
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];

  const translateY = useSharedValue(-40);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!enabled) return;
    translateY.value = withDelay(
      delay,
      withTiming(SCREEN_H + 40, { duration, easing: Easing.in(Easing.quad) })
    );
    translateX.value = withDelay(
      delay,
      withTiming(drift, { duration, easing: Easing.inOut(Easing.sin) })
    );
    rotate.value = withDelay(delay, withTiming(rotateEnd, { duration }));
    opacity.value = withDelay(delay + duration - 400, withTiming(0, { duration: 400 }));
  }, [enabled, delay, drift, duration, rotateEnd, translateY, translateX, rotate, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  if (!enabled) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: startX,
          top: 0,
          width: size,
          height: size * 1.6,
          backgroundColor: color,
          borderRadius: 1,
        },
        style,
      ]}
    />
  );
}

function AnimatedScore({ target, suffix }: { target: number; suffix?: string }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const startTime = Date.now();
    const duration = 900;
    function tick() {
      if (cancelled) return;
      const t = Math.min(1, (Date.now() - startTime) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) requestAnimationFrame(tick);
    }
    tick();
    return () => {
      cancelled = true;
    };
  }, [target]);
  return (
    <Text style={{ color: "#f5c518", fontSize: 56, fontWeight: "900", letterSpacing: 1 }}>
      {value}{suffix ?? ""}
    </Text>
  );
}

export default function ResultsScreen() {
  const { correctCount, questionResults, reset } = useMultiplayerStore();
  const treasureFound = correctCount >= 3;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  const emojiScale = useSharedValue(0);
  const emojiGlow = useSharedValue(0);
  useEffect(() => {
    emojiScale.value = withSpring(1, { damping: 8, stiffness: 120 });
    if (treasureFound && !reduceMotion) {
      emojiGlow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 900 }),
          withTiming(0.4, { duration: 900 })
        ),
        -1,
        true
      );
    }
  }, [emojiScale, emojiGlow, treasureFound, reduceMotion]);
  const emojiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emojiScale.value }],
    shadowColor: "#f5c518",
    shadowOpacity: emojiGlow.value,
    shadowRadius: 30,
  }));

  function handleDone() {
    destroyPusher();
    reset();
    router.replace("/(main)/dashboard");
  }

  function handlePlayAgain() {
    destroyPusher();
    reset();
    router.replace("/(multiplayer)/lobby");
  }

  const stopNames = ["Pirate Port", "Coral Reef", "Hidden Cave", "Storm Pass", "Treasure Isle"];
  const showConfetti = treasureFound && !reduceMotion;

  return (
    <SafeAreaView className="flex-1 bg-ocean-deep" edges={["top"]}>
      {/* Confetti layer */}
      {showConfetti && (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 10 }}>
          {Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
            <ConfettiPiece key={i} index={i} enabled={showConfetti} />
          ))}
        </View>
      )}

      <ScrollView contentContainerClassName="px-6 pt-8 pb-8 items-center">
        {/* Big emoji */}
        <Animated.Text style={[emojiStyle, { fontSize: 84, marginBottom: 12 }]}>
          {treasureFound ? "💰" : "🔒"}
        </Animated.Text>

        {/* Win/Loss header */}
        <Animated.View entering={FadeInDown.delay(200).duration(420)} className="items-center mb-6">
          {treasureFound ? (
            <>
              <Text className="text-green-400 text-3xl font-bold text-center mb-2">
                Treasure Found!
              </Text>
              <Text className="text-parchment text-base text-center px-4">
                Your crew solved {correctCount}/5 clues and found the treasure!
              </Text>
            </>
          ) : (
            <>
              <Text className="text-gold text-3xl font-bold text-center mb-2">
                Treasure Lost...
              </Text>
              <Text className="text-parchment text-base text-center px-4">
                Your crew solved {correctCount}/5 clues. The treasure awaits your return!
              </Text>
            </>
          )}
        </Animated.View>

        {/* Animated score */}
        <Animated.View entering={FadeIn.delay(500).duration(360)} className="items-center mb-6">
          <Text className="text-parchment-dark text-xs tracking-widest mb-1">CLUES SOLVED</Text>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <AnimatedScore target={correctCount} />
            <Text style={{ color: "rgba(244,228,193,0.6)", fontSize: 28, fontWeight: "700", marginLeft: 4 }}>
              /5
            </Text>
          </View>
        </Animated.View>

        {/* Score visualization */}
        <Animated.View
          entering={FadeInDown.delay(650).duration(420)}
          style={{
            width: "100%",
            backgroundColor: "#16213e",
            borderRadius: 20,
            padding: 20,
            borderWidth: 1.5,
            borderColor: treasureFound ? "rgba(34,197,94,0.4)" : "#0f3460",
            marginBottom: 24,
          }}
        >
          <Text className="text-gold font-bold text-xs tracking-widest mb-4">VOYAGE LOG</Text>

          {questionResults.map((result, i) => (
            <View
              key={i}
              className="flex-row items-center justify-between py-3 border-b border-ocean-light/20 last:border-b-0"
            >
              <View className="flex-row items-center">
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor:
                      result === true ? "#22c55e" : result === false ? "#ef4444" : "rgba(255,255,255,0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "800", fontSize: 14 }}>
                    {result === true ? "✓" : result === false ? "✗" : "?"}
                  </Text>
                </View>
                <Text className="text-parchment text-sm font-medium">{stopNames[i]}</Text>
              </View>
              <Text
                className={`text-xs font-bold ${
                  result === true ? "text-green-400" : result === false ? "text-red-400" : "text-parchment-dark"
                }`}
              >
                {result === true ? "Solved" : result === false ? "Missed" : "—"}
              </Text>
            </View>
          ))}

          <Text className="text-parchment-dark text-xs text-center mt-4">
            Need 3 of 5 to find the treasure
          </Text>
        </Animated.View>

        {/* Action buttons */}
        <Animated.View entering={FadeIn.delay(850).duration(320)} style={{ width: "100%" }}>
          <TouchableOpacity
            onPress={handlePlayAgain}
            accessibilityRole="button"
            accessibilityLabel="Play again"
            style={{
              width: "100%",
              backgroundColor: treasureFound ? "#22c55e" : "#f5c518",
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: "center",
              marginBottom: 12,
              shadowColor: treasureFound ? "#22c55e" : "#f5c518",
              shadowOpacity: 0.5,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            <Text style={{ color: treasureFound ? "white" : "#1a1a2e", fontWeight: "900", fontSize: 18 }}>
              ⚓  Play Again
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDone}
            accessibilityRole="button"
            accessibilityLabel="Return to dashboard"
            className="w-full bg-ocean-mid rounded-2xl py-4 items-center border border-ocean-light"
          >
            <Text className="text-parchment font-bold text-base">Return to Dashboard</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
