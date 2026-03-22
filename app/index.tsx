import { useEffect } from "react";
import { Redirect } from "expo-router";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { useAuthStore } from "@/stores/auth";

export default function Index() {
  const { token, user, isInitialized } = useAuthStore();

  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(12);
  const shipOpacity = useSharedValue(0);
  const shipY = useSharedValue(28);
  const taglineOpacity = useSharedValue(0);
  const dotOpacity = useSharedValue(0.25);

  useEffect(() => {
    titleOpacity.value = withTiming(1, { duration: 550, easing: Easing.out(Easing.quad) });
    titleY.value = withTiming(0, { duration: 550, easing: Easing.out(Easing.quad) });

    shipOpacity.value = withDelay(220, withTiming(1, { duration: 480 }));
    shipY.value = withDelay(220, withSpring(0, { damping: 13, stiffness: 85 }));

    taglineOpacity.value = withDelay(480, withTiming(1, { duration: 420 }));

    dotOpacity.value = withDelay(600, withRepeat(
      withSequence(
        withTiming(1, { duration: 700 }),
        withTiming(0.25, { duration: 700 }),
      ),
      -1,
      true,
    ));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));
  const shipStyle = useAnimatedStyle(() => ({
    opacity: shipOpacity.value,
    transform: [{ translateY: shipY.value }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));
  const dotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }));

  if (isInitialized) {
    if (!token || !user) return <Redirect href="/(auth)/login" />;
    if (!user.isOnboarded) return <Redirect href="/(auth)/onboarding" />;
    return <Redirect href="/(main)/dashboard" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a2e", alignItems: "center", justifyContent: "center" }}>

      {/* Star accents */}
      <Text style={{ position: "absolute", top: "18%", left: "14%", fontSize: 9, color: "rgba(245,197,24,0.3)" }}>✦</Text>
      <Text style={{ position: "absolute", top: "13%", right: "22%", fontSize: 6, color: "rgba(245,197,24,0.2)" }}>✦</Text>
      <Text style={{ position: "absolute", top: "28%", right: "9%", fontSize: 11, color: "rgba(245,197,24,0.18)" }}>✦</Text>
      <Text style={{ position: "absolute", bottom: "28%", left: "8%", fontSize: 7, color: "rgba(245,197,24,0.15)" }}>✦</Text>
      <Text style={{ position: "absolute", bottom: "20%", right: "15%", fontSize: 9, color: "rgba(245,197,24,0.2)" }}>✦</Text>

      {/* Logo */}
      <Animated.View style={[{ alignItems: "center" }, titleStyle]}>
        <Text style={{
          fontSize: 13,
          fontWeight: "600",
          color: "rgba(245,197,24,0.55)",
          letterSpacing: 5,
          textTransform: "uppercase",
          marginBottom: 10,
        }}>
          ⚓  VOYAGE  ⚓
        </Text>
        <Text style={{
          fontSize: 42,
          fontWeight: "800",
          color: "#f5c518",
          letterSpacing: 1.5,
          textAlign: "center",
        }}>
          LinguaQuest
        </Text>
      </Animated.View>

      {/* Ship */}
      <Animated.View style={[{ marginTop: 36, marginBottom: 36 }, shipStyle]}>
        <Text style={{ fontSize: 80, lineHeight: 90 }}>⛵</Text>
      </Animated.View>

      {/* Tagline + pulse dot */}
      <Animated.View style={[{ alignItems: "center", flexDirection: "row", gap: 6 }, taglineStyle]}>
        <Animated.View style={[{
          width: 6, height: 6, borderRadius: 3,
          backgroundColor: "#f5c518",
        }, dotStyle]} />
        <Text style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.4)",
          letterSpacing: 2.5,
          textTransform: "uppercase",
        }}>
          Setting sail
        </Text>
        <Animated.View style={[{
          width: 6, height: 6, borderRadius: 3,
          backgroundColor: "#f5c518",
        }, dotStyle]} />
      </Animated.View>

    </View>
  );
}
