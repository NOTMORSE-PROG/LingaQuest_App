import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";

const TUTORIAL_STEPS = [
  {
    title: "Welcome, Sailor!",
    body: "You've joined the crew of Captain Salita. Your mission: sail the Listening Sea and recover the shards of the Alingawngaw.",
    emoji: "🏴‍☠️",
  },
  {
    title: "The Pirate Map",
    body: "Tap a pin on the map to start a listening challenge. Each island tests a different listening skill.",
    emoji: "🗺️",
  },
  {
    title: "Listen Carefully",
    body: "Audio plays once — no pause, no replay. Stay focused and trust what you heard.",
    emoji: "👂",
  },
  {
    title: "Use Hints Wisely",
    body: "Stuck? You can request a hint. But try on your own first — a sharp ear needs no crutch.",
    emoji: "💡",
  },
  {
    title: "Earn Badges",
    body: "Complete islands, reach milestones, and earn badges. No scores — just growth.",
    emoji: "🏅",
  },
];

export default function TutorialScreen() {
  const [step, setStep] = useState(0);
  const current = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;

  function next() {
    if (isLast) {
      router.replace("/(main)/dashboard");
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <View className="flex-1 bg-ocean-deep items-center justify-center px-8">
      <Text className="text-7xl mb-6">{current.emoji}</Text>
      <Text className="text-gold text-2xl font-bold text-center mb-4">
        {current.title}
      </Text>
      <Text className="text-parchment text-base text-center leading-7 mb-12">
        {current.body}
      </Text>

      {/* Step dots */}
      <View className="flex-row space-x-2 mb-10">
        {TUTORIAL_STEPS.map((_, i) => (
          <View
            key={i}
            className={`w-2 h-2 rounded-full ${i === step ? "bg-gold" : "bg-ocean-light"}`}
          />
        ))}
      </View>

      <TouchableOpacity
        onPress={next}
        className="w-full bg-gold rounded-xl py-4 items-center"
      >
        <Text className="text-ocean-deep font-bold text-lg">
          {isLast ? "Begin the Quest" : "Next"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
