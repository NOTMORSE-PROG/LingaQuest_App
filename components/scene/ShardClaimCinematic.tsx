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
  cancelAnimation,
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

function FrostSparkle({ x, y, delay }: { x: number; y: number; delay: number }) {
  const opacity = useSharedValue(0.1);
  useEffect(() => {
    const t = setTimeout(() => {
      opacity.value = withRepeat(withSequence(
        withTiming(0.75, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.1, { duration: 800, easing: Easing.inOut(Easing.quad) }),
      ), -1, false);
    }, delay);
    return () => { clearTimeout(t); cancelAnimation(opacity); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: "absolute",
        left: x - 2, top: y - 2,
        width: 4, height: 4, borderRadius: 2,
        backgroundColor: "#b4e6ff",
      }, style]}
    />
  );
}

function ElectricSparkle({ x, y, delay }: { x: number; y: number; delay: number }) {
  const opacity = useSharedValue(0.1);
  useEffect(() => {
    const t = setTimeout(() => {
      opacity.value = withRepeat(withSequence(
        withTiming(0.80, { duration: 400, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.1, { duration: 600, easing: Easing.inOut(Easing.quad) }),
      ), -1, false);
    }, delay);
    return () => { clearTimeout(t); cancelAnimation(opacity); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: "absolute",
        left: x - 2, top: y - 2,
        width: 4, height: 4, borderRadius: 2,
        backgroundColor: "#c39bd3",
      }, style]}
    />
  );
}

function MistSparkle({ x, y, delay }: { x: number; y: number; delay: number }) {
  const opacity = useSharedValue(0.1);
  useEffect(() => {
    const t = setTimeout(() => {
      opacity.value = withRepeat(withSequence(
        withTiming(0.70, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ), -1, false);
    }, delay);
    return () => { clearTimeout(t); cancelAnimation(opacity); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: "absolute",
        left: x - 2, top: y - 2,
        width: 4, height: 4, borderRadius: 2,
        backgroundColor: "#a8c8e0",
      }, style]}
    />
  );
}

function EmberSparkle({ x, y, delay }: { x: number; y: number; delay: number }) {
  const opacity = useSharedValue(0.1);
  useEffect(() => {
    const t = setTimeout(() => {
      opacity.value = withRepeat(withSequence(
        withTiming(0.75, { duration: 500, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      ), -1, false);
    }, delay);
    return () => { clearTimeout(t); cancelAnimation(opacity); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: "absolute",
        left: x - 2, top: y - 2,
        width: 4, height: 4, borderRadius: 2,
        backgroundColor: "#e74c3c",
      }, style]}
    />
  );
}

function PrecisionSparkle({ x, y, delay }: { x: number; y: number; delay: number }) {
  const opacity = useSharedValue(0.1);
  useEffect(() => {
    const t = setTimeout(() => {
      opacity.value = withRepeat(withSequence(
        withTiming(0.72, { duration: 550, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.1, { duration: 750, easing: Easing.inOut(Easing.quad) }),
      ), -1, false);
    }, delay);
    return () => { clearTimeout(t); cancelAnimation(opacity); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: "absolute",
        left: x - 2, top: y - 2,
        width: 4, height: 4, borderRadius: 2,
        backgroundColor: "#e67e22",
      }, style]}
    />
  );
}

function NarrativeSparkle({ x, y, delay }: { x: number; y: number; delay: number }) {
  const opacity = useSharedValue(0.1);
  useEffect(() => {
    const t = setTimeout(() => {
      opacity.value = withRepeat(withSequence(
        withTiming(0.70, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.1,  { duration: 800, easing: Easing.inOut(Easing.quad) }),
      ), -1, false);
    }, delay);
    return () => { clearTimeout(t); cancelAnimation(opacity); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: "absolute",
        left: x - 2, top: y - 2,
        width: 4, height: 4, borderRadius: 2,
        backgroundColor: "#1abc9c",
      }, style]}
    />
  );
}

function EchoSparkle({ x, y, delay }: { x: number; y: number; delay: number }) {
  const opacity = useSharedValue(0.1);
  useEffect(() => {
    const t = setTimeout(() => {
      opacity.value = withRepeat(withSequence(
        withTiming(0.85, { duration: 350, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.1, { duration: 550, easing: Easing.inOut(Easing.quad) }),
      ), -1, false);
    }, delay);
    return () => { clearTimeout(t); cancelAnimation(opacity); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: "absolute",
        left: x - 2, top: y - 2,
        width: 4, height: 4, borderRadius: 2,
        backgroundColor: "#f5c518",
      }, style]}
    />
  );
}

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

    return () => {
      cancelAnimation(bgOpacity);
      cancelAnimation(r1Scale);
      cancelAnimation(r1Opacity);
      cancelAnimation(r2Scale);
      cancelAnimation(r2Opacity);
      cancelAnimation(r3Scale);
      cancelAnimation(r3Opacity);
      cancelAnimation(shardScale);
      cancelAnimation(shardOpacity);
      cancelAnimation(btnScale);
      cancelAnimation(btnOpacity);
    };
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

      {/* Echo rings — colored + Island 1 extra ice-blue ring */}
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
      {islandNum === 1 && (
        <View style={[StyleSheet.absoluteFillObject, styles.center]} pointerEvents="none">
          <Animated.View style={[{
            width: RING_SIZE,
            height: RING_SIZE,
            borderRadius: RING_SIZE / 2,
            borderWidth: 1.5,
            borderColor: "rgba(100,200,230,0.5)",
          }, r2Style]} />
        </View>
      )}
      {islandNum === 2 && (
        <View style={[StyleSheet.absoluteFillObject, styles.center]} pointerEvents="none">
          <Animated.View style={[{
            width: RING_SIZE,
            height: RING_SIZE,
            borderRadius: RING_SIZE / 2,
            borderWidth: 1.5,
            borderColor: "rgba(195,155,211,0.5)",
          }, r2Style]} />
        </View>
      )}
      {islandNum === 3 && (
        <View style={[StyleSheet.absoluteFillObject, styles.center]} pointerEvents="none">
          <Animated.View style={[{
            width: RING_SIZE,
            height: RING_SIZE,
            borderRadius: RING_SIZE / 2,
            borderWidth: 1.5,
            borderColor: "rgba(100,180,240,0.5)",
          }, r2Style]} />
        </View>
      )}
      {islandNum === 4 && (
        <View style={[StyleSheet.absoluteFillObject, styles.center]} pointerEvents="none">
          <Animated.View style={[{
            width: RING_SIZE,
            height: RING_SIZE,
            borderRadius: RING_SIZE / 2,
            borderWidth: 1.5,
            borderColor: "rgba(245,130,80,0.5)",
          }, r2Style]} />
        </View>
      )}
      {islandNum === 5 && (
        <View style={[StyleSheet.absoluteFillObject, styles.center]} pointerEvents="none">
          <Animated.View style={[{
            width: RING_SIZE,
            height: RING_SIZE,
            borderRadius: RING_SIZE / 2,
            borderWidth: 1.5,
            borderColor: "rgba(245,197,24,0.5)",
          }, r2Style]} />
        </View>
      )}
      {islandNum === 6 && (
        <View style={[StyleSheet.absoluteFillObject, styles.center]} pointerEvents="none">
          <Animated.View style={[{
            width: RING_SIZE,
            height: RING_SIZE,
            borderRadius: RING_SIZE / 2,
            borderWidth: 1.5,
            borderColor: "rgba(26,188,156,0.5)",
          }, r2Style]} />
        </View>
      )}
      {islandNum === 7 && (
        <View style={[StyleSheet.absoluteFillObject, styles.center]} pointerEvents="none">
          <Animated.View style={[{
            width: RING_SIZE,
            height: RING_SIZE,
            borderRadius: RING_SIZE / 2,
            borderWidth: 1.5,
            borderColor: "rgba(142,68,173,0.5)",
          }, r2Style]} />
        </View>
      )}

      {/* Main content */}
      <View style={[StyleSheet.absoluteFillObject, styles.center, { paddingHorizontal: 32 }]} pointerEvents="box-none">

        {/* Diamond shard */}
        <Animated.View style={[styles.center, shardStyle]}>
          {/* Island 1 — warm tropical underglow (nature trying to return) */}
          {islandNum === 1 && (
            <View style={{
              position: "absolute",
              width: 150, height: 150,
              transform: [{ rotate: "45deg" }],
              backgroundColor: "#27ae6018",
              borderRadius: 12,
            }} />
          )}
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
          {/* Island 1 — ice blue top glow */}
          {islandNum === 1 && (
            <View style={{
              position: "absolute",
              width: 84, height: 84,
              transform: [{ rotate: "45deg" }],
              backgroundColor: "rgba(100,200,230,0.06)",
              borderRadius: 8,
            }} />
          )}
          {/* Island 2 — electric storm underglow */}
          {islandNum === 2 && (
            <View style={{
              position: "absolute",
              width: 150, height: 150,
              transform: [{ rotate: "45deg" }],
              backgroundColor: "#8e44ad18",
              borderRadius: 12,
            }} />
          )}
          {/* Island 2 — purple top glow */}
          {islandNum === 2 && (
            <View style={{
              position: "absolute",
              width: 84, height: 84,
              transform: [{ rotate: "45deg" }],
              backgroundColor: "rgba(195,155,211,0.08)",
              borderRadius: 8,
            }} />
          )}
          {/* Island 3 — misty lagoon underglow */}
          {islandNum === 3 && (
            <View style={{
              position: "absolute",
              width: 150, height: 150,
              transform: [{ rotate: "45deg" }],
              backgroundColor: "#3498db18",
              borderRadius: 12,
            }} />
          )}
          {/* Island 3 — fog blue top glow */}
          {islandNum === 3 && (
            <View style={{
              position: "absolute",
              width: 84, height: 84,
              transform: [{ rotate: "45deg" }],
              backgroundColor: "rgba(100,180,240,0.07)",
              borderRadius: 8,
            }} />
          )}
          {/* Island 4 — lava underglow */}
          {islandNum === 4 && (
            <View style={{
              position: "absolute",
              width: 150, height: 150,
              transform: [{ rotate: "45deg" }],
              backgroundColor: "#e74c3c18",
              borderRadius: 12,
            }} />
          )}
          {/* Island 4 — ember top glow */}
          {islandNum === 4 && (
            <View style={{
              position: "absolute",
              width: 84, height: 84,
              transform: [{ rotate: "45deg" }],
              backgroundColor: "rgba(245,130,80,0.08)",
              borderRadius: 8,
            }} />
          )}
          {/* Island 5 — harbour underglow */}
          {islandNum === 5 && (
            <View style={{
              position: "absolute",
              width: 150, height: 150,
              transform: [{ rotate: "45deg" }],
              backgroundColor: "#e67e2218",
              borderRadius: 12,
            }} />
          )}
          {/* Island 5 — beacon top glow */}
          {islandNum === 5 && (
            <View style={{
              position: "absolute",
              width: 84, height: 84,
              transform: [{ rotate: "45deg" }],
              backgroundColor: "rgba(245,197,24,0.08)",
              borderRadius: 8,
            }} />
          )}
          {/* Island 6 — library underglow */}
          {islandNum === 6 && (
            <View style={{
              position: "absolute",
              width: 150, height: 150,
              transform: [{ rotate: "45deg" }],
              backgroundColor: "#1abc9c18",
              borderRadius: 12,
            }} />
          )}
          {/* Island 6 — parchment-teal top glow */}
          {islandNum === 6 && (
            <View style={{
              position: "absolute",
              width: 84, height: 84,
              transform: [{ rotate: "45deg" }],
              backgroundColor: "rgba(26,188,156,0.07)",
              borderRadius: 8,
            }} />
          )}
          {/* Island 7 — storm underglow */}
          {islandNum === 7 && (
            <View style={{
              position: "absolute",
              width: 150, height: 150,
              transform: [{ rotate: "45deg" }],
              backgroundColor: "#f5c51818",
              borderRadius: 12,
            }} />
          )}
          {/* Island 7 — purple-gold top glow */}
          {islandNum === 7 && (
            <View style={{
              position: "absolute",
              width: 84, height: 84,
              transform: [{ rotate: "45deg" }],
              backgroundColor: "rgba(142,68,173,0.08)",
              borderRadius: 8,
            }} />
          )}
        </Animated.View>

        {/* Island 1 — frost sparkle particles around the shard */}
        {islandNum === 1 && (
          <>
            <FrostSparkle x={22}  y={22}  delay={0} />
            <FrostSparkle x={108} y={18}  delay={300} />
            <FrostSparkle x={12}  y={70}  delay={600} />
            <FrostSparkle x={118} y={76}  delay={200} />
            <FrostSparkle x={44}  y={112} delay={900} />
            <FrostSparkle x={96}  y={116} delay={500} />
          </>
        )}
        {/* Island 2 — electric sparkle particles around the shard */}
        {islandNum === 2 && (
          <>
            <ElectricSparkle x={22}  y={22}  delay={0} />
            <ElectricSparkle x={108} y={18}  delay={250} />
            <ElectricSparkle x={12}  y={70}  delay={500} />
            <ElectricSparkle x={118} y={76}  delay={150} />
            <ElectricSparkle x={44}  y={112} delay={750} />
            <ElectricSparkle x={96}  y={116} delay={400} />
          </>
        )}
        {/* Island 3 — mist sparkle particles around the shard */}
        {islandNum === 3 && (
          <>
            <MistSparkle x={22}  y={22}  delay={0} />
            <MistSparkle x={108} y={18}  delay={350} />
            <MistSparkle x={12}  y={70}  delay={700} />
            <MistSparkle x={118} y={76}  delay={200} />
            <MistSparkle x={44}  y={112} delay={850} />
            <MistSparkle x={96}  y={116} delay={450} />
          </>
        )}
        {/* Island 4 — ember sparkle particles around the shard */}
        {islandNum === 4 && (
          <>
            <EmberSparkle x={22}  y={22}  delay={0} />
            <EmberSparkle x={108} y={18}  delay={250} />
            <EmberSparkle x={12}  y={70}  delay={500} />
            <EmberSparkle x={118} y={76}  delay={150} />
            <EmberSparkle x={44}  y={112} delay={700} />
            <EmberSparkle x={96}  y={116} delay={350} />
          </>
        )}
        {/* Island 5 — precision sparkle particles around the shard */}
        {islandNum === 5 && (
          <>
            <PrecisionSparkle x={22}  y={22}  delay={0} />
            <PrecisionSparkle x={108} y={18}  delay={200} />
            <PrecisionSparkle x={12}  y={70}  delay={450} />
            <PrecisionSparkle x={118} y={76}  delay={150} />
            <PrecisionSparkle x={44}  y={112} delay={650} />
            <PrecisionSparkle x={96}  y={116} delay={350} />
          </>
        )}
        {/* Island 6 — narrative sparkle particles around the shard */}
        {islandNum === 6 && (
          <>
            <NarrativeSparkle x={22}  y={22}  delay={0} />
            <NarrativeSparkle x={108} y={18}  delay={300} />
            <NarrativeSparkle x={12}  y={70}  delay={550} />
            <NarrativeSparkle x={118} y={76}  delay={150} />
            <NarrativeSparkle x={44}  y={112} delay={750} />
            <NarrativeSparkle x={96}  y={116} delay={400} />
          </>
        )}
        {/* Island 7 — echo sparkle particles around the shard */}
        {islandNum === 7 && (
          <>
            <EchoSparkle x={22}  y={22}  delay={0} />
            <EchoSparkle x={108} y={18}  delay={200} />
            <EchoSparkle x={12}  y={70}  delay={400} />
            <EchoSparkle x={118} y={76}  delay={100} />
            <EchoSparkle x={44}  y={112} delay={600} />
            <EchoSparkle x={96}  y={116} delay={300} />
          </>
        )}

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
