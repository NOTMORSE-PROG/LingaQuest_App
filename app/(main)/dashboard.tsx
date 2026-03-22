import { useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, useWindowDimensions, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuthStore } from "@/stores/auth";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Island, IslandProgress } from "@/types";
import Svg, { Path, Ellipse, Rect, Circle, Polygon, Line } from "react-native-svg";
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, Easing,
} from "react-native-reanimated";

// Animated pirate ship — gentle rock on the waves
function PirateShip() {
  const { width: sw } = useWindowDimensions();
  const shipW = Math.round(sw * 0.51);        // 200/390
  const shipH = Math.round(shipW * 0.60);     // 120/200
  const waveW = Math.round(sw * 0.72);        // 280/390
  const waveH = Math.round(waveW * 50 / 280); // maintain aspect ratio
  const containerH = Math.round(sw * 0.41);   // 160/390

  const rock = useSharedValue(0);
  const bob = useSharedValue(0);

  useEffect(() => {
    rock.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(3, { duration: 1800, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    bob.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [bob, rock]);

  const shipStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rock.value}deg` },
      { translateY: bob.value },
    ],
  }));

  return (
    <View style={{ alignItems: "center", height: containerH, justifyContent: "flex-end" }}>
      {/* Ocean waves behind ship */}
      <Svg width={waveW} height={waveH} viewBox="0 0 280 50" style={{ position: "absolute", bottom: 0 }}>
        <Path
          d="M 0 30 Q 35 18 70 30 Q 105 42 140 30 Q 175 18 210 30 Q 245 42 280 30 L 280 50 L 0 50 Z"
          fill="#16213e"
        />
        <Path
          d="M 0 30 Q 35 18 70 30 Q 105 42 140 30 Q 175 18 210 30 Q 245 42 280 30"
          stroke="#0f3460"
          strokeWidth="2.5"
          fill="none"
        />
      </Svg>

      {/* Ship */}
      <Animated.View style={[shipStyle, { marginBottom: 10 }]}>
        <Svg width={shipW} height={shipH} viewBox="0 0 200 120">
          {/* Hull shadow */}
          <Ellipse cx="100" cy="98" rx="68" ry="10" fill="rgba(0,0,0,0.2)" />

          {/* Hull */}
          <Path
            d="M 32 70 Q 28 90 34 95 Q 100 108 166 95 Q 172 90 168 70 Z"
            fill="#3d2b1f"
            stroke="#2c1e0f"
            strokeWidth="2"
          />
          {/* Hull planks */}
          <Path d="M 38 80 Q 100 90 162 80" stroke="#2c1e0f" strokeWidth="1.5" fill="none" opacity={0.5} />
          <Path d="M 38 88 Q 100 98 162 88" stroke="#2c1e0f" strokeWidth="1" fill="none" opacity={0.4} />

          {/* Deck */}
          <Rect x="32" y="60" width="136" height="14" rx="3" fill="#4a3520" stroke="#2c1e0f" strokeWidth="2" />

          {/* Main mast */}
          <Line x1="100" y1="62" x2="100" y2="5" stroke="#2c1e0f" strokeWidth="4" strokeLinecap="round" />

          {/* Main sail */}
          <Path
            d="M 100 8 L 148 30 L 148 56 L 100 60 Z"
            fill="#f4e4c1"
            stroke="#d4b896"
            strokeWidth="1.5"
          />
          {/* Sail lines */}
          <Path d="M 100 20 L 148 38" stroke="#d4b896" strokeWidth="1" opacity={0.5} />
          <Path d="M 100 34 L 148 48" stroke="#d4b896" strokeWidth="1" opacity={0.5} />

          {/* Fore sail */}
          <Path
            d="M 100 10 L 58 32 L 58 56 L 100 60 Z"
            fill="#f0d8b0"
            stroke="#d4b896"
            strokeWidth="1.5"
          />

          {/* Crow's nest */}
          <Rect x="94" y="4" width="12" height="8" rx="2" fill="#2c1e0f" stroke="#2c1e0f" strokeWidth="1" />

          {/* Pirate flag */}
          <Line x1="100" y1="5" x2="100" y2="-2" stroke="#2c1e0f" strokeWidth="2" />
          <Polygon points="100,-2 118,3 100,8" fill="#1a1a1a" stroke="#1a1a1a" strokeWidth="1" />
          <Circle cx="109" cy="3" r="2" fill="white" opacity={0.8} />

          {/* Gold stripe on hull */}
          <Path
            d="M 35 64 Q 100 72 165 64"
            stroke="#f5c518"
            strokeWidth="2.5"
            fill="none"
          />

          {/* Cannon port holes */}
          <Circle cx="60" cy="75" r="5" fill="#1a1a2e" stroke="#2c1e0f" strokeWidth="1.5" />
          <Circle cx="100" cy="78" r="5" fill="#1a1a2e" stroke="#2c1e0f" strokeWidth="1.5" />
          <Circle cx="140" cy="75" r="5" fill="#1a1a2e" stroke="#2c1e0f" strokeWidth="1.5" />
        </Svg>
      </Animated.View>
    </View>
  );
}

export default function DashboardScreen() {
  const { user } = useAuthStore();

  const { data: islands, isLoading: islandsLoading, isError: isIslandsError } = useQuery({
    queryKey: ["islands"],
    queryFn: () => apiClient.getIslands(),
    refetchOnMount: true,
  });

  const { data: progress, isError: isProgressError } = useQuery({
    queryKey: ["progress", user?.id],
    queryFn: () => apiClient.getProgress(),
    enabled: !!user,
    refetchOnMount: true,
  });

  const { data: badges, isError: isBadgesError } = useQuery({
    queryKey: ["badges", user?.id],
    queryFn: () => apiClient.getBadges(),
    enabled: !!user,
    refetchOnMount: true,
  });

  const hasDataError = isIslandsError || isProgressError || isBadgesError;

  const progressList: IslandProgress[] = progress ?? [];
  const completedIslands = progressList.filter((p) => p.isCompleted).length;
  const earnedBadges = badges?.length ?? 0;

  // Find current island (first unlocked + not completed)
  const completedIds = new Set(progressList.filter((p) => p.isCompleted).map((p) => p.islandId));
  const currentIsland = (islands as Island[] | undefined)?.find(
    (isl) => !isl.isLocked && !completedIds.has(isl.id)
  );

  const totalIslands = (islands as Island[] | undefined)?.length ?? 7;

  return (
    <SafeAreaView className="flex-1 bg-ocean-deep" edges={["top"]}>
    <ScrollView
      contentContainerClassName="pb-8"
      showsVerticalScrollIndicator={false}
    >
      {/* Hero section */}
      <View className="px-6 pt-4 pb-2 flex-row items-start justify-between">
        <View>
          <Text className="text-parchment text-base">Welcome back,</Text>
          <Text className="text-gold text-3xl font-bold">{user?.username} ⚓</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/(main)/profile")}
          className="mt-1 p-2"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-parchment-dark text-2xl">⚙</Text>
        </TouchableOpacity>
      </View>

      {/* Ship animation */}
      <View className="mx-6 mt-2 mb-4">
        <PirateShip />
      </View>

      {/* BUG 11 FIX: error banner if any query failed */}
      {hasDataError && (
        <View className="mx-6 mb-4 bg-red-900/50 border border-red-500/50 rounded-xl px-4 py-3">
          <Text className="text-red-300 text-xs text-center">
            ⚠ Some data could not be loaded. Voyage stats may be incomplete.
          </Text>
        </View>
      )}

      {/* Stats + island card — skeleton while loading */}
      {islandsLoading ? (
        <View className="items-center py-8 mb-4">
          <ActivityIndicator color="#f5c518" size="large" />
          <Text className="text-parchment-dark text-xs mt-3 tracking-widest uppercase">Charting the seas…</Text>
        </View>
      ) : (
        <>
          {/* Stats row */}
          <View className="flex-row mx-6 gap-3 mb-4">
            <View className="flex-1 bg-ocean-mid rounded-2xl p-4 border border-ocean-light items-center">
              <Text className="text-gold text-3xl font-bold">{completedIslands}</Text>
              <Text className="text-parchment-dark text-xs mt-1 text-center">Islands{"\n"}Conquered</Text>
            </View>
            <View className="flex-1 bg-ocean-mid rounded-2xl p-4 border border-ocean-light items-center">
              <Text className="text-gold text-3xl font-bold">{earnedBadges}</Text>
              <Text className="text-parchment-dark text-xs mt-1 text-center">Badges{"\n"}Earned</Text>
            </View>
            <View className="flex-1 bg-ocean-mid rounded-2xl p-4 border border-ocean-light items-center">
              <Text className="text-gold text-3xl font-bold">{totalIslands}</Text>
              <Text className="text-parchment-dark text-xs mt-1 text-center">Islands{"\n"}Total</Text>
            </View>
          </View>

          {/* Overall progress bar */}
          <View className="mx-6 mb-5">
            <View className="flex-row justify-between mb-2">
              <Text className="text-parchment text-xs font-semibold">VOYAGE PROGRESS</Text>
              <Text className="text-gold text-xs font-bold">{completedIslands}/{totalIslands}</Text>
            </View>
            <View className="h-3 bg-ocean-mid rounded-full overflow-hidden border border-ocean-light">
              <View
                className="h-full bg-gold rounded-full"
                style={{ width: `${(completedIslands / totalIslands) * 100}%` }}
              />
            </View>
          </View>

          {/* Current island card */}
          {currentIsland ? (
            <TouchableOpacity
              onPress={() => router.push(`/(main)/island/${currentIsland.id}`)}
              className="mx-6 mb-4 bg-ocean-light rounded-2xl p-4 border border-gold/30"
              activeOpacity={0.8}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-gold text-xs font-bold mb-1">CURRENT ISLAND</Text>
                  <Text className="text-parchment font-bold text-base">{currentIsland.name}</Text>
                  <Text className="text-parchment-dark text-xs mt-0.5">{currentIsland.skillFocus}</Text>
                </View>
                <View className="bg-gold/20 rounded-xl px-3 py-2 items-center ml-3">
                  <Text className="text-2xl">🏝️</Text>
                  <Text className="text-gold text-xs font-bold mt-1">#{currentIsland.number}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ) : (islands as Island[] | undefined)?.length ? (
            <View className="mx-6 mb-4 bg-ocean-light rounded-2xl p-5 border border-gold/50 items-center">
              <Text className="text-5xl mb-2">🏆</Text>
              <Text className="text-gold font-bold text-base">Voyage Complete!</Text>
              <Text className="text-parchment-dark text-sm text-center mt-1">
                You've conquered all {totalIslands} islands. True captain!
              </Text>
            </View>
          ) : null}
        </>
      )}

      {/* Action buttons */}
      <View className="mx-6 space-y-3">
        <TouchableOpacity
          onPress={() => router.push("/(main)/map")}
          className="bg-gold rounded-2xl p-5 flex-row items-center justify-between"
          activeOpacity={0.85}
        >
          <View>
            <Text className="text-ocean-deep font-bold text-lg">Open Sea Map</Text>
            <Text className="text-ocean-deep/70 text-sm">Explore all 7 islands</Text>
          </View>
          <Text className="text-3xl">🗺️</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(multiplayer)/lobby")}
          className="bg-coral rounded-2xl p-5 flex-row items-center justify-between"
          activeOpacity={0.85}
        >
          <View>
            <Text className="text-white font-bold text-lg">Abandon Ship</Text>
            <Text className="text-white/70 text-sm">Multiplayer crew challenge</Text>
          </View>
          <Text className="text-3xl">⚓</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}
