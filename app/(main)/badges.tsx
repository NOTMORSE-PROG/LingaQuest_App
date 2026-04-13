import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MuteButton } from "@/components/audio/MuteButton";
import { Badge, BadgeType } from "@/types";
import { useBadges } from "@/hooks/useOfflineData";

const BADGE_META: Record<BadgeType, { label: string; emoji: string; desc: string }> = {
  first_steps: { label: "First Steps", emoji: "👣", desc: "Complete your first quest" },
  sharp_ear: { label: "Sharp Ear", emoji: "👂", desc: "100% accuracy on any quest" },
  the_captain: { label: "The Captain", emoji: "🏴‍☠️", desc: "Complete all 7 islands" },
  island_1: { label: "Isla ng Salita", emoji: "📖", desc: "Vocabulary in Context" },
  island_2: { label: "Isla ng Bilis", emoji: "⚡", desc: "Rapid Speech Comprehension" },
  island_3: { label: "Isla ng Diwa", emoji: "💭", desc: "Main Idea and Details" },
  island_4: { label: "Isla ng Damdamin", emoji: "❤️", desc: "Emotional Tone & Inference" },
  island_5: { label: "Isla ng Tanong", emoji: "❓", desc: "Listening for Specific Info" },
  island_6: { label: "Isla ng Kwento", emoji: "📜", desc: "Narrative Comprehension" },
  island_7: { label: "Isla ng Alingawngaw", emoji: "🐚", desc: "Full Integration Challenge" },
  island_conqueror: { label: "Island Conqueror", emoji: "👑", desc: "Grand Certificate — all 7 islands" },
};

export default function BadgesScreen() {
  const { data: badges, isLoading, isError, refetch } = useBadges();

  const earnedTypes = new Set(badges?.map((b: Badge) => b.badgeType) ?? []);

  if (isLoading) {
    return (
      <View className="flex-1 bg-ocean-deep items-center justify-center">
        <ActivityIndicator color="#f5c518" size="large" />
      </View>
    );
  }

  // BUG 11 FIX: full error screen instead of showing all-locked grid as if it's data
  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-ocean-deep items-center justify-center px-8" edges={["top"]}>
        <Text className="text-5xl mb-4">🏴‍☠️</Text>
        <Text className="text-gold text-xl font-bold text-center mb-2">Could not load badges</Text>
        <Text className="text-parchment text-sm text-center mb-8">
          The treasure chest is stuck. Check your connection and try again.
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
          className="bg-gold rounded-xl px-8 py-3 w-full items-center"
        >
          <Text className="text-ocean-deep font-bold">Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const allBadges = Object.entries(BADGE_META) as [BadgeType, typeof BADGE_META[BadgeType]][];

  return (
    <SafeAreaView className="flex-1 bg-ocean-deep" edges={["top"]}>
      <MuteButton />
      <Text className="text-gold text-3xl font-bold px-6 pt-4 mb-2">Badges</Text>
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
              {!earned && <Text className="text-lg mb-1">🔒</Text>}
              <Text className="text-4xl mb-2">{meta.emoji}</Text>
              <Text className="text-gold font-bold text-center text-sm">{meta.label}</Text>
              <Text className="text-parchment-dark text-xs text-center mt-1" numberOfLines={2}>{meta.desc}</Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
