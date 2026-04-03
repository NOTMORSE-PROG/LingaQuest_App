import { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";
import Svg, { Path } from "react-native-svg";

const STOP_NAMES = ["Pirate Port", "Coral Reef", "Hidden Cave", "Storm Pass", "Treasure Isle"];

interface TreasureMapProps {
  questionResults: (boolean | null)[];
  currentIndex: number;
  totalQuestions: number;
}

function MapStop({
  result,
  isCurrent,
  index,
}: {
  result: boolean | null;
  isCurrent: boolean;
  index: number;
}) {
  const size = isCurrent ? 40 : 36;
  const borderRadius = size / 2;

  const bgColor =
    result === true
      ? "#22c55e"
      : result === false
        ? "#ef4444"
        : isCurrent
          ? "#f5c518"
          : "rgba(255,255,255,0.15)";

  const borderColor =
    result === true
      ? "#16a34a"
      : result === false
        ? "#dc2626"
        : isCurrent
          ? "#f5c518"
          : "rgba(255,255,255,0.1)";

  const emoji =
    result === true ? "✓" : result === false ? "✗" : isCurrent ? "🧭" : `${index + 1}`;

  return (
    <View className="items-center" style={{ flex: 1 }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius,
          backgroundColor: bgColor,
          borderWidth: isCurrent ? 3 : 2,
          borderColor,
          borderStyle: isCurrent && result === null ? "dashed" : "solid",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            color: result !== null || isCurrent ? "#1a1a2e" : "rgba(255,255,255,0.5)",
            fontWeight: "bold",
            fontSize: isCurrent ? 13 : 14,
          }}
        >
          {emoji}
        </Text>
      </View>
    </View>
  );
}

function WaveAnimation() {
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const wave = Animated.loop(
      Animated.timing(translateX, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    );
    wave.start();
    return () => wave.stop();
  }, [translateX]);

  // Animate exactly one wave period (42px) so the loop is seamless
  const animatedTranslate = translateX.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -42],
  });

  return (
    <Animated.View
      style={{ transform: [{ translateX: animatedTranslate }], overflow: "hidden" }}
      className="mt-2"
    >
      <Svg width={460} height={14} viewBox="0 0 460 14">
        <Path
          d="M 0 8 Q 21 2 42 8 Q 63 14 84 8 Q 105 2 126 8 Q 147 14 168 8 Q 189 2 210 8 Q 231 14 252 8 Q 273 2 294 8 Q 315 14 336 8 Q 357 2 378 8 Q 399 14 420 8 Q 441 2 462 8"
          stroke="rgba(100,180,255,0.4)"
          strokeWidth="1.5"
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
}

export function TreasureMap({ questionResults, currentIndex, totalQuestions }: TreasureMapProps) {
  const correctCount = questionResults.filter((r) => r === true).length;
  const allDone = questionResults.every((r) => r !== null);
  const treasureFound = allDone && correctCount >= 3;

  return (
    <View className="bg-ocean-mid rounded-2xl p-4 border border-ocean-light">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row items-center">
          <Text className="text-base mr-1">🏴‍☠️</Text>
          <Text className="text-gold font-bold text-sm">TREASURE MAP</Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-parchment-dark text-xs">
            {correctCount}/5 clues
          </Text>
          <Text className="text-base ml-1">
            {treasureFound ? "💰" : allDone ? "🔒" : "💎"}
          </Text>
        </View>
      </View>

      {/* Path with stops */}
      <View className="flex-row items-center px-1">
        {STOP_NAMES.slice(0, totalQuestions).map((_, i) => (
          <View key={i} className="flex-row items-center" style={{ flex: 1 }}>
            <MapStop
              result={questionResults[i]}
              isCurrent={i === currentIndex}
              index={i}
            />
            {/* Connecting line between stops */}
            {i < totalQuestions - 1 && (
              <View
                style={{
                  height: 2,
                  flex: 1,
                  backgroundColor:
                    questionResults[i] === true
                      ? "#f5c518"
                      : "rgba(255,255,255,0.1)",
                  marginHorizontal: -4,
                }}
              />
            )}
          </View>
        ))}
      </View>

      {/* Current stop name — full name, no truncation */}
      <Text
        style={{
          color: "#f5c518",
          fontSize: 11,
          fontWeight: "bold",
          textAlign: "center",
          marginTop: 6,
        }}
      >
        {STOP_NAMES[currentIndex]}
      </Text>

      {/* SVG wave */}
      <WaveAnimation />
    </View>
  );
}
