import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import Pusher from "pusher-js";
import { useMultiplayerStore } from "@/stores/multiplayer";
import { apiClient } from "@/lib/api";
import { AudioPlayer } from "@/components/audio/AudioPlayer";
import { ShipHealthDisplay } from "@/components/map/ShipHealthDisplay";
import {
  RoundStartEvent,
  VoteUpdateEvent,
  RoundResultEvent,
  ShipPart,
} from "@linguaquest/shared";

const PUSHER_KEY = process.env.EXPO_PUBLIC_PUSHER_KEY ?? "";
const PUSHER_CLUSTER = process.env.EXPO_PUBLIC_PUSHER_CLUSTER ?? "ap1";

type GamePhase = "waiting" | "repair-vote" | "listening" | "voting" | "result";

export default function GameScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const {
    room,
    currentQuestion,
    setCurrentQuestion,
    setCrewVoteCounts,
    setLastResult,
    lastResult,
    setVote,
    hasVoted,
    myVote,
    setRoom,
  } = useMultiplayerStore();

  const [phase, setPhase] = useState<GamePhase>("waiting");
  const [timeLeft, setTimeLeft] = useState(45);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const pusher =
      (global as any).__pusher ??
      new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });

    const channel = pusher.subscribe(`room-${roomId}`);

    channel.bind("room:updated", (data: any) => {
      setRoom(data);
    });

    channel.bind("round:start", (data: RoundStartEvent) => {
      setCurrentQuestion({
        text: data.question,
        choices: data.choices,
        audioUrl: data.audioUrl,
      });
      setPhase("listening");
    });

    channel.bind("vote:update", (data: VoteUpdateEvent) => {
      setCrewVoteCounts({ [data.userId]: data.hasVoted ? 1 : 0 });
    });

    channel.bind("round:result", (data: RoundResultEvent) => {
      clearTimer();
      setLastResult({
        isCorrect: data.isCorrect,
        correctAnswer: data.correctAnswer,
        crewAnswer: data.crewAnswer,
        newShipHealth: data.newShipHealth,
        partTarget: data.partTarget,
      });
      setPhase("result");
    });

    return () => {
      clearTimer();
      channel.unbind_all();
    };
  }, [roomId]);

  // 45-second countdown timer
  function startTimer() {
    setTimeLeft(45);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearTimer();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function handleAudioEnd() {
    setPhase("voting");
    startTimer();
  }

  async function handleVote(choice: string) {
    if (hasVoted) return;
    setVote(choice);
    await apiClient.submitVote(roomId, choice);
  }

  const shipHealth = room?.shipHealth ?? {
    hull: 25,
    mast: 25,
    sails: 25,
    anchor: 25,
    rudder: 25,
  };

  return (
    <ScrollView
      className="flex-1 bg-ocean-deep"
      contentContainerClassName="px-6 pt-14 pb-8"
    >
      {/* Ship health */}
      <ShipHealthDisplay health={shipHealth} />

      {/* Round info */}
      <View className="flex-row justify-between items-center my-4">
        <Text className="text-parchment-dark text-sm">
          Round {room?.currentRound ?? 1} / {room?.roundCount ?? 5}
        </Text>
        {phase === "voting" && (
          <View
            className={`px-4 py-1 rounded-full ${timeLeft <= 10 ? "bg-coral" : "bg-ocean-light"}`}
          >
            <Text className="text-white font-bold">{timeLeft}s</Text>
          </View>
        )}
      </View>

      {/* Game phases */}
      {phase === "waiting" && (
        <View className="items-center mt-12">
          <Text className="text-4xl mb-4">⚓</Text>
          <Text className="text-gold text-xl font-bold">Waiting for game to start...</Text>
          <Text className="text-parchment-dark text-sm mt-2">
            {room?.players?.length ?? 0} / {room?.roundCount ?? 5} players in crew
          </Text>
        </View>
      )}

      {phase === "listening" && currentQuestion && (
        <AudioPlayer
          audioUrl={currentQuestion.audioUrl}
          onEnd={handleAudioEnd}
          autoPlay
        />
      )}

      {(phase === "voting" || phase === "result") && currentQuestion && (
        <View>
          <Text className="text-parchment text-base font-semibold mb-6 leading-7">
            {currentQuestion.text}
          </Text>

          <View className="space-y-3">
            {currentQuestion.choices.map((choice) => {
              const isMyVote = myVote === choice.label;
              const isCorrect = lastResult?.correctAnswer === choice.label;
              const isCrewAnswer = lastResult?.crewAnswer === choice.label;

              let bg = "bg-ocean-mid border-ocean-light";
              if (phase === "result") {
                if (isCorrect) bg = "bg-green-900 border-green-500";
                else if (isCrewAnswer) bg = "bg-red-900 border-red-500";
              } else if (isMyVote) {
                bg = "bg-ocean-light border-gold";
              }

              return (
                <TouchableOpacity
                  key={choice.label}
                  onPress={() => handleVote(choice.label)}
                  disabled={hasVoted || phase === "result"}
                  className={`rounded-xl p-4 border ${bg}`}
                >
                  <Text className="text-parchment">
                    <Text className="font-bold">{choice.label}. </Text>
                    {choice.text}
                  </Text>
                  {isMyVote && phase === "voting" && (
                    <Text className="text-gold text-xs mt-1">✓ Your vote</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {phase === "voting" && !hasVoted && (
            <Text className="text-parchment-dark text-xs text-center mt-4">
              Discuss with your crew and tap your answer.
            </Text>
          )}

          {phase === "result" && lastResult && (
            <View
              className={`mt-6 rounded-xl p-4 ${
                lastResult.isCorrect ? "bg-green-900/50" : "bg-red-900/50"
              }`}
            >
              <Text className="text-white font-bold text-lg mb-1">
                {lastResult.isCorrect
                  ? `✓ Correct! +25% ${lastResult.partTarget}`
                  : `✗ Wrong! -25% ${lastResult.partTarget}`}
              </Text>
              <Text className="text-parchment-dark text-sm">
                Crew voted: {lastResult.crewAnswer} | Correct: {lastResult.correctAnswer}
              </Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}
