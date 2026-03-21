import { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { AudioPlayer } from "@/components/audio/AudioPlayer";
import { DagatCharacter, DagatState } from "@/components/characters/DagatCharacter";
import { CaptainSalita } from "@/components/characters/CaptainSalita";
import { QuestSceneOverlay } from "@/components/scene/QuestSceneOverlay";
import { useAuthStore } from "@/stores/auth";
import { Challenge } from "@linguaquest/shared";

type Phase = "intro" | "listening" | "answering" | "result";

export default function QuestScreen() {
  const { pinId } = useLocalSearchParams<{ pinId: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const characterMode = user?.characterModeEnabled ?? false;

  const [phase, setPhase] = useState<Phase>("intro");
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [selected, setSelected] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const { data: pin, isLoading } = useQuery({
    queryKey: ["pin", pinId],
    queryFn: () => apiClient.getPin(pinId),
  });

  const submitMutation = useMutation({
    mutationFn: (data: { pinId: string; answer: string; hintsUsed: number; accuracy: number }) =>
      apiClient.submitProgress(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["progress"] }),
  });

  // Animate progress bar when challenge index changes
  useEffect(() => {
    if (!pin) return;
    const total = (pin.challenges ?? []).length;
    const target = total > 0 ? (challengeIndex / total) * 100 : 0;
    Animated.timing(progressAnim, {
      toValue: target,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [challengeIndex, pin, progressAnim]);

  function confirmExit() {
    if (phase === "intro") { router.back(); return; }
    Alert.alert(
      "Abandon this pin?",
      "Your progress will be lost to the sea.",
      [
        { text: "Stay", style: "cancel" },
        { text: "Exit", style: "destructive", onPress: () => router.back() },
      ]
    );
  }

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

  if (!current) {
    return (
      <View className="flex-1 bg-ocean-deep items-center justify-center px-8">
        <Text className="text-6xl mb-4">🏴‍☠️</Text>
        <Text className="text-gold text-xl font-bold text-center mb-2">No Challenges Yet</Text>
        <Text className="text-parchment text-sm text-center mb-8">
          The captain hasn't added content to this pin.
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="bg-gold rounded-xl px-8 py-3">
          <Text className="text-ocean-deep font-bold">← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const isCorrect = selected === current?.answer;

  // Dagat reacts to the current phase/result
  const ISLAND_ACCENT = ["#27ae60","#8e44ad","#3498db","#e74c3c","#e67e22","#1abc9c","#f5c518"];
  const islandNum = (pin as any).island?.number ?? 1;
  const accentColor = ISLAND_ACCENT[islandNum - 1] ?? "#27ae60";
  const islandName = (pin as any).island?.name ?? "";
  const islandSkill = (pin as any).island?.skillFocus ?? "";
  const npcIntro = (pin as any).island?.npcDialogueIntro ?? "Listen carefully, young sailor. The audio plays once. Trust what you hear.";
  const npcFail = (pin as any).island?.npcDialogueFail ?? "Even seasoned sailors mishear. The sea will test you again.";

  const dagatState: DagatState =
    phase === "intro" ? "idle" :
    phase === "listening" ? "listening" :
    phase === "answering" ? "idle" :
    isCorrect ? (isLastChallenge ? "celebrating" : "correct") : "wrong";

  function handleAudioEnd() {
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
    }
  }

  function handleHint() {
    setShowHint(true);
    setHintsUsed((h) => h + 1);
  }

  return (
    <SafeAreaView className="flex-1 bg-ocean-deep" edges={["top"]}>
      {/* Per-island curse effect overlay */}
      <QuestSceneOverlay islandNumber={islandNum} />

    <ScrollView
      contentContainerClassName="px-6 pt-4 pb-8"
      showsVerticalScrollIndicator={false}
      style={{ zIndex: 1 }}
    >
      <TouchableOpacity onPress={confirmExit} className="mb-4">
        <Text className="text-gold text-base">← Exit Quest</Text>
      </TouchableOpacity>

      {/* Animated progress bar */}
      <View className="h-2 bg-ocean-mid rounded-full overflow-hidden border border-ocean-light mb-3">
        <Animated.View
          className="h-full bg-gold rounded-full"
          style={{
            width: progressAnim.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
            }),
          }}
        />
      </View>

      {/* Island Banner */}
      {islandName ? (
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <View style={{
            backgroundColor: accentColor + "22",
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: accentColor + "55",
          }}>
            <Text style={{ color: accentColor, fontSize: 11, fontWeight: "700" }}>
              Island {islandNum} · {islandName}
            </Text>
          </View>
          {islandSkill ? (
            <Text style={{ color: "#6b7280", fontSize: 10 }}>{islandSkill}</Text>
          ) : null}
        </View>
      ) : null}

      {/* ========== INTRO ========== */}
      {phase === "intro" && (
        <View className="items-center mt-4">
          {characterMode ? (
            <>
              <CaptainSalita
                state="talking"
                dialogue={npcIntro}
                size={160}
              />
              <TouchableOpacity
                onPress={() => setPhase("listening")}
                className="mt-8 bg-gold rounded-xl px-10 py-4 w-full items-center"
              >
                <Text className="text-ocean-deep font-bold text-lg">Start Listening</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View className="items-center">
              <Text className="text-6xl mb-4">👂</Text>
              <Text className="text-gold text-2xl font-bold text-center mb-4">Sailor, Ready?</Text>
              <Text className="text-parchment text-base text-center leading-7 mb-10">
                The audio plays once — no replays, no second chances.{"\n"}Trust your ears.
              </Text>
              <TouchableOpacity
                onPress={() => setPhase("listening")}
                className="bg-gold rounded-xl px-10 py-4 w-full items-center"
              >
                <Text className="text-ocean-deep font-bold text-lg">Start Listening</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ========== LISTENING ========== */}
      {phase === "listening" && (
        <View className="items-center">
          {characterMode && (
            <DagatCharacter state="listening" size={160} />
          )}
          <AudioPlayer audioUrl={current.audioUrl} onEnd={handleAudioEnd} autoPlay />
        </View>
      )}

      {/* ========== ANSWERING / RESULT ========== */}
      {(phase === "answering" || phase === "result") && (
        <View>
          {/* Dagat reaction (character mode) */}
          {characterMode && (
            <View className="items-center mb-4">
              <DagatCharacter state={dagatState} size={140} />
            </View>
          )}

          <Text className="text-parchment text-base font-semibold mb-5 leading-7">
            {current.question}
          </Text>

          <View className="space-y-3">
            {current.choices.map((choice) => {
              const isSelected = selected === choice.label;
              const choiceIsCorrect = choice.label === current.answer;
              let bg = "bg-ocean-mid border-ocean-light";
              if (phase === "result") {
                if (choiceIsCorrect) bg = "bg-green-900 border-green-500";
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
            <View className="mt-5">
              {/* Captain Salita reacts (character mode) */}
              {characterMode && (
                <View className="items-center mb-4">
                  <CaptainSalita
                    state="talking"
                    dialogue={
                      isCorrect
                        ? current.explanation
                        : npcFail
                    }
                    size={130}
                  />
                </View>
              )}

              <View
                className={`rounded-xl p-4 mb-4 ${
                  isCorrect ? "bg-green-900/50" : "bg-red-900/50"
                }`}
              >
                <Text className="text-white font-bold mb-1">
                  {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
                </Text>
                <Text className="text-parchment text-sm leading-6">
                  {current.explanation}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleNext}
                className="bg-gold rounded-xl py-4 items-center"
              >
                <Text className="text-ocean-deep font-bold text-base">
                  {isLastChallenge ? "Claim the Shard ⭐" : "Next Challenge →"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </ScrollView>
    </SafeAreaView>
  );
}
