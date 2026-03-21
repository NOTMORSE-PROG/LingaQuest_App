import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { Badge, BadgeType } from "@linguaquest/shared";

const BADGE_META: Record<BadgeType, { label: string; emoji: string; desc: string }> = {
  first_steps: { label: "First Steps", emoji: "👣", desc: "Complete your first island" },
  sharp_ear: { label: "Sharp Ear", emoji: "👂", desc: "100% accuracy on any island" },
  never_lost: { label: "Never Lost", emoji: "🧭", desc: "Complete an island without hints" },
  ship_saver: { label: "Ship Saver", emoji: "🚢", desc: "Win Abandon Ship 3 times" },
  the_captain: { label: "The Captain", emoji: "🏴‍☠️", desc: "Complete all 7 islands" },
  island_1: { label: "Isla ng Salita", emoji: "📖", desc: "Vocabulary in Context" },
  island_2: { label: "Isla ng Bilis", emoji: "⚡", desc: "Rapid Speech Comprehension" },
  island_3: { label: "Isla ng Diwa", emoji: "💭", desc: "Main Idea and Details" },
  island_4: { label: "Isla ng Damdamin", emoji: "❤️", desc: "Emotional Tone & Inference" },
  island_5: { label: "Isla ng Tanong", emoji: "❓", desc: "Listening for Specific Info" },
  island_6: { label: "Isla ng Kwento", emoji: "📜", desc: "Narrative Comprehension" },
  island_7: { label: "Isla ng Alingawngaw", emoji: "🐚", desc: "Full Integration Challenge" },
  unsinkable: { label: "Unsinkable", emoji: "⛵", desc: "All 5 parts reach 100% health" },
  unanimous: { label: "Unanimous", emoji: "🤝", desc: "Unanimous correct vote every round" },
  true_crew: { label: "True Crew", emoji: "🏆", desc: "Win with zero wrong votes" },
  comeback: { label: "Comeback", emoji: "💥", desc: "Repair a 0% part in the final round" },
  island_conqueror: { label: "Island Conqueror", emoji: "👑", desc: "Grand Certificate — all 7 islands" },
};

export default function BadgesScreen() {
  const { user } = useAuthStore();
  const { data: badges, isLoading } = useQuery({
    queryKey: ["badges", user?.id],
    queryFn: () => apiClient.getBadges(),
    enabled: !!user,
  });

  const earnedTypes = new Set(badges?.map((b: Badge) => b.badgeType) ?? []);

  if (isLoading) {
    return (
      <View className="flex-1 bg-ocean-deep items-center justify-center">
        <ActivityIndicator color="#f5c518" size="large" />
      </View>
    );
  }

  const allBadges = Object.entries(BADGE_META) as [BadgeType, typeof BADGE_META[BadgeType]][];

  return (
    <View className="flex-1 bg-ocean-deep">
      <Text className="text-gold text-3xl font-bold px-6 pt-14 mb-2">Badges</Text>
      <Text className="text-parchment-dark text-sm px-6 mb-6">
        {earnedTypes.size}/{allBadges.length} earned
      </Text>
      <FlatList
        data={allBadges}
        keyExtractor={([type]) => type}
        numColumns={2}
        contentContainerClassName="px-4 pb-8"
        columnWrapperClassName="gap-4"
        ItemSeparatorComponent={() => <View className="h-4" />}
        renderItem={({ item: [type, meta] }) => {
          const earned = earnedTypes.has(type);
          return (
            <View
              className={`flex-1 rounded-2xl p-4 items-center border ${
                earned
                  ? "bg-ocean-light border-gold/50"
                  : "bg-ocean-mid border-ocean-light opacity-40"
              }`}
            >
              <Text className="text-4xl mb-2">{meta.emoji}</Text>
              <Text className="text-gold font-bold text-center text-sm">{meta.label}</Text>
              <Text className="text-parchment-dark text-xs text-center mt-1">{meta.desc}</Text>
            </View>
          );
        }}
      />
    </View>
  );
}
