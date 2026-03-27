import { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  FadeInDown,
  SharedValue,
} from "react-native-reanimated";
import { DagatCharacter } from "@/components/characters/DagatCharacter";
import { CaptainSalita } from "@/components/characters/CaptainSalita";

const SHARD_NAMES: Record<number, string> = {
  1: "Salita Shard",
  2: "Swift Shard",
  3: "Clarity Shard",
  4: "Empathy Shard",
  5: "Precision Shard",
  6: "Story Shard",
  7: "Echo Shard",
};

const ISLAND_LABELS: Record<number, string> = {
  1: "❄  ISLA NG SALITA",
  2: "⚡  ISLA NG BILIS",
  3: "🌫  ISLA NG DIWA",
  4: "🔥  ISLA NG DAMDAMIN",
  5: "🔍  ISLA NG TANONG",
  6: "📜  ISLA NG KWENTO",
  7: "🌪️  ISLA NG ALINGAWNGAW",
};

interface Props {
  islandNum: number;
  accentColor: string;
  characterMode: boolean;
  npcSuccess: string;
  npcAudioSuccess?: string;
  onClaim: () => void;
}

export function ShardClaimCinematic({ islandNum, accentColor, characterMode, npcSuccess, npcAudioSuccess, onClaim }: Props) {
  const shardName = SHARD_NAMES[islandNum] ?? "Island Shard";
  const islandLabel = ISLAND_LABELS[islandNum] ?? "";

  const bgOpacity = useSharedValue(0);

  const r1Scale = useSharedValue(0.2);
  const r1Opacity = useSharedValue(0);
  const r2Scale = useSharedValue(0.2);
  const r2Opacity = useSharedValue(0);
  const r3Scale = useSharedValue(0.2);
  const r3Opacity = useSharedValue(0);

  const shardScale = useSharedValue(0);
  const shardOpacity = useSharedValue(0);

  const btnScale = useSharedValue(0);
  const btnOpacity = useSharedValue(0);

  useEffect(() => {
    bgOpacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.quad) });

    const ringDuration = 1300;
    const ringEasing = Easing.out(Easing.quad);

    function animateRing(
      scale: SharedValue<number>,
      opacity: SharedValue<number>,
      delay: number,
    ) {
      scale.value = withDelay(delay, withRepeat(withTiming(3.8, { duration: ringDuration, easing: ringEasing }), -1, false));
      opacity.value = withDelay(delay, withRepeat(
        withSequence(
          withTiming(0.75, { duration: 80 }),
          withTiming(0, { duration: ringDuration - 80, easing: ringEasing }),
        ),
        -1, false,
      ));
    }

    animateRing(r1Scale, r1Opacity, 150);
    animateRing(r2Scale, r2Opacity, 280);
    animateRing(r3Scale, r3Opacity, 410);

    shardOpacity.value = withDelay(250, withTiming(1, { duration: 250 }));
    shardScale.value = withDelay(250, withSpring(1, { damping: 9, stiffness: 110 }));

    btnOpacity.value = withDelay(700, withTiming(1, { duration: 300 }));
    btnScale.value = withDelay(700, withSpring(1, { damping: 12, stiffness: 100 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));
  const r1Style = useAnimatedStyle(() => ({ transform: [{ scale: r1Scale.value }], opacity: r1Opacity.value }));
  const r2Style = useAnimatedStyle(() => ({ transform: [{ scale: r2Scale.value }], opacity: r2Opacity.value }));
  const r3Style = useAnimatedStyle(() => ({ transform: [{ scale: r3Scale.value }], opacity: r3Opacity.value }));
  const shardStyle = useAnimatedStyle(() => ({ transform: [{ scale: shardScale.value }], opacity: shardOpacity.value }));
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }], opacity: btnOpacity.value }));

  const RING_SIZE = 90;

  return (
    <View style={[StyleSheet.absoluteFillObject, { zIndex: 10 }]} pointerEvents="box-none">
      {/* Dark overlay */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.93)" }, bgStyle]} />

      {/* Echo rings — centered */}
      {[r1Style, r2Style, r3Style].map((style, i) => (
        <View key={i} style={[StyleSheet.absoluteFillObject, styles.center]} pointerEvents="none">
          <Animated.View style={[{
            width: RING_SIZE,
            height: RING_SIZE,
            borderRadius: RING_SIZE / 2,
            borderWidth: 1.5,
            borderColor: accentColor,
          }, style]} />
        </View>
      ))}

      {/* Main content */}
      <View style={[StyleSheet.absoluteFillObject, styles.center, { paddingHorizontal: 32 }]} pointerEvents="box-none">

        {/* Diamond shard */}
        <Animated.View style={[styles.center, shardStyle]}>
          {/* Glow bloom */}
          <View style={{
            position: "absolute",
            width: 130, height: 130,
            transform: [{ rotate: "45deg" }],
            backgroundColor: accentColor + "18",
            borderRadius: 10,
          }} />
          {/* Diamond */}
          <View style={{
            width: 84, height: 84,
            transform: [{ rotate: "45deg" }],
            backgroundColor: accentColor + "38",
            borderWidth: 2,
            borderColor: accentColor,
            borderRadius: 8,
          }} />
        </Animated.View>

        {/* Shard text */}
        <Animated.View entering={FadeInDown.delay(500).duration(380)} style={{ marginTop: 44, alignItems: "center" }}>
          <Text style={{ color: accentColor, fontSize: 10, letterSpacing: 2.5, marginBottom: 8 }}>
            {islandLabel}
          </Text>
          <Text style={{ color: "#ffffff", fontSize: 26, fontWeight: "800", textAlign: "center" }}>
            {shardName}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, marginTop: 6 }}>
            Recovered.
          </Text>
        </Animated.View>

        {/* Claim button */}
        <Animated.View style={[{ marginTop: 44, width: "100%" }, btnStyle]}>
          <TouchableOpacity
            onPress={onClaim}
            activeOpacity={0.85}
            style={{
              backgroundColor: accentColor,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#000", fontWeight: "800", fontSize: 17, letterSpacing: 0.3 }}>
              Claim the Shard
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Characters — only in character mode */}
      {characterMode && (
        <>
          <View style={{ position: "absolute", bottom: 16, left: 12 }} pointerEvents="none">
            <DagatCharacter state="celebrating" size={90} />
          </View>
          <View style={{ position: "absolute", bottom: 16, right: 12 }} pointerEvents="none">
            <CaptainSalita state="talking" dialogue={npcSuccess} audioUrl={npcAudioSuccess} size={90} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
});
