import { useEffect } from "react";
import { View } from "react-native";
import Svg, {
  Circle, Ellipse, Path, Rect,
} from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";

export type DagatState = "idle" | "listening" | "correct" | "wrong" | "celebrating";

interface Props {
  state: DagatState;
  size?: number;
}

export function DagatCharacter({ state, size = 200 }: Props) {
  // Body bob (idle + listening)
  const bodyY = useSharedValue(0);
  // Whole character scale (correct / celebrate)
  const scale = useSharedValue(1);
  // Rotation for wrong-answer shrug
  const rotation = useSharedValue(0);
  // Arm raise for listening
  const armAngle = useSharedValue(0);
  // Celebrate jump
  const jumpY = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(bodyY);
    cancelAnimation(scale);
    cancelAnimation(rotation);
    cancelAnimation(armAngle);
    cancelAnimation(jumpY);

    switch (state) {
      case "idle":
        bodyY.value = withRepeat(
          withSequence(
            withTiming(-6, { duration: 900, easing: Easing.inOut(Easing.sin) }),
            withTiming(0, { duration: 900, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          true
        );
        break;

      case "listening":
        // Subtle lean forward
        bodyY.value = withRepeat(
          withSequence(
            withTiming(-3, { duration: 700 }),
            withTiming(0, { duration: 700 })
          ),
          -1,
          true
        );
        armAngle.value = withSpring(1, { damping: 8 });
        break;

      case "correct":
        armAngle.value = 0;
        scale.value = withSequence(
          withSpring(1.2, { damping: 6 }),
          withTiming(1, { duration: 300 })
        );
        bodyY.value = withSequence(
          withTiming(-18, { duration: 200 }),
          withTiming(0, { duration: 200 }),
          withTiming(-10, { duration: 150 }),
          withTiming(0, { duration: 150 })
        );
        break;

      case "wrong":
        armAngle.value = 0;
        rotation.value = withSequence(
          withTiming(-8, { duration: 120 }),
          withTiming(8, { duration: 120 }),
          withTiming(-5, { duration: 100 }),
          withTiming(5, { duration: 100 }),
          withTiming(0, { duration: 100 })
        );
        bodyY.value = withTiming(6, { duration: 300 });
        break;

      case "celebrating":
        jumpY.value = withRepeat(
          withSequence(
            withTiming(-30, { duration: 300, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) })
          ),
          3,
          false
        );
        scale.value = withRepeat(
          withSequence(
            withTiming(1.15, { duration: 300 }),
            withTiming(1, { duration: 300 })
          ),
          3,
          false
        );
        break;
    }
  }, [state, armAngle, bodyY, jumpY, rotation, scale]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bodyY.value + jumpY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  // Arm raised when listening
  const armStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${armAngle.value * -40}deg` }],
  }));

  // Expression eyes/mouth change per state
  const isWrong = state === "wrong";
  const isCorrect = state === "correct" || state === "celebrating";
  const isListening = state === "listening";

  return (
    <View style={{ width: size, height: size * 1.4, alignItems: "center" }}>
      <Animated.View style={[{ width: size, height: size * 1.4 }, containerStyle]}>
        <Svg width={size} height={size * 1.4} viewBox="0 0 200 280">

          {/* === SHADOW === */}
          <Ellipse cx="100" cy="272" rx="38" ry="8" fill="rgba(0,0,0,0.15)" />

          {/* === LEGS === */}
          <Rect x="78" y="195" width="18" height="55" rx="9" fill="#1a1a2e" stroke="#000" strokeWidth="2.5" />
          <Rect x="104" y="195" width="18" height="55" rx="9" fill="#1a1a2e" stroke="#000" strokeWidth="2.5" />
          {/* Boots */}
          <Ellipse cx="87" cy="250" rx="14" ry="8" fill="#3d2b1f" stroke="#000" strokeWidth="2" />
          <Ellipse cx="113" cy="250" rx="14" ry="8" fill="#3d2b1f" stroke="#000" strokeWidth="2" />

          {/* === BODY (green jacket) === */}
          <Path
            d="M65 145 Q65 115 100 112 Q135 115 135 145 L140 200 Q100 210 60 200 Z"
            fill="#27ae60"
            stroke="#000"
            strokeWidth="3"
          />
          {/* Jacket lapels */}
          <Path d="M100 115 L88 145 L100 140 L112 145 Z" fill="#2ecc71" stroke="#000" strokeWidth="2" />
          {/* Gold buttons */}
          <Circle cx="100" cy="152" r="4" fill="#f5c518" stroke="#000" strokeWidth="1.5" />
          <Circle cx="100" cy="167" r="4" fill="#f5c518" stroke="#000" strokeWidth="1.5" />
          <Circle cx="100" cy="182" r="4" fill="#f5c518" stroke="#000" strokeWidth="1.5" />

          {/* === LEFT ARM (normal, pointing down) === */}
          <Path
            d="M68 130 Q50 145 52 170"
            stroke="#27ae60"
            strokeWidth="16"
            strokeLinecap="round"
            fill="none"
          />
          {/* Left hand */}
          <Circle cx="52" cy="172" r="10" fill="#f4a460" stroke="#000" strokeWidth="2.5" />

          {/* === RIGHT ARM (raised when listening) === */}
          <Animated.View
            style={[
              {
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                transformOrigin: "132px 130px",
              },
              armStyle,
            ]}
          >
            <Svg width={size} height={size * 1.4} viewBox="0 0 200 280" style={{ position: "absolute" }}>
              <Path
                d="M132 130 Q155 120 158 100"
                stroke="#27ae60"
                strokeWidth="16"
                strokeLinecap="round"
                fill="none"
              />
              {/* Right hand */}
              <Circle cx="158" cy="98" r="10" fill="#f4a460" stroke="#000" strokeWidth="2.5" />
              {/* Ear/hand gesture when listening */}
              {isListening && (
                <Path
                  d="M158 90 Q168 88 168 98 Q168 108 158 108"
                  stroke="#f4a460"
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="none"
                />
              )}
            </Svg>
          </Animated.View>

          {/* === NECK === */}
          <Rect x="90" y="100" width="20" height="18" rx="6" fill="#f4a460" stroke="#000" strokeWidth="2" />

          {/* === HEAD === */}
          <Ellipse cx="100" cy="82" rx="42" ry="45" fill="#f4a460" stroke="#000" strokeWidth="3" />

          {/* === TRICORN HAT === */}
          {/* Hat base band */}
          <Rect x="62" y="52" width="76" height="14" rx="3" fill="#1a1a1a" stroke="#000" strokeWidth="2.5" />
          {/* Gold band */}
          <Rect x="62" y="57" width="76" height="5" fill="#f5c518" />
          {/* Hat crown (center peak) */}
          <Path d="M80 52 Q100 10 120 52 Z" fill="#1a1a1a" stroke="#000" strokeWidth="2.5" />
          {/* Hat brims (left and right tricorn points) */}
          <Path d="M62 52 Q42 48 48 62 Q56 68 72 63 Z" fill="#1a1a1a" stroke="#000" strokeWidth="2" />
          <Path d="M138 52 Q158 48 152 62 Q144 68 128 63 Z" fill="#1a1a1a" stroke="#000" strokeWidth="2" />
          {/* Gold skull pin */}
          <Circle cx="100" cy="42" r="5" fill="#f5c518" stroke="#000" strokeWidth="1.5" />

          {/* === FACE === */}
          {/* Eyes */}
          {isWrong ? (
            <>
              {/* Sad/worried eyes — arched down */}
              <Path d="M82 80 Q87 76 92 80" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" fill="none" />
              <Path d="M108 80 Q113 76 118 80" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" fill="none" />
              {/* Sweat drop */}
              <Path d="M124 75 Q126 70 124 78" stroke="#5dade2" strokeWidth="3" strokeLinecap="round" fill="none" />
            </>
          ) : isCorrect ? (
            <>
              {/* Happy closed arc eyes */}
              <Path d="M82 82 Q87 76 92 82" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" fill="none" />
              <Path d="M108 82 Q113 76 118 82" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" fill="none" />
            </>
          ) : (
            <>
              {/* Normal eyes — open circles with pupils */}
              <Circle cx="87" cy="82" r="8" fill="white" stroke="#000" strokeWidth="2" />
              <Circle cx="113" cy="82" r="8" fill="white" stroke="#000" strokeWidth="2" />
              <Circle cx={isListening ? "89" : "87"} cy="82" r="4" fill="#1a1a1a" />
              <Circle cx={isListening ? "115" : "113"} cy="82" r="4" fill="#1a1a1a" />
              {/* Eye shine */}
              <Circle cx="89" cy="80" r="1.5" fill="white" />
              <Circle cx="115" cy="80" r="1.5" fill="white" />
            </>
          )}

          {/* Eyebrows */}
          <Path
            d={isWrong ? "M80 72 Q87 75 94 72" : isListening ? "M80 70 Q87 67 94 70" : "M80 72 Q87 69 94 72"}
            stroke="#5d3a1a"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d={isWrong ? "M106 72 Q113 75 120 72" : isListening ? "M106 70 Q113 67 120 70" : "M106 72 Q113 69 120 72"}
            stroke="#5d3a1a"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />

          {/* Mouth */}
          {isWrong ? (
            <Path d="M90 100 Q100 95 110 100" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          ) : isCorrect ? (
            <Path d="M88 97 Q100 108 112 97" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          ) : isListening ? (
            <Ellipse cx="100" cy="101" rx="7" ry="5" fill="#c0392b" stroke="#1a1a1a" strokeWidth="2" />
          ) : (
            <Path d="M90 98 Q100 105 110 98" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          )}

          {/* Cheek blush */}
          <Ellipse cx="77" cy="93" rx="9" ry="5" fill="rgba(231,76,60,0.25)" />
          <Ellipse cx="123" cy="93" rx="9" ry="5" fill="rgba(231,76,60,0.25)" />

          {/* Celebrating stars */}
          {state === "celebrating" && (
            <>
              <Path d="M148 60 L150 52 L152 60 L160 58 L154 64 L156 72 L150 67 L144 72 L146 64 L140 58 Z"
                fill="#f5c518" stroke="#e67e22" strokeWidth="1" />
              <Path d="M38 70 L40 64 L42 70 L48 68 L43 73 L45 79 L40 75 L35 79 L37 73 L32 68 Z"
                fill="#f5c518" stroke="#e67e22" strokeWidth="1" />
            </>
          )}

        </Svg>
      </Animated.View>
    </View>
  );
}
