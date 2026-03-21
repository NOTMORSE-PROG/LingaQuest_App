import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Pin } from "@linguaquest/shared";

export default function IslandScreen() {
  const { islandId } = useLocalSearchParams<{ islandId: string }>();

  const { data: island, isLoading } = useQuery({
    queryKey: ["island", islandId],
    queryFn: () => apiClient.getIsland(islandId),
  });

  if (isLoading || !island) {
    return (
      <View className="flex-1 bg-ocean-deep items-center justify-center">
        <ActivityIndicator color="#f5c518" size="large" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-ocean-deep" contentContainerClassName="px-6 pt-14 pb-8">
      <TouchableOpacity onPress={() => router.back()} className="mb-6">
        <Text className="text-gold text-base">← Back to Map</Text>
      </TouchableOpacity>

      <Text className="text-parchment-dark text-sm mb-1">Island {island.number}</Text>
      <Text className="text-gold text-3xl font-bold mb-2">{island.name}</Text>
      <Text className="text-parchment text-sm mb-2">{island.skillFocus}</Text>
      <Text className="text-parchment-dark text-sm leading-6 mb-8">{island.description}</Text>

      {island.npcName && (
        <View className="bg-ocean-mid rounded-xl p-4 mb-6 border border-ocean-light">
          <Text className="text-gold text-sm font-bold mb-2">{island.npcName}</Text>
          <Text className="text-parchment text-sm italic">"{island.npcDialogueIntro}"</Text>
        </View>
      )}

      <Text className="text-parchment font-bold mb-4">Quest Pins</Text>
      <View className="space-y-3">
        {island.pins?.map((pin: Pin) => (
          <TouchableOpacity
            key={pin.id}
            onPress={() => router.push(`/(main)/quest/${pin.id}`)}
            className="bg-ocean-light rounded-xl p-4 flex-row items-center justify-between border border-gold/20"
          >
            <View>
              <Text className="text-parchment-dark text-xs">
                {pin.type === "checkpoint" ? "⚑ CHECKPOINT" : "📍 CHALLENGE"}
              </Text>
              <Text className="text-parchment font-semibold mt-1">Pin {pin.number}</Text>
            </View>
            <Text className="text-gold text-xl">›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
