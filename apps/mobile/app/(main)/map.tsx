import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Island } from "@linguaquest/shared";

export default function MapScreen() {
  const { data: islands, isLoading } = useQuery({
    queryKey: ["islands"],
    queryFn: () => apiClient.getIslands(),
  });

  if (isLoading) {
    return (
      <View className="flex-1 bg-ocean-deep items-center justify-center">
        <ActivityIndicator color="#f5c518" size="large" />
        <Text className="text-parchment mt-4">Loading the Listening Sea...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-ocean-deep" contentContainerClassName="px-6 pt-14 pb-8">
      <Text className="text-gold text-3xl font-bold mb-2">The Listening Sea</Text>
      <Text className="text-parchment-dark text-sm mb-8">
        Seven islands. Seven skills. One legend.
      </Text>

      <View className="space-y-4">
        {islands?.map((island: Island) => (
          <IslandPin key={island.id} island={island} />
        ))}
      </View>
    </ScrollView>
  );
}

function IslandPin({ island }: { island: Island }) {
  const isLocked = island.isLocked;

  return (
    <TouchableOpacity
      disabled={isLocked}
      onPress={() => router.push(`/(main)/island/${island.id}`)}
      className={`rounded-2xl p-5 border ${
        isLocked
          ? "bg-ocean-mid border-ocean-light opacity-50"
          : "bg-ocean-light border-gold/30"
      }`}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-parchment-dark text-xs mb-1">
            Island {island.number}
          </Text>
          <Text className="text-gold font-bold text-lg">{island.name}</Text>
          <Text className="text-parchment text-sm mt-1">{island.skillFocus}</Text>
        </View>
        <Text className="text-3xl">{isLocked ? "🔒" : "⚓"}</Text>
      </View>
    </TouchableOpacity>
  );
}
