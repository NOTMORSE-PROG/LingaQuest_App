import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/stores/auth";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const { data: progress } = useQuery({
    queryKey: ["progress", user?.id],
    queryFn: () => apiClient.getProgress(),
    enabled: !!user,
  });

  const completedIslands = progress?.filter((p) => p.isCompleted).length ?? 0;

  return (
    <ScrollView className="flex-1 bg-ocean-deep" contentContainerClassName="px-6 pt-14 pb-8">
      {/* Header */}
      <View className="mb-8">
        <Text className="text-parchment text-base">Welcome back,</Text>
        <Text className="text-gold text-3xl font-bold">{user?.username}</Text>
      </View>

      {/* Progress Card */}
      <View className="bg-ocean-mid rounded-2xl p-5 mb-6 border border-ocean-light">
        <Text className="text-parchment text-sm mb-3">VOYAGE PROGRESS</Text>
        <Text className="text-gold text-4xl font-bold">{completedIslands}/7</Text>
        <Text className="text-parchment-dark text-sm mt-1">Islands Conquered</Text>
        <View className="mt-4 h-2 bg-ocean-deep rounded-full overflow-hidden">
          <View
            className="h-full bg-gold rounded-full"
            style={{ width: `${(completedIslands / 7) * 100}%` }}
          />
        </View>
      </View>

      {/* Quick Actions */}
      <View className="space-y-4">
        <TouchableOpacity
          onPress={() => router.push("/(main)/map")}
          className="bg-ocean-light rounded-2xl p-5 flex-row items-center justify-between"
        >
          <View>
            <Text className="text-gold font-bold text-lg">Continue Quest</Text>
            <Text className="text-parchment-dark text-sm">Open the Listening Sea map</Text>
          </View>
          <Text className="text-3xl">🗺️</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(multiplayer)/lobby")}
          className="bg-coral rounded-2xl p-5 flex-row items-center justify-between"
        >
          <View>
            <Text className="text-white font-bold text-lg">Abandon Ship</Text>
            <Text className="text-white/70 text-sm">Join a crew — multiplayer</Text>
          </View>
          <Text className="text-3xl">⚓</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
