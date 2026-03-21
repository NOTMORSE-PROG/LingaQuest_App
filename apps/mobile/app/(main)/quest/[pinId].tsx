import { useState, useRef } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { AudioPlayer } from "@/components/audio/AudioPlayer";
import { Challenge } from "@linguaquest/shared";

type Phase = "intro" | "listening" | "answering" | "result";

export default function QuestScreen() {
  const { pinId } = useLocalSearchParams<{ pinId: string }>();
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<Phase>("intro");
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [selected, setSelected] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [audioPlayed, setAudioPlayed] = useState(false);

  const { data: pin, isLoading } = useQuery({
    queryKey: ["pin", pinId],
    queryFn: () => apiClient.getPin(pinId),
  });

  const submitMutation = useMutation({
    mutationFn: (data: { pinId: string; answer: string; hintsUsed: number; accuracy: number }) =>
      apiClient.submitProgress(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
  });

  if (isLoading || !pin) {
    return (
      <View className="flex-1 bg-ocean-deep items-center justify-center">
        <ActivityIndicator color="#f5c518" size="large" />
      </View>
    );
  }

  const challenges: Challenge[] = pin.challenges ?? [];
  const current = challenges[challengeIndex];
  const isLastChallenge = challengeIndex === challenges.length - 1;

  function handleAudioEnd() {
    setAudioPlayed(true);
    setPhase("answering");
  }

  function handleAnswer(choice: "A" | "B" | "C" | "D") {
    setSelected(choice);
    if (choice === current.answer) setCorrectCount((c) => c + 1);
    setPhase("result");
  }

  function handleNext() {
    if (isLastChallenge) {
      const accuracy = Math.round((correctCount / challenges.length) * 100);
      submitMutation.mutate({ pinId, answer: "done", hintsUsed, accuracy });
      router.back();
    } else {
      setChallengeIndex((i) => i + 1);
      setPhase("listening");
      setSelected(null);
      setShowHint(false);
      setAudioPlayed(false);
    }
  }

  function handleHint() {
    setShowHint(true);
    setHintsUsed((h) => h + 1);
  }

  return (
    <ScrollView className="flex-1 bg-ocean-deep" contentContainerClassName="px-6 pt-14 pb-8">
      <TouchableOpacity onPress={() => router.back()} className="mb-6">
        <Text className="text-gold text-base">← Exit Quest</Text>
      </TouchableOpacity>

      {/* Progress */}
      <View className="flex-row mb-6 space-x-1">
        {challenges.map((_, i) => (
          <View
            key={i}
            className={`flex-1 h-1 rounded-full ${
              i < challengeIndex ? "bg-gold" : i === challengeIndex ? "bg-gold/50" : "bg-ocean-light"
            }`}
          />
        ))}
      </View>

      {phase === "intro" && (
        <View className="items-center mt-8">
          <Text className="text-4xl mb-4">👂</Text>
          <Text className="text-gold text-2xl font-bold text-center mb-4">Ready to Listen?</Text>
          <Text className="text-parchment text-base text-center leading-7 mb-10">
            The audio will play once. You cannot pause or replay it.{"\n"}Listen carefully.
          </Text>
          <TouchableOpacity
            onPress={() => setPhase("listening")}
            className="bg-gold rounded-xl px-10 py-4"
          >
            <Text className="text-ocean-deep font-bold text-lg">Start Listening</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === "listening" && (
        <View className="items-center mt-4">
          <Text className="text-parchment text-sm mb-6 text-center">Audio is playing...</Text>
          <AudioPlayer audioUrl={current.audioUrl} onEnd={handleAudioEnd} autoPlay />
        </View>
      )}

      {(phase === "answering" || phase === "result") && (
        <View>
          <Text className="text-parchment text-base font-semibold mb-6 leading-7">
            {current.question}
          </Text>

          <View className="space-y-3">
            {current.choices.map((choice) => {
              const isSelected = selected === choice.label;
              const isCorrect = choice.label === current.answer;
              let bg = "bg-ocean-mid border-ocean-light";
              if (phase === "result") {
                if (isCorrect) bg = "bg-green-900 border-green-500";
                else if (isSelected) bg = "bg-red-900 border-red-500";
              } else if (isSelected) {
                bg = "bg-ocean-light border-gold";
              }
              return (
                <TouchableOpacity
                  key={choice.label}
                  disabled={phase === "result"}
                  onPress={() => handleAnswer(choice.label as "A" | "B" | "C" | "D")}
                  className={`rounded-xl p-4 border ${bg}`}
                >
                  <Text className="text-parchment">
                    <Text className="font-bold">{choice.label}. </Text>
                    {choice.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Hint */}
          {phase === "answering" && !showHint && (
            <TouchableOpacity onPress={handleHint} className="mt-5 items-center">
              <Text className="text-gold/60 text-sm">💡 Need a hint?</Text>
            </TouchableOpacity>
          )}
          {showHint && (
            <View className="mt-4 bg-gold/10 rounded-xl p-4 border border-gold/30">
              <Text className="text-gold text-sm">💡 {current.hint}</Text>
            </View>
          )}

          {/* Result feedback */}
          {phase === "result" && (
            <View className="mt-6">
              <View
                className={`rounded-xl p-4 mb-4 ${
                  selected === current.answer ? "bg-green-900/50" : "bg-red-900/50"
                }`}
              >
                <Text className="text-white font-bold mb-1">
                  {selected === current.answer ? "✓ Correct!" : "✗ Incorrect"}
                </Text>
                <Text className="text-parchment text-sm leading-6">{current.explanation}</Text>
              </View>

              <TouchableOpacity
                onPress={handleNext}
                className="bg-gold rounded-xl py-4 items-center"
              >
                <Text className="text-ocean-deep font-bold text-base">
                  {isLastChallenge ? "Complete Pin" : "Next Question"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}
