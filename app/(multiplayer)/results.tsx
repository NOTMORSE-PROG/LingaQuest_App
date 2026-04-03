import { useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useMultiplayerStore, destroyPusher } from "@/stores/multiplayer";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";

export default function ResultsScreen() {
  const { correctCount, questionResults, reset } = useMultiplayerStore();
  const treasureFound = correctCount >= 3;

  const emojiScale = useSharedValue(0);
  useEffect(() => {
    emojiScale.value = withSpring(1, { damping: 8, stiffness: 120 });
  }, [emojiScale]);
  const emojiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emojiScale.value }],
  }));

  function handleDone() {
    destroyPusher();
    reset();
    router.replace("/(main)/dashboard");
  }

  function handlePlayAgain() {
    destroyPusher();
    reset();
    router.replace("/(multiplayer)/lobby");
  }

  const stopNames = ["Pirate Port", "Coral Reef", "Hidden Cave", "Storm Pass", "Treasure Isle"];

  return (
    <SafeAreaView className="flex-1 bg-ocean-deep" edges={["top"]}>
    <ScrollView contentContainerClassName="px-6 pt-8 pb-8 items-center">
      {/* Big emoji */}
      <Animated.Text style={emojiStyle} className="text-7xl mb-4">
        {treasureFound ? "💰" : "🔒"}
      </Animated.Text>

      {/* Win/Loss header */}
      {treasureFound ? (
        <View className="items-center mb-6">
          <Text className="text-green-400 text-3xl font-bold text-center mb-2">
            Treasure Found!
          </Text>
          <Text className="text-parchment text-base text-center">
            Your crew solved {correctCount}/5 clues and found the treasure!
          </Text>
        </View>
      ) : (
        <View className="items-center mb-6">
          <Text className="text-gold text-3xl font-bold text-center mb-2">
            Treasure Lost...
          </Text>
          <Text className="text-parchment text-base text-center">
            Your crew solved {correctCount}/5 clues. The treasure awaits your return!
          </Text>
        </View>
      )}

      {/* Score visualization */}
      <View className={`w-full rounded-2xl p-5 border mb-6 ${
        treasureFound ? "bg-ocean-mid border-green-500/30" : "bg-ocean-mid border-ocean-light"
      }`}>
        <Text className="text-gold font-bold text-sm mb-4">VOYAGE RESULTS</Text>

        {/* Question-by-question breakdown */}
        {questionResults.map((result, i) => (
          <View key={i} className="flex-row items-center justify-between py-2.5 border-b border-ocean-light/20 last:border-b-0">
            <View className="flex-row items-center">
              <View className={`w-6 h-6 rounded-full items-center justify-center mr-3 ${
                result === true ? "bg-green-500" : result === false ? "bg-red-500" : "bg-ocean-light/40"
              }`}>
                <Text className="text-white text-xs font-bold">
                  {result === true ? "✓" : result === false ? "✗" : "?"}
                </Text>
              </View>
              <Text className="text-parchment text-sm">{stopNames[i]}</Text>
            </View>
            <Text className={`text-xs font-bold ${
              result === true ? "text-green-400" : result === false ? "text-red-400" : "text-parchment-dark"
            }`}>
              {result === true ? "Solved" : result === false ? "Missed" : "—"}
            </Text>
          </View>
        ))}

        {/* Score summary */}
        <View className="flex-row justify-center mt-4 space-x-2">
          {questionResults.map((r, i) => (
            <View
              key={i}
              className={`w-4 h-4 rounded-full ${
                r === true ? "bg-green-500" : r === false ? "bg-red-500" : "bg-ocean-light/40"
              }`}
            />
          ))}
        </View>
        <Text className="text-parchment-dark text-xs text-center mt-2">
          {correctCount}/5 clues solved · Need 3 to find treasure
        </Text>
      </View>

      {/* Action buttons */}
      <TouchableOpacity
        onPress={handlePlayAgain}
        className={`w-full rounded-xl py-4 items-center mb-3 ${
          treasureFound ? "bg-green-600" : "bg-gold"
        }`}
      >
        <Text className={`font-bold text-lg ${treasureFound ? "text-white" : "text-ocean-deep"}`}>
          Play Again
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleDone}
        className="w-full bg-ocean-mid rounded-xl py-4 items-center border border-ocean-light"
      >
        <Text className="text-parchment font-bold text-base">Return to Dashboard</Text>
      </TouchableOpacity>
    </ScrollView>
    </SafeAreaView>
  );
}
