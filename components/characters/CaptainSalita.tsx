import { useEffect, useRef } from "react";
import { View, Text } from "react-native";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer } from "expo-audio";
import { resolveAudioSource } from "@/lib/audio-assets";
import Svg, { Circle, Ellipse, Path, Rect, Line } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

export type CaptainState = "idle" | "talking" | "pointing";

interface Props {
  state: CaptainState;
  dialogue?: string;
  audioUrl?: string;
  size?: number;
}

export function CaptainSalita({ state, dialogue, audioUrl, size = 180 }: Props) {
  const soundRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    let mounted = true;

    async function playAudio() {
      if (!audioUrl || state !== "talking") return;
      try {
        await setAudioModeAsync({ playsInSilentMode: true });
        if (!mounted) return;
        const p = createAudioPlayer(resolveAudioSource(audioUrl));
        if (!mounted) { p.remove(); return; }
        soundRef.current = p;
        p.play();
      } catch {
        // Audio unavailable — visual animation continues without sound
      }
    }

    function stopAudio() {
      const p = soundRef.current;
      soundRef.current = null;
      if (p) {
        p.pause();
        p.remove();
      }
    }

    if (state === "talking") {
      playAudio();
    } else {
      stopAudio();
    }

    return () => {
      mounted = false;
      stopAudio();
    };
  }, [state, audioUrl]);
  const bodyY = useSharedValue(0);
  // Mouth open/close cycle when talking
  const mouthOpen = useSharedValue(0);
  // Pointer arm
  const armAngle = useSharedValue(0);
  // Speech bubble fade
  const bubbleOpacity = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(bodyY);
    cancelAnimation(mouthOpen);
    cancelAnimation(armAngle);
    cancelAnimation(bubbleOpacity);

    switch (state) {
      case "idle":
        bodyY.value = withRepeat(
          withSequence(
            withTiming(-4, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
            withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          true
        );
        bubbleOpacity.value = withTiming(0, { duration: 300 });
        mouthOpen.value = 0;
        break;

      case "talking":
        bodyY.value = withRepeat(
          withSequence(
            withTiming(-3, { duration: 800 }),
            withTiming(0, { duration: 800 })
          ),
          -1,
          true
        );
        mouthOpen.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 250 }),
            withTiming(0, { duration: 250 })
          ),
          -1,
          false
        );
        bubbleOpacity.value = withSpring(1, { damping: 12 });
        break;

      case "pointing":
        bodyY.value = 0;
        armAngle.value = withSpring(-1, { damping: 8 });
        bubbleOpacity.value = withTiming(0, { duration: 200 });
        break;
    }
  }, [state, armAngle, bodyY, bubbleOpacity, mouthOpen]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bodyY.value }],
  }));

  const mouthAnimatedProps = useAnimatedProps(() => ({
    ry: 5 + mouthOpen.value * 4,
  }));

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: bubbleOpacity.value,
    transform: [{ scale: bubbleOpacity.value * 0.2 + 0.8 }],
  }));

  const isTalking = state === "talking";
  const isPointing = state === "pointing";

  return (
    <View style={{ alignItems: "center" }}>
      <Animated.View style={containerStyle}>
        <Svg width={size} height={size * 1.5} viewBox="0 0 180 270">

          {/* Shadow */}
          <Ellipse cx="90" cy="262" rx="34" ry="7" fill="rgba(0,0,0,0.15)" />

          {/* Legs */}
          <Rect x="68" y="188" width="17" height="52" rx="8" fill="#2c3e50" stroke="#000" strokeWidth="2.5" />
          <Rect x="95" y="188" width="17" height="52" rx="8" fill="#2c3e50" stroke="#000" strokeWidth="2.5" />
          {/* Boots */}
          <Ellipse cx="76" cy="240" rx="14" ry="8" fill="#1a1a1a" stroke="#000" strokeWidth="2" />
          <Ellipse cx="103" cy="240" rx="14" ry="8" fill="#1a1a1a" stroke="#000" strokeWidth="2" />

          {/* Body — Navy captain coat */}
          <Path
            d="M55 138 Q55 108 90 105 Q125 108 125 138 L130 192 Q90 202 50 192 Z"
            fill="#1a3a5c"
            stroke="#000"
            strokeWidth="3"
          />
          {/* Coat lapels */}
          <Path d="M90 108 L78 138 L90 133 L102 138 Z" fill="#f0e6d3" stroke="#000" strokeWidth="1.5" />
          {/* Gold epaulettes */}
          <Ellipse cx="56" cy="122" rx="12" ry="7" fill="#f5c518" stroke="#000" strokeWidth="2" />
          <Ellipse cx="124" cy="122" rx="12" ry="7" fill="#f5c518" stroke="#000" strokeWidth="2" />
          {/* Medal */}
          <Circle cx="90" cy="148" r="8" fill="#f5c518" stroke="#000" strokeWidth="2" />
          <Circle cx="90" cy="148" r="4" fill="#e74c3c" stroke="#000" strokeWidth="1" />

          {/* Left arm — resting */}
          <Path
            d="M58 128 Q40 148 42 168"
            stroke="#1a3a5c"
            strokeWidth="15"
            strokeLinecap="round"
            fill="none"
          />
          <Circle cx="42" cy="170" r="9" fill="#d4a574" stroke="#000" strokeWidth="2.5" />

          {/* Right arm — pointing when state=pointing */}
          <Path
            d={isPointing
              ? "M122 128 Q148 110 162 95"
              : "M122 128 Q140 148 138 168"}
            stroke="#1a3a5c"
            strokeWidth="15"
            strokeLinecap="round"
            fill="none"
          />
          <Circle
            cx={isPointing ? "163" : "138"}
            cy={isPointing ? "93" : "170"}
            r="9"
            fill="#d4a574"
            stroke="#000"
            strokeWidth="2.5"
          />
          {/* Pointing finger */}
          {isPointing && (
            <Path d="M163 84 L163 93" stroke="#d4a574" strokeWidth="6" strokeLinecap="round" />
          )}

          {/* Neck */}
          <Rect x="80" y="95" width="20" height="16" rx="6" fill="#d4a574" stroke="#000" strokeWidth="2" />

          {/* Head — slightly larger, older face */}
          <Ellipse cx="90" cy="76" rx="40" ry="42" fill="#d4a574" stroke="#000" strokeWidth="3" />

          {/* === CAPTAIN'S BICORNE HAT === */}
          {/* Hat body */}
          <Path
            d="M55 55 Q90 20 125 55 Q125 68 90 65 Q55 68 55 55 Z"
            fill="#1a3a5c"
            stroke="#000"
            strokeWidth="3"
          />
          {/* Hat brim left */}
          <Path d="M55 55 Q35 52 38 65 Q46 72 62 65 Z" fill="#1a3a5c" stroke="#000" strokeWidth="2" />
          {/* Hat brim right */}
          <Path d="M125 55 Q145 52 142 65 Q134 72 118 65 Z" fill="#1a3a5c" stroke="#000" strokeWidth="2" />
          {/* Gold trim */}
          <Path d="M55 58 Q90 26 125 58" stroke="#f5c518" strokeWidth="3" fill="none" />
          {/* Ship emblem */}
          <Path d="M82 42 L90 28 L98 42 L90 38 Z" fill="#f5c518" stroke="#000" strokeWidth="1" />

          {/* === WEATHERED FACE === */}
          {/* Wrinkle lines */}
          <Path d="M60 70 Q65 67 68 70" stroke="#b8860b" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <Path d="M112 70 Q115 67 120 70" stroke="#b8860b" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <Path d="M72 88 Q75 85 78 88" stroke="#b8860b" strokeWidth="1" strokeLinecap="round" fill="none" />
          <Path d="M102 88 Q105 85 108 88" stroke="#b8860b" strokeWidth="1" strokeLinecap="round" fill="none" />

          {/* Eyes — kind, slightly weary */}
          <Ellipse cx="78" cy="75" rx="9" ry="7" fill="white" stroke="#000" strokeWidth="2" />
          <Ellipse cx="102" cy="75" rx="9" ry="7" fill="white" stroke="#000" strokeWidth="2" />
          {/* Irises */}
          <Circle cx="79" cy="75" r="5" fill="#5d4037" />
          <Circle cx="103" cy="75" r="5" fill="#5d4037" />
          {/* Pupils */}
          <Circle cx="79" cy="75" r="2.5" fill="#1a1a1a" />
          <Circle cx="103" cy="75" r="2.5" fill="#1a1a1a" />
          {/* Eye shine */}
          <Circle cx="80" cy="73" r="1.5" fill="white" />
          <Circle cx="104" cy="73" r="1.5" fill="white" />
          {/* Crow's feet */}
          <Line x1="66" y1="72" x2="69" y2="75" stroke="#b8860b" strokeWidth="1" />
          <Line x1="66" y1="76" x2="69" y2="76" stroke="#b8860b" strokeWidth="1" />
          <Line x1="111" y1="72" x2="114" y2="75" stroke="#b8860b" strokeWidth="1" />
          <Line x1="111" y1="76" x2="114" y2="76" stroke="#b8860b" strokeWidth="1" />

          {/* Eyebrows — bushy, arched */}
          <Path d="M68 64 Q78 60 88 64" stroke="#5d4037" strokeWidth="4" strokeLinecap="round" fill="none" />
          <Path d="M92 64 Q102 60 112 64" stroke="#5d4037" strokeWidth="4" strokeLinecap="round" fill="none" />

          {/* Nose */}
          <Path d="M88 80 Q90 85 92 80" stroke="#b8860b" strokeWidth="2" strokeLinecap="round" fill="none" />
          <Ellipse cx="86" cy="82" rx="4" ry="2.5" fill="rgba(184,134,11,0.3)" />
          <Ellipse cx="94" cy="82" rx="4" ry="2.5" fill="rgba(184,134,11,0.3)" />

          {/* Mouth — changes with talking */}
          {isTalking ? (
            <AnimatedEllipse cx="90" cy="94" rx="10" fill="#8b1a1a" stroke="#000" strokeWidth="2" animatedProps={mouthAnimatedProps} />
          ) : (
            <Path d="M80 94 Q90 100 100 94" stroke="#5d4037" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          )}

          {/* Beard / stubble */}
          <Path d="M72 90 Q90 105 108 90 Q108 98 90 102 Q72 98 72 90 Z"
            fill="rgba(93,64,55,0.35)" stroke="none" />
          {/* Grey streaks in beard */}
          <Path d="M82 94 Q86 100 90 98" stroke="rgba(200,200,200,0.6)" strokeWidth="2" fill="none" />
          <Path d="M98 94 Q94 100 90 98" stroke="rgba(200,200,200,0.6)" strokeWidth="2" fill="none" />

          {/* Scar on left cheek */}
          <Line x1="64" y1="82" x2="68" y2="88" stroke="#8b6914" strokeWidth="2" strokeLinecap="round" />

        </Svg>
      </Animated.View>

      {/* === SPEECH BUBBLE === */}
      {dialogue && (
        <Animated.View style={[{ marginTop: -12 }, bubbleStyle]}>
          <View style={{
            backgroundColor: "#f4e4c1",
            borderRadius: 16,
            borderTopLeftRadius: 4,
            paddingHorizontal: 16,
            paddingVertical: 12,
            maxWidth: 240,
            borderWidth: 2,
            borderColor: "#d4b896",
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 4,
            elevation: 3,
          }}>
            <Text style={{
              color: "#1a1a2e",
              fontSize: 13,
              lineHeight: 20,
              fontStyle: "italic",
            }}>
              "{dialogue}"
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}
