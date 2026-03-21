import { useEffect } from "react";
import { View, Text, Dimensions } from "react-native";
import Svg, { Line } from "react-native-svg";
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

// ─── Snowflake (Island 1 — Frozen) ───────────────────────────────────────────
function SnowflakeSVG({ r, color }: { r: number; color: string }) {
  const c = r + 2;
  const s = (r + 2) * 2;
  const cos60 = 0.5;
  const sin60 = 0.866;
  return (
    <Svg width={s} height={s}>
      <Line x1={2} y1={c} x2={s - 2} y2={c} stroke={color} strokeWidth={1.2} strokeLinecap="round" />
      <Line x1={c - r * cos60} y1={c - r * sin60} x2={c + r * cos60} y2={c + r * sin60} stroke={color} strokeWidth={1.2} strokeLinecap="round" />
      <Line x1={c + r * cos60} y1={c - r * sin60} x2={c - r * cos60} y2={c + r * sin60} stroke={color} strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
  );
}

function Snowflake({ delay, x, r }: { delay: number; x: number; r: number }) {
  const y = useSharedValue(-30);
  const opacity = useSharedValue(0);
  const rot = useSharedValue(0);

  useEffect(() => {
    y.value = withRepeat(
      withSequence(
        withTiming(-30, { duration: 0 }),
        withTiming(SH + 30, { duration: 7000 + delay * 900, easing: Easing.linear })
      ),
      -1, false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay * 300 }),
        withTiming(0.28, { duration: 1000 }),
        withTiming(0.28, { duration: 5000 + delay * 400 }),
        withTiming(0, { duration: 1000 })
      ),
      -1, false
    );
    rot.value = withRepeat(
      withTiming(360, { duration: 8000 + delay * 1200, easing: Easing.linear }),
      -1, false
    );
    return () => { cancelAnimation(y); cancelAnimation(opacity); cancelAnimation(rot); };
  }, [delay, opacity, rot, y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { rotate: `${rot.value}deg` }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[{ position: "absolute", left: x, top: 0 }, style]} pointerEvents="none">
      <SnowflakeSVG r={r} color="#a8d8ea" />
    </Animated.View>
  );
}

// ─── Frozen Word Shard (Island 1 — Frozen vocabulary fragments) ───────────────
function FrozenWordShard({ word, x, delay }: { word: string; x: number; delay: number }) {
  const y = useSharedValue(SH * 0.3 + delay * 60);
  const opacity = useSharedValue(0);

  useEffect(() => {
    y.value = withRepeat(
      withSequence(
        withTiming(SH * 0.3 + delay * 60, { duration: 0 }),
        withTiming(SH * 0.3 + delay * 60 - 80, { duration: 10000, easing: Easing.linear })
      ),
      -1, false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay * 1000 }),
        withTiming(0.20, { duration: 2000 }),
        withTiming(0.20, { duration: 5000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1, false
    );
    return () => { cancelAnimation(y); cancelAnimation(opacity); };
  }, [delay, opacity, y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[{ position: "absolute", left: x, top: 0 }, style]} pointerEvents="none">
      <Text style={{ color: "#94d2e6", fontSize: 9, fontStyle: "italic", letterSpacing: 0.5 }}>
        {word}
      </Text>
    </Animated.View>
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

// ─── Time Shimmer (Island 2 — Bilis, time distortion pulse) ─────────────────
function TimeShimmer({ x, y, delay }: { x: number; y: number; delay: number }) {
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: delay * 500 }),
        withTiming(1.6, { duration: 1200, easing: Easing.out(Easing.quad) }),
        withTiming(0.4, { duration: 0 })
      ),
      -1, false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay * 500 }),
        withTiming(0.22, { duration: 300 }),
        withTiming(0, { duration: 900 })
      ),
      -1, false
    );
    return () => { cancelAnimation(scale); cancelAnimation(opacity); };
  }, [delay, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[{
        position: "absolute",
        left: x - 18,
        top: y - 18,
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: "#a569bd",
        backgroundColor: "transparent",
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

// ─── Mist Drift (Island 3 — Diwa, ghost idea fragments) ─────────────────────
function MistDrift({ word, x, delay }: { word: string; x: number; delay: number }) {
  const y = useSharedValue(SH * 0.6 + delay * 50);
  const opacity = useSharedValue(0);

  useEffect(() => {
    y.value = withRepeat(
      withSequence(
        withTiming(SH * 0.6 + delay * 50, { duration: 0 }),
        withTiming(SH * 0.6 + delay * 50 - 100, { duration: 12000, easing: Easing.linear })
      ),
      -1, false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay * 1200 }),
        withTiming(0.13, { duration: 3000 }),
        withTiming(0.13, { duration: 5000 }),
        withTiming(0, { duration: 3000 })
      ),
      -1, false
    );
    return () => { cancelAnimation(y); cancelAnimation(opacity); };
  }, [delay, opacity, y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[{ position: "absolute", left: x, top: 0 }, style]} pointerEvents="none">
      <Text style={{ color: "#7fb3d3", fontSize: 9, fontStyle: "italic", letterSpacing: 0.5 }}>
        {word}
      </Text>
    </Animated.View>
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

// ─── Warm Pulse (Island 4 — Damdamin, buried warmth surfacing) ──────────────
function WarmPulse({ x, y, delay }: { x: number; y: number; delay: number }) {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: delay * 800 }),
        withTiming(1.0, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.3, { duration: 3000, easing: Easing.inOut(Easing.sin) })
      ),
      -1, false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay * 800 }),
        withTiming(0.14, { duration: 1500 }),
        withTiming(0.14, { duration: 1500 }),
        withTiming(0, { duration: 1500 })
      ),
      -1, false
    );
    return () => { cancelAnimation(scale); cancelAnimation(opacity); };
  }, [delay, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[{
        position: "absolute",
        left: x - 30,
        top: y - 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "rgba(231,76,60,0.20)",
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

// ─── Data Fragment (Island 5 — Tanong, flashing precise detail) ──────────────
function DataFragment({ text, x, y, delay }: { text: string; x: number; y: number; delay: number }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.7);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay * 700 }),
        withTiming(0.20, { duration: 400 }),
        withTiming(0.20, { duration: 600 }),
        withTiming(0, { duration: 500 })
      ),
      -1, false
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: delay * 700 }),
        withTiming(1.1, { duration: 400 }),
        withTiming(1.0, { duration: 600 }),
        withTiming(0.7, { duration: 500 })
      ),
      -1, false
    );
    return () => { cancelAnimation(opacity); cancelAnimation(scale); };
  }, [delay, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[{ position: "absolute", left: x, top: y }, style]} pointerEvents="none">
      <Text style={{ color: "#f39c12", fontSize: 11, fontWeight: "bold" }}>
        {text}
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

// ─── Story Thread (Island 6 — Kwento, narrative thread drawing across screen) ─
function StoryThread({ y, delay }: { y: number; delay: number }) {
  const lineWidth = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    lineWidth.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay * 600 }),
        withTiming(SW * 0.65, { duration: 2000, easing: Easing.out(Easing.quad) }),
        withTiming(SW * 0.65, { duration: 1500 }),
        withTiming(0, { duration: 1000 })
      ),
      -1, false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay * 600 }),
        withTiming(0.18, { duration: 500 }),
        withTiming(0.18, { duration: 2500 }),
        withTiming(0, { duration: 500 })
      ),
      -1, false
    );
    return () => { cancelAnimation(lineWidth); cancelAnimation(opacity); };
  }, [delay, lineWidth, opacity]);

  const style = useAnimatedStyle(() => ({
    width: lineWidth.value,
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[{
        position: "absolute",
        left: SW * 0.10,
        top: y,
        height: 1,
        backgroundColor: "#1abc9c",
        borderRadius: 1,
      }, style]}
      pointerEvents="none"
    />
  );
}

// ─── Echo Ring (Island 7 — Alingawngaw, shockwave pulse from center) ─────────
function EchoRing({ delay }: { delay: number }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay * 1200 }),
        withTiming(1, { duration: 2500, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 0 })
      ),
      -1, false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay * 1200 }),
        withTiming(0.14, { duration: 400 }),
        withTiming(0, { duration: 2100 })
      ),
      -1, false
    );
    return () => { cancelAnimation(scale); cancelAnimation(opacity); };
  }, [delay, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[{
        position: "absolute",
        left: SW * 0.5 - 140,
        top: SH * 0.5 - 140,
        width: 280, height: 280, borderRadius: 140,
        borderWidth: 1.5, borderColor: "#f5c518",
        backgroundColor: "transparent",
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
          <Snowflake delay={0}   x={SW * 0.10} r={10} />
          <Snowflake delay={1.5} x={SW * 0.38} r={7}  />
          <Snowflake delay={3}   x={SW * 0.63} r={13} />
          <Snowflake delay={4.5} x={SW * 0.84} r={8}  />
          <FrozenWordShard word="...ela..."  x={SW * 0.05} delay={0} />
          <FrozenWordShard word="∿scarce∿"  x={SW * 0.50} delay={2} />
          <FrozenWordShard word="...per..."  x={SW * 0.72} delay={4} />
        </>
      )}

      {islandNumber === 2 && (
        <>
          <SpeedStreak y={SH * 0.18} delay={0} />
          <SpeedStreak y={SH * 0.35} delay={1} />
          <SpeedStreak y={SH * 0.52} delay={2} />
          <SpeedStreak y={SH * 0.70} delay={0} />
          <SpeedStreak y={SH * 0.85} delay={3} />
          <TimeShimmer x={SW * 0.20} y={SH * 0.30} delay={0} />
          <TimeShimmer x={SW * 0.75} y={SH * 0.60} delay={2} />
        </>
      )}

      {islandNumber === 3 && (
        <>
          <FogPuff x={SW * 0.05} startY={SH * 0.20} size={150} delay={0} />
          <FogPuff x={SW * 0.40} startY={SH * 0.40} size={180} delay={1} />
          <FogPuff x={SW * 0.60} startY={SH * 0.60} size={130} delay={2} />
          <FogPuff x={SW * 0.15} startY={SH * 0.70} size={160} delay={3} />
          <FogPuff x={SW * 0.55} startY={SH * 0.85} size={140} delay={1} />
          <MistDrift word="...main..."  x={SW * 0.08} delay={0} />
          <MistDrift word="...idea..."  x={SW * 0.62} delay={3} />
        </>
      )}

      {islandNumber === 4 && (
        <>
          {/* Emotional drain desaturation overlay */}
          <View
            style={{
              position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "rgba(80,80,80,0.10)",
            }}
            pointerEvents="none"
          />
          <EmberSpark x={SW * 0.12} y={SH * 0.25} delay={0} />
          <EmberSpark x={SW * 0.55} y={SH * 0.42} delay={1} />
          <EmberSpark x={SW * 0.80} y={SH * 0.58} delay={2} />
          <EmberSpark x={SW * 0.25} y={SH * 0.72} delay={3} />
          <EmberSpark x={SW * 0.65} y={SH * 0.85} delay={1} />
          <WarmPulse x={SW * 0.25} y={SH * 0.38} delay={0} />
          <WarmPulse x={SW * 0.72} y={SH * 0.68} delay={3} />
        </>
      )}

      {islandNumber === 5 && (
        <>
          <ScatteredChar char="A"  x={SW * 0.08} startY={SH * 0.60} angle={-15} delay={0} />
          <ScatteredChar char="?"  x={SW * 0.25} startY={SH * 0.45} angle={20}  delay={1} />
          <ScatteredChar char="1"  x={SW * 0.48} startY={SH * 0.70} angle={-8}  delay={2} />
          <ScatteredChar char="B"  x={SW * 0.65} startY={SH * 0.35} angle={12}  delay={3} />
          <ScatteredChar char="!"  x={SW * 0.82} startY={SH * 0.55} angle={-20} delay={4} />
          <ScatteredChar char="3"  x={SW * 0.15} startY={SH * 0.80} angle={25}  delay={2} />
          <ScatteredChar char="C"  x={SW * 0.55} startY={SH * 0.25} angle={-12} delay={0} />
          <ScatteredChar char="%" x={SW * 0.75} startY={SH * 0.75} angle={18}  delay={3} />
          <DataFragment text="42"  x={SW * 0.18} y={SH * 0.30} delay={0} />
          <DataFragment text="3rd" x={SW * 0.68} y={SH * 0.58} delay={2} />
        </>
      )}

      {islandNumber === 6 && (
        <>
          <ScrollFragment x={SW * 0.08} delay={0} rotation={-12} />
          <ScrollFragment x={SW * 0.28} delay={1} rotation={8}  />
          <ScrollFragment x={SW * 0.50} delay={2} rotation={-5} />
          <ScrollFragment x={SW * 0.70} delay={3} rotation={14} />
          <ScrollFragment x={SW * 0.88} delay={1} rotation={-9} />
          <StoryThread y={SH * 0.32} delay={0} />
          <StoryThread y={SH * 0.68} delay={3} />
        </>
      )}

      {islandNumber === 7 && (
        <>
          <LightningFlash />
          <EchoRing delay={0} />
          <EchoRing delay={5} />
          <ElectricParticle x={SW * 0.10} y={SH * 0.20} delay={0} />
          <ElectricParticle x={SW * 0.80} y={SH * 0.35} delay={1} />
          <ElectricParticle x={SW * 0.35} y={SH * 0.60} delay={2} />
          <ElectricParticle x={SW * 0.65} y={SH * 0.75} delay={3} />
          <ElectricParticle x={SW * 0.20} y={SH * 0.50} delay={2} />
          <ElectricParticle x={SW * 0.88} y={SH * 0.55} delay={0} />
        </>
      )}
    </View>
  );
}
