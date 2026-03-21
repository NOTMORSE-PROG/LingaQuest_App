import { useEffect } from "react";
import { View, Text, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";

const { width: SW, height: SH } = Dimensions.get("window");

interface Props {
  islandNumber: number;
}

// ─── Ice Crystal (Island 1 — Frozen) ─────────────────────────────────────────
function IceCrystal({ delay, x, size }: { delay: number; x: number; size: number }) {
  const y = useSharedValue(-20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    y.value = withRepeat(
      withSequence(
        withTiming(-20, { duration: 0 }),
        withTiming(SH + 20, { duration: 6000 + delay * 800, easing: Easing.linear })
      ),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay * 200 }),
        withTiming(0.35, { duration: 800 }),
        withTiming(0.35, { duration: 4400 + delay * 400 }),
        withTiming(0, { duration: 800 })
      ),
      -1,
      false
    );
    return () => { cancelAnimation(y); cancelAnimation(opacity); };
  }, [delay, opacity, y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { rotate: "45deg" }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[{
        position: "absolute",
        left: x,
        top: 0,
        width: size,
        height: size,
        backgroundColor: "#a8d8ea",
        borderRadius: 2,
      }, style]}
      pointerEvents="none"
    />
  );
}

// ─── Speed Streak (Island 2 — Bilis) ─────────────────────────────────────────
function SpeedStreak({ y, delay }: { y: number; delay: number }) {
  const x = useSharedValue(-200);
  const opacity = useSharedValue(0);

  useEffect(() => {
    x.value = withRepeat(
      withSequence(
        withTiming(-200, { duration: 0 }),
        withTiming(SW + 200, { duration: 900 + delay * 100, easing: Easing.linear })
      ),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay * 300 }),
        withTiming(0.25, { duration: 200 }),
        withTiming(0.25, { duration: 400 }),
        withTiming(0, { duration: 200 })
      ),
      -1,
      false
    );
    return () => { cancelAnimation(x); cancelAnimation(opacity); };
  }, [delay, opacity, x]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[{
        position: "absolute",
        top: y,
        left: 0,
        width: 120 + delay * 30,
        height: 2,
        backgroundColor: "#c39bd3",
        borderRadius: 1,
      }, style]}
      pointerEvents="none"
    />
  );
}

// ─── Fog Puff (Island 3 — Diwa) ──────────────────────────────────────────────
function FogPuff({ x, startY, size, delay }: { x: number; startY: number; size: number; delay: number }) {
  const y = useSharedValue(startY);
  const opacity = useSharedValue(0);

  useEffect(() => {
    y.value = withRepeat(
      withSequence(
        withTiming(startY, { duration: 0 }),
        withTiming(startY - 80, { duration: 8000 + delay * 1000, easing: Easing.linear })
      ),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay * 400 }),
        withTiming(0.10, { duration: 2000 }),
        withTiming(0.10, { duration: 4000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1,
      false
    );
    return () => { cancelAnimation(y); cancelAnimation(opacity); };
  }, [delay, opacity, startY, y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[{
        position: "absolute",
        left: x,
        top: 0,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#ecf0f1",
      }, style]}
      pointerEvents="none"
    />
  );
}

// ─── Ember Spark (Island 4 — Damdamin) ───────────────────────────────────────
function EmberSpark({ x, y, delay }: { x: number; y: number; delay: number }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay * 600 }),
        withTiming(0.20, { duration: 600 }),
        withTiming(0, { duration: 1200 })
      ),
      -1,
      false
    );
    return () => cancelAnimation(opacity);
  }, [delay, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{
        position: "absolute",
        left: x,
        top: y,
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: "#e74c3c",
      }, style]}
      pointerEvents="none"
    />
  );
}

// ─── Scattered Letter (Island 5 — Tanong) ────────────────────────────────────
function ScatteredChar({ char, x, startY, angle, delay }: { char: string; x: number; startY: number; angle: number; delay: number }) {
  const y = useSharedValue(startY);
  const opacity = useSharedValue(0);

  useEffect(() => {
    y.value = withRepeat(
      withSequence(
        withTiming(startY, { duration: 0 }),
        withTiming(startY - 120, { duration: 5000 + delay * 500, easing: Easing.linear })
      ),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay * 500 }),
        withTiming(0.22, { duration: 800 }),
        withTiming(0.22, { duration: 3000 }),
        withTiming(0, { duration: 800 })
      ),
      -1,
      false
    );
    return () => { cancelAnimation(y); cancelAnimation(opacity); };
  }, [delay, opacity, startY, y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { rotate: `${angle}deg` }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[{ position: "absolute", left: x, top: 0 }, style]} pointerEvents="none">
      <Text style={{ color: "#e67e22", fontSize: 14, fontWeight: "bold" }}>
        {char}
      </Text>
    </Animated.View>
  );
}

// ─── Scroll Fragment (Island 6 — Kwento) ─────────────────────────────────────
function ScrollFragment({ x, delay, rotation }: { x: number; delay: number; rotation: number }) {
  const y = useSharedValue(-30);
  const opacity = useSharedValue(0);

  useEffect(() => {
    y.value = withRepeat(
      withSequence(
        withTiming(-30, { duration: 0 }),
        withTiming(SH + 30, { duration: 10000 + delay * 1000, easing: Easing.linear })
      ),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay * 800 }),
        withTiming(0.18, { duration: 1500 }),
        withTiming(0.18, { duration: 6000 }),
        withTiming(0, { duration: 1500 })
      ),
      -1,
      false
    );
    return () => { cancelAnimation(y); cancelAnimation(opacity); };
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
        width: 36,
        height: 20,
        backgroundColor: "#f4e4c1",
        borderRadius: 3,
        borderWidth: 1,
        borderColor: "#d4b896",
      }, style]}
      pointerEvents="none"
    />
  );
}

// ─── Lightning Flash (Island 7 — Alingawngaw) ────────────────────────────────
function LightningFlash() {
  const opacity = useSharedValue(0);

  useEffect(() => {
    const flash = () => {
      opacity.value = withSequence(
        withTiming(0.12, { duration: 60 }),
        withTiming(0, { duration: 80 }),
        withTiming(0.08, { duration: 50 }),
        withTiming(0, { duration: 100 })
      );
    };
    flash();
    const id = setInterval(flash, 3200);
    return () => { clearInterval(id); cancelAnimation(opacity); };
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "#8e44ad",
      }, style]}
      pointerEvents="none"
    />
  );
}

function ElectricParticle({ x, y, delay }: { x: number; y: number; delay: number }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay * 400 }),
        withTiming(0.30, { duration: 200 }),
        withTiming(0, { duration: 400 })
      ),
      -1,
      false
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: delay * 400 }),
        withTiming(1.4, { duration: 200 }),
        withTiming(0.5, { duration: 400 })
      ),
      -1,
      false
    );
    return () => { cancelAnimation(opacity); cancelAnimation(scale); };
  }, [delay, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[{
        position: "absolute",
        left: x,
        top: y,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#f5c518",
      }, style]}
      pointerEvents="none"
    />
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function QuestSceneOverlay({ islandNumber }: Props) {
  return (
    <View
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}
      pointerEvents="none"
    >
      {islandNumber === 1 && (
        <>
          <IceCrystal delay={0} x={SW * 0.15} size={10} />
          <IceCrystal delay={1} x={SW * 0.40} size={7} />
          <IceCrystal delay={2} x={SW * 0.65} size={12} />
          <IceCrystal delay={3} x={SW * 0.82} size={8} />
        </>
      )}

      {islandNumber === 2 && (
        <>
          <SpeedStreak y={SH * 0.25} delay={0} />
          <SpeedStreak y={SH * 0.50} delay={1} />
          <SpeedStreak y={SH * 0.72} delay={2} />
        </>
      )}

      {islandNumber === 3 && (
        <>
          <FogPuff x={SW * 0.05} startY={SH * 0.55} size={140} delay={0} />
          <FogPuff x={SW * 0.45} startY={SH * 0.70} size={180} delay={1} />
          <FogPuff x={SW * 0.60} startY={SH * 0.30} size={120} delay={2} />
        </>
      )}

      {islandNumber === 4 && (
        <>
          {/* Desaturate overlay */}
          <View
            style={{
              position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "rgba(100,100,100,0.08)",
            }}
            pointerEvents="none"
          />
          <EmberSpark x={SW * 0.20} y={SH * 0.40} delay={0} />
          <EmberSpark x={SW * 0.75} y={SH * 0.65} delay={1} />
        </>
      )}

      {islandNumber === 5 && (
        <>
          <ScatteredChar char="A" x={SW * 0.10} startY={SH * 0.60} angle={-15} delay={0} />
          <ScatteredChar char="?" x={SW * 0.30} startY={SH * 0.45} angle={20} delay={1} />
          <ScatteredChar char="1" x={SW * 0.55} startY={SH * 0.70} angle={-8} delay={2} />
          <ScatteredChar char="B" x={SW * 0.72} startY={SH * 0.35} angle={12} delay={3} />
          <ScatteredChar char="!" x={SW * 0.88} startY={SH * 0.55} angle={-20} delay={4} />
        </>
      )}

      {islandNumber === 6 && (
        <>
          <ScrollFragment x={SW * 0.12} delay={0} rotation={-12} />
          <ScrollFragment x={SW * 0.50} delay={1} rotation={8} />
          <ScrollFragment x={SW * 0.78} delay={2} rotation={-5} />
        </>
      )}

      {islandNumber === 7 && (
        <>
          <LightningFlash />
          <ElectricParticle x={SW * 0.10} y={SH * 0.20} delay={0} />
          <ElectricParticle x={SW * 0.80} y={SH * 0.35} delay={1} />
          <ElectricParticle x={SW * 0.35} y={SH * 0.60} delay={2} />
          <ElectricParticle x={SW * 0.65} y={SH * 0.75} delay={3} />
        </>
      )}
    </View>
  );
}
