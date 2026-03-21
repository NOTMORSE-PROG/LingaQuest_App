import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useMultiplayerStore } from "@/stores/multiplayer";

const SHIP_PARTS = ["hull", "mast", "sails", "anchor", "rudder"] as const;

export default function ResultsScreen() {
  const { room, reset } = useMultiplayerStore();
  const health = room?.shipHealth;

  const fullyRepaired = health
    ? SHIP_PARTS.filter((p) => health[p] >= 100).length
    : 0;

  const crewWon = fullyRepaired >= 3;

  function handleDone() {
    reset();
    router.replace("/(main)/dashboard");
  }

  return (
    <ScrollView
      className="flex-1 bg-ocean-deep"
      contentContainerClassName="px-6 pt-14 pb-8 items-center"
    >
      {/* Outcome */}
      <Text className="text-7xl mb-4">{crewWon ? "🏆" : "💀"}</Text>
      <Text className="text-gold text-3xl font-bold text-center mb-2">
        {crewWon ? "Ship Saved!" : "Ship Sunk!"}
      </Text>
      <Text className="text-parchment text-base text-center mb-10">
        {crewWon
          ? `Your crew fully repaired ${fullyRepaired}/5 parts. Victory!`
          : `Only ${fullyRepaired}/5 parts fully repaired. Better luck next voyage.`}
      </Text>

      {/* Final ship health */}
      {health && (
        <View className="w-full bg-ocean-mid rounded-2xl p-5 border border-ocean-light mb-8">
          <Text className="text-gold font-bold text-sm mb-4">FINAL SHIP HEALTH</Text>
          {SHIP_PARTS.map((part) => {
            const hp = health[part];
            const color = hp >= 100 ? "bg-green-500" : hp > 0 ? "bg-yellow-500" : "bg-red-700";
            return (
              <View key={part} className="mb-3">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-parchment text-sm capitalize">{part}</Text>
                  <Text
                    className={`text-xs font-bold ${hp >= 100 ? "text-green-400" : hp > 0 ? "text-yellow-400" : "text-red-400"}`}
                  >
                    {hp >= 100 ? "✓ INTACT" : hp <= 0 ? "✗ SUNK" : `${hp}%`}
                  </Text>
                </View>
                <View className="h-2 bg-ocean-deep rounded-full overflow-hidden">
                  <View
                    className={`h-full rounded-full ${color}`}
                    style={{ width: `${Math.max(0, hp)}%` }}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Round summary */}
      {room?.currentRound && (
        <View className="w-full bg-ocean-mid rounded-2xl p-5 border border-ocean-light mb-8">
          <Text className="text-gold font-bold text-sm mb-2">SESSION SUMMARY</Text>
          <Text className="text-parchment text-sm">
            Rounds completed: {room.currentRound - 1}/{room.roundCount}
          </Text>
          <Text className="text-parchment text-sm mt-1">
            Parts fully repaired: {fullyRepaired}/5
          </Text>
        </View>
      )}

      <TouchableOpacity
        onPress={handleDone}
        className="w-full bg-gold rounded-xl py-4 items-center"
      >
        <Text className="text-ocean-deep font-bold text-lg">Return to Dashboard</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
