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
import {
  RepairVoteStartEvent,
  RepairVoteUpdateEvent,
  RepairVoteResultEvent,
  RoundQuestionEvent,
  VoteUpdateEvent,
  RoundResultEvent,
  RoundEndEvent,
  ShipPart,
} from "@/types";

const PUSHER_KEY = process.env.EXPO_PUBLIC_PUSHER_KEY ?? "";
const PUSHER_CLUSTER = process.env.EXPO_PUBLIC_PUSHER_CLUSTER ?? "ap1";
const SHIP_PARTS: ShipPart[] = ["hull", "mast", "sails", "anchor", "rudder"];

type GamePhase =
  | "waiting"
  | "repair-voting"
  | "repair-result"
  | "listening"
  | "voting"
  | "result"
  | "round-end"
  | "ended";

export default function GameScreen() {
  const { roomId, code } = useLocalSearchParams<{ roomId: string; code: string }>();
  const { user } = useAuthStore();
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
    currentPartTarget,
    setCurrentPartTarget,
    questionIndex,
    setQuestionIndex,
    setRepairVoteCounts,
    myRepairVote,
    setMyRepairVote,
  } = useMultiplayerStore();

  const [phase, setPhase] = useState<GamePhase>("waiting");
  const [timeLeft, setTimeLeft] = useState(45);
  const [voteError, setVoteError] = useState("");
  const [repairVoteError, setRepairVoteError] = useState("");
  const [startingRound, setStartingRound] = useState(false);
  const [nextingQuestion, setNextingQuestion] = useState(false);
  const [endCountdown, setEndCountdown] = useState<number | null>(null);
  const [repairResultPart, setRepairResultPart] = useState<ShipPart | null>(null);
  const [roundEndData, setRoundEndData] = useState<{ round: number; totalRounds: number } | null>(null);
  const [totalVotes, setTotalVotes] = useState(0);
  const [repairTotalVotes, setRepairTotalVotes] = useState(0);

  const endCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutCalledRef = useRef(false);

  const isHost = room?.hostId === user?.id || !room;
  const playerCount = room?.players?.length ?? 1;

  useEffect(() => {
    const pusher =
      (global as any).__pusher ??
      new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });

    const channel = pusher.subscribe(`room-${roomId}`);

    channel.bind("room:updated", (data: any) => setRoom(data));

    channel.bind("repair:start", (data: RepairVoteStartEvent) => {
      setRoom({ ...room, shipHealth: data.shipHealth } as any);
      setRepairVoteCounts({});
      setMyRepairVote(null);
      setRepairTotalVotes(0);
      setPhase("repair-voting");
    });

    channel.bind("repair:vote:update", (data: RepairVoteUpdateEvent) => {
      setRepairTotalVotes(data.totalVotes);
    });

    channel.bind("repair:vote:result", (data: RepairVoteResultEvent) => {
      setCurrentPartTarget(data.chosenPart);
      setRepairResultPart(data.chosenPart);
      setPhase("repair-result");
    });

    channel.bind("round:question", (data: RoundQuestionEvent) => {
      setCurrentQuestion({
        text: data.question,
        choices: data.choices,
        audioUrl: data.audioUrl,
      });
      setCurrentPartTarget(data.partToRepair);
      setQuestionIndex(data.questionIndex);
      setTotalVotes(0);
      timeoutCalledRef.current = false;
      setPhase("listening");
    });

    channel.bind("vote:update", (data: VoteUpdateEvent) => {
      setCrewVoteCounts({ [data.userId]: data.hasVoted ? 1 : 0 });
      setTotalVotes(data.totalVotes);
    });

    channel.bind("round:result", (data: RoundResultEvent) => {
      clearTimer();
      setLastResult({
        isCorrect: data.isCorrect,
        correctAnswer: data.correctAnswer,
        crewAnswer: data.crewAnswer,
        newShipHealth: data.newShipHealth,
        partTarget: data.partTarget,
        questionIndex: data.questionIndex,
        isRoundOver: data.isRoundOver,
        newPartTarget: data.newPartTarget,
      });
      if (data.newPartTarget) {
        setCurrentPartTarget(data.newPartTarget);
      }
      setPhase("result");
    });

    channel.bind("round:end", (data: RoundEndEvent) => {
      setRoundEndData({ round: data.round, totalRounds: data.totalRounds });
      setPhase("round-end");
    });

    channel.bind("game:end", () => {
      clearTimer();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    if (phase === "ended") {
      router.replace("/(multiplayer)/results");
    }
  }, [phase]);

  function startTimer() {
    setTimeLeft(45);
    timeoutCalledRef.current = false;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearTimer();
          // Auto-trigger timeout on host client when timer hits 0
          if (isHost && !timeoutCalledRef.current) {
            timeoutCalledRef.current = true;
            apiClient.questionTimeout(roomId).catch(() => {});
          }
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
    setVoteError("");
    setVote(choice);
    try {
      await apiClient.submitVote(roomId, choice);
    } catch {
      setVote(null);
      setVoteError("Vote failed — tap again to retry.");
    }
  }

  async function handleRepairVote(part: ShipPart) {
    if (myRepairVote) return;
    setRepairVoteError("");
    setMyRepairVote(part);
    try {
      await apiClient.submitRepairVote(roomId, part);
    } catch {
      setMyRepairVote(null);
      setRepairVoteError("Vote failed — tap again to retry.");
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

  async function handleNextQuestion() {
    if (!isHost || nextingQuestion) return;
    setNextingQuestion(true);
    try {
      await apiClient.nextQuestion(roomId);
    } finally {
      setNextingQuestion(false);
    }
  }

  const shipHealth = lastResult?.newShipHealth ?? room?.shipHealth ?? {
    hull: 25, mast: 25, sails: 25, anchor: 25, rudder: 25,
  };

  const partLabel = (p: ShipPart) => p.charAt(0).toUpperCase() + p.slice(1);

  return (
    <SafeAreaView className="flex-1 bg-ocean-deep" edges={["top"]}>
    <ScrollView contentContainerClassName="px-6 pt-4 pb-8">

      {/* Header row */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-parchment-dark text-sm">
          Room: <Text className="text-gold font-bold tracking-widest">{code}</Text>
        </Text>
        <View className="items-end">
          <Text className="text-parchment-dark text-sm">
            Round {room?.currentRound ?? 0}/{room?.roundCount ?? 5}
          </Text>
          {(phase === "listening" || phase === "voting" || phase === "result") && (
            <Text className="text-parchment-dark text-xs">
              Q <Text className="text-gold font-bold">{questionIndex + 1}</Text>/5
              {currentPartTarget && (
                <Text className="text-parchment-dark"> · {partLabel(currentPartTarget)}</Text>
              )}
            </Text>
          )}
        </View>
      </View>

      {/* Ship health */}
      <ShipHealthDisplay
        health={shipHealth}
        highlightPart={lastResult?.partTarget as ShipPart | undefined}
      />

      {/* Voting timer */}
      {phase === "voting" && (
        <View className="flex-row justify-end mt-3">
          <View className={`px-4 py-1 rounded-full ${timeLeft <= 10 ? "bg-coral" : "bg-ocean-light"}`}>
            <Text className="text-white font-bold">{timeLeft}s</Text>
          </View>
        </View>
      )}

      {/* ── WAITING phase ─────────────────────────────────────── */}
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

      {/* ── REPAIR VOTING phase ────────────────────────────────── */}
      {phase === "repair-voting" && (
        <View className="mt-4">
          <Text className="text-gold text-lg font-bold text-center mb-1">
            Choose a part to repair this round
          </Text>
          <Text className="text-parchment-dark text-xs text-center mb-5">
            {repairTotalVotes}/{playerCount} voted
            {myRepairVote && <Text className="text-gold"> · You chose {partLabel(myRepairVote)}</Text>}
          </Text>

          <View className="space-y-3">
            {SHIP_PARTS.map((part) => {
              const hp = (shipHealth as any)[part] as number;
              const isMyVote = myRepairVote === part;
              const isMax = hp >= 100;
              let bg = "bg-ocean-mid border-ocean-light";
              if (isMyVote) bg = "bg-ocean-light border-gold";
              else if (isMax) bg = "bg-ocean-mid border-green-700 opacity-60";

              return (
                <TouchableOpacity
                  key={part}
                  onPress={() => !isMax && handleRepairVote(part)}
                  disabled={!!myRepairVote || isMax}
                  className={`rounded-xl p-4 border ${bg} flex-row justify-between items-center`}
                >
                  <Text className="text-parchment font-semibold capitalize">{part}</Text>
                  <Text className={`text-xs font-bold ${hp >= 100 ? "text-green-400" : hp > 0 ? "text-yellow-400" : "text-red-400"}`}>
                    {hp >= 100 ? "INTACT ✓" : hp <= 0 ? "SUNK ✗" : `${hp}%`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {repairVoteError ? (
            <Text className="text-coral text-xs text-center mt-3">{repairVoteError}</Text>
          ) : null}
          {!myRepairVote && (
            <Text className="text-parchment-dark text-xs text-center mt-4">
              Vote to choose which ship part to repair this round.
            </Text>
          )}
        </View>
      )}

      {/* ── REPAIR RESULT phase ────────────────────────────────── */}
      {phase === "repair-result" && repairResultPart && (
        <View className="items-center mt-12">
          <Text className="text-5xl mb-4">🔧</Text>
          <Text className="text-gold text-xl font-bold mb-2">Crew chose to repair:</Text>
          <Text className="text-parchment text-3xl font-bold capitalize mb-2">{repairResultPart}</Text>
          <Text className="text-parchment-dark text-sm">Audio starting now — listen carefully!</Text>
        </View>
      )}

      {/* ── LISTENING phase ────────────────────────────────────── */}
      {phase === "listening" && currentQuestion && (
        <View className="mt-6">
          <Text className="text-parchment-dark text-xs text-center mb-4">
            Listen carefully. Audio plays once.
          </Text>
          <AudioPlayer audioUrl={currentQuestion.audioUrl} onEnd={handleAudioEnd} autoPlay />
        </View>
      )}

      {/* ── VOTING / RESULT phase ─────────────────────────────── */}
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

          {phase === "voting" && (
            <Text className="text-parchment-dark text-xs text-center mt-4">
              {hasVoted
                ? `Waiting for crew... ${totalVotes}/${playerCount} voted`
                : "Discuss with your crew and tap your answer."}
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
                    ? `✓ Correct! ${partLabel(lastResult.partTarget)} repaired +25%`
                    : `✗ Wrong! ${partLabel(lastResult.partTarget)} damaged -25%`}
                </Text>
                {lastResult.newPartTarget && (
                  <Text className="text-parchment-dark text-xs mt-1">
                    Part fully repaired! Shifted to: {partLabel(lastResult.newPartTarget)}
                  </Text>
                )}
                <Text className="text-parchment-dark text-sm mt-1">
                  Crew voted: {lastResult.crewAnswer} · Correct: {lastResult.correctAnswer}
                </Text>
              </View>

              {/* Host controls */}
              {isHost && !lastResult.isRoundOver && (
                <TouchableOpacity
                  onPress={handleNextQuestion}
                  disabled={nextingQuestion}
                  className="mt-4 bg-gold rounded-xl py-4 items-center"
                >
                  {nextingQuestion
                    ? <ActivityIndicator color="#1a1a2e" />
                    : <Text className="text-ocean-deep font-bold text-base">Next Question →</Text>
                  }
                </TouchableOpacity>
              )}
              {isHost && lastResult.isRoundOver && (
                <TouchableOpacity
                  onPress={handleStartRound}
                  disabled={startingRound}
                  className="mt-4 bg-gold rounded-xl py-4 items-center"
                >
                  {startingRound
                    ? <ActivityIndicator color="#1a1a2e" />
                    : <Text className="text-ocean-deep font-bold text-base">Start Next Round →</Text>
                  }
                </TouchableOpacity>
              )}
              {!isHost && (
                <Text className="text-parchment-dark text-xs text-center mt-4 italic">
                  {lastResult.isRoundOver
                    ? "Waiting for captain to start next round..."
                    : "Waiting for captain to continue..."}
                </Text>
              )}

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

      {/* ── ROUND END phase ────────────────────────────────────── */}
      {phase === "round-end" && roundEndData && (
        <View className="items-center mt-10">
          <Text className="text-gold text-2xl font-bold mb-2">
            Round {roundEndData.round} Complete!
          </Text>
          <Text className="text-parchment-dark text-sm mb-8">
            {roundEndData.totalRounds - roundEndData.round} round{roundEndData.totalRounds - roundEndData.round !== 1 ? "s" : ""} remaining
          </Text>
          {isHost && (
            <TouchableOpacity
              onPress={handleStartRound}
              disabled={startingRound}
              className="bg-gold rounded-xl px-10 py-4 items-center w-full"
            >
              {startingRound
                ? <ActivityIndicator color="#1a1a2e" />
                : <Text className="text-ocean-deep font-bold text-lg">Start Next Round →</Text>
              }
            </TouchableOpacity>
          )}
          {!isHost && (
            <Text className="text-parchment-dark text-sm italic">Waiting for captain to start next round...</Text>
          )}
        </View>
      )}

    </ScrollView>
    </SafeAreaView>
  );
}
