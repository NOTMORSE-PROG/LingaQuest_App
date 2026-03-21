import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import Pusher from "pusher-js";
import { useMultiplayerStore } from "@/stores/multiplayer";
import { useAuthStore } from "@/stores/auth";
import { apiClient } from "@/lib/api";
import { AudioPlayer } from "@/components/audio/AudioPlayer";
import { ShipHealthDisplay } from "@/components/map/ShipHealthDisplay";
import { RoundStartEvent, VoteUpdateEvent, RoundResultEvent, ShipPart } from "@linguaquest/shared";

const PUSHER_KEY = process.env.EXPO_PUBLIC_PUSHER_KEY ?? "";
const PUSHER_CLUSTER = process.env.EXPO_PUBLIC_PUSHER_CLUSTER ?? "ap1";

type GamePhase = "waiting" | "listening" | "voting" | "result" | "ended";

export default function GameScreen() {
  const { roomId, code } = useLocalSearchParams<{ roomId: string; code: string }>();
  const { user } = useAuthStore();
  const {
    room, currentQuestion,
    setCurrentQuestion, setCrewVoteCounts, setLastResult,
    lastResult, setVote, hasVoted, myVote, setRoom,
  } = useMultiplayerStore();

  const [phase, setPhase] = useState<GamePhase>("waiting");
  const [timeLeft, setTimeLeft] = useState(45);
  const [isLastRound, setIsLastRound] = useState(false);
  const [voteError, setVoteError] = useState("");
  const [startingRound, setStartingRound] = useState(false);
  const [endCountdown, setEndCountdown] = useState<number | null>(null);
  const endCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isHost = room?.hostId === user?.id || !room; // allow control before first room update

  useEffect(() => {
    const pusher =
      (global as any).__pusher ??
      new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });

    const channel = pusher.subscribe(`room-${roomId}`);

    channel.bind("room:updated", (data: any) => setRoom(data));

    channel.bind("round:start", (data: RoundStartEvent) => {
      setCurrentQuestion({
        text: data.question,
        choices: data.choices,
        audioUrl: data.audioUrl,
      });
      setPhase("listening");
      setIsLastRound(false);
    });

    channel.bind("vote:update", (data: VoteUpdateEvent) => {
      setCrewVoteCounts({ [data.userId]: data.hasVoted ? 1 : 0 });
    });

    channel.bind("round:result", (data: RoundResultEvent & { isLastRound?: boolean }) => {
      clearTimer();
      setLastResult({
        isCorrect: data.isCorrect,
        correctAnswer: data.correctAnswer,
        crewAnswer: data.crewAnswer,
        newShipHealth: data.newShipHealth,
        partTarget: data.partTarget,
      });
      setIsLastRound(data.isLastRound ?? false);
      setPhase("result");
    });

    channel.bind("game:end", () => {
      // Show countdown before navigating to results
      setEndCountdown(4);
      endCountdownRef.current = setInterval(() => {
        setEndCountdown((n) => {
          if (n === null || n <= 1) {
            clearInterval(endCountdownRef.current!);
            endCountdownRef.current = null;
            setPhase("ended");
            return null;
          }
          return n - 1;
        });
      }, 1000);
    });

    return () => {
      clearTimer();
      if (endCountdownRef.current) clearInterval(endCountdownRef.current);
      channel.unbind_all();
      pusher.unsubscribe(`room-${roomId}`);
    };
  }, [roomId, setCrewVoteCounts, setCurrentQuestion, setLastResult, setRoom]);

  // Auto-navigate to results when game ends
  useEffect(() => {
    if (phase === "ended") {
      router.replace("/(multiplayer)/results");
    }
  }, [phase]);

  function startTimer() {
    setTimeLeft(45);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearTimer(); return 0; }
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
    setVoteError("");
    setVote(choice);
    try {
      await apiClient.submitVote(roomId, choice);
    } catch {
      setVote(null);
      setVoteError("Vote failed — tap again to retry.");
    }
  }

  async function handleStartRound() {
    if (!isHost || startingRound) return;
    setStartingRound(true);
    try {
      await apiClient.startRound(roomId);
    } finally {
      setStartingRound(false);
    }
  }

  const shipHealth = room?.shipHealth ?? {
    hull: 25, mast: 25, sails: 25, anchor: 25, rudder: 25,
  };

  return (
    <SafeAreaView className="flex-1 bg-ocean-deep" edges={["top"]}>
    <ScrollView contentContainerClassName="px-6 pt-4 pb-8">

      {/* Room code display */}
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-parchment-dark text-sm">Room: <Text className="text-gold font-bold tracking-widest">{code}</Text></Text>
        <Text className="text-parchment-dark text-sm">
          Round {room?.currentRound ?? 0}/{room?.roundCount ?? 5}
        </Text>
      </View>

      {/* Ship health */}
      <ShipHealthDisplay health={shipHealth} highlightPart={lastResult?.partTarget as ShipPart | undefined} />

      {/* Timer */}
      {phase === "voting" && (
        <View className="flex-row justify-end mt-3">
          <View className={`px-4 py-1 rounded-full ${timeLeft <= 10 ? "bg-coral" : "bg-ocean-light"}`}>
            <Text className="text-white font-bold">{timeLeft}s</Text>
          </View>
        </View>
      )}

      {/* ── Waiting phase ─────────────────────────────────────── */}
      {phase === "waiting" && (
        <View className="items-center mt-12">
          <Text className="text-5xl mb-4">⚓</Text>
          <Text className="text-gold text-xl font-bold mb-2">Waiting for crew...</Text>
          <Text className="text-parchment-dark text-sm mb-8">
            {room?.players?.length ?? 1} sailor{(room?.players?.length ?? 1) !== 1 ? "s" : ""} aboard
          </Text>
          {isHost && (
            <TouchableOpacity
              onPress={handleStartRound}
              disabled={startingRound}
              className="bg-gold rounded-xl px-10 py-4 items-center w-full"
            >
              {startingRound
                ? <ActivityIndicator color="#1a1a2e" />
                : <Text className="text-ocean-deep font-bold text-lg">Start Round 1</Text>
              }
            </TouchableOpacity>
          )}
          {!isHost && (
            <Text className="text-parchment-dark text-sm italic">Waiting for captain to start...</Text>
          )}
        </View>
      )}

      {/* ── Listening phase ───────────────────────────────────── */}
      {phase === "listening" && currentQuestion && (
        <View className="mt-6">
          <Text className="text-parchment-dark text-xs text-center mb-4">Listen carefully. Audio plays once.</Text>
          <AudioPlayer audioUrl={currentQuestion.audioUrl} onEnd={handleAudioEnd} autoPlay />
        </View>
      )}

      {/* ── Voting / Result phase ─────────────────────────────── */}
      {(phase === "voting" || phase === "result") && currentQuestion && (
        <View className="mt-4">
          <Text className="text-parchment text-base font-semibold mb-5 leading-7">
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
                else if (isCrewAnswer && !isCorrect) bg = "bg-red-900 border-red-500";
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
          {voteError ? (
            <Text className="text-coral text-xs text-center mt-2">{voteError}</Text>
          ) : null}

          {/* Result feedback */}
          {phase === "result" && lastResult && (
            <View>
              <View className={`mt-5 rounded-xl p-4 ${lastResult.isCorrect ? "bg-green-900/50" : "bg-red-900/50"}`}>
                <Text className="text-white font-bold text-base mb-1">
                  {lastResult.isCorrect
                    ? `✓ Correct! ${lastResult.partTarget} repaired +25%`
                    : `✗ Wrong! ${lastResult.partTarget} damaged -25%`}
                </Text>
                <Text className="text-parchment-dark text-sm">
                  Crew voted: {lastResult.crewAnswer} · Correct: {lastResult.correctAnswer}
                </Text>
              </View>

              {/* Next round button (host only) */}
              {isHost && (
                <TouchableOpacity
                  onPress={isLastRound
                    ? () => router.replace("/(multiplayer)/results")
                    : handleStartRound
                  }
                  disabled={startingRound}
                  className="mt-4 bg-gold rounded-xl py-4 items-center"
                >
                  {startingRound
                    ? <ActivityIndicator color="#1a1a2e" />
                    : <Text className="text-ocean-deep font-bold text-base">
                        {isLastRound ? "See Results ⭐" : "Next Round →"}
                      </Text>
                  }
                </TouchableOpacity>
              )}
              {!isHost && (
                <Text className="text-parchment-dark text-xs text-center mt-4 italic">
                  {isLastRound ? "Waiting for final results..." : "Waiting for captain to start next round..."}
                </Text>
              )}

              {/* Game-end countdown */}
              {endCountdown !== null && (
                <View className="mt-4 bg-ocean-mid rounded-xl p-3 items-center border border-gold/30">
                  <Text className="text-parchment-dark text-xs">
                    Heading to results in <Text className="text-gold font-bold">{endCountdown}</Text>...
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </ScrollView>
    </SafeAreaView>
  );
}
