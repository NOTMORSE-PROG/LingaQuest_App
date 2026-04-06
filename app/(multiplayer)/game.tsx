import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import Pusher from "pusher-js";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from "react-native-reanimated";
import { useMultiplayerStore } from "@/stores/multiplayer";
import { useAuthStore } from "@/stores/auth";
import { apiClient } from "@/lib/api";
import { AudioPlayer } from "@/components/audio/AudioPlayer";
import { TreasureMap } from "@/components/multiplayer/TreasureMap";
import { RoundQuestionEvent, VoteUpdateEvent, RoundResultEvent, GameEndEvent } from "@/types";

const PUSHER_KEY = process.env.EXPO_PUBLIC_PUSHER_KEY ?? "";
const PUSHER_CLUSTER = process.env.EXPO_PUBLIC_PUSHER_CLUSTER ?? "ap1";

const AUTO_ADVANCE_RESULT = 5; // seconds to auto-advance after result

type GamePhase = "waiting" | "get-ready" | "listening" | "voting" | "result" | "final";

// ── Auto-advance countdown bar ──────────────────────────────
function AutoAdvanceBar({ countdown, totalSeconds, label }: { countdown: number | null; totalSeconds: number; label: string }) {
  if (countdown === null) return null;
  return (
    <View className="mt-4 w-full">
      <Text className="text-parchment-dark text-sm text-center mb-2">
        {label} in <Text className="text-gold font-bold">{countdown}s</Text>
      </Text>
      <View style={{ height: 6, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
        <View style={{
          height: "100%",
          width: `${(countdown / totalSeconds) * 100}%`,
          backgroundColor: "#f5c518",
          borderRadius: 3,
        }} />
      </View>
    </View>
  );
}

// ── Question progress dots ──────────────────────────────────
function QuestionDots({ results, currentIndex }: { results: (boolean | null)[]; currentIndex: number }) {
  return (
    <View className="flex-row justify-center mt-3 space-x-2">
      {results.map((r, i) => {
        const bg =
          r === true ? "bg-green-500" :
          r === false ? "bg-red-500" :
          i === currentIndex ? "bg-gold" :
          "bg-ocean-light/40";
        const size = i === currentIndex ? "w-3.5 h-3.5" : "w-3 h-3";
        return <View key={i} className={`${size} rounded-full ${bg}`} />;
      })}
    </View>
  );
}

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
    crewVoteCounts,
    setRoom,
    questionIndex,
    setQuestionIndex,
    questionResults,
    addQuestionResult,
  } = useMultiplayerStore();

  const [phase, setPhase] = useState<GamePhase>("waiting");
  const [timeLeft, setTimeLeft] = useState(30);
  const [voteError, setVoteError] = useState("");
  const [startingGame, setStartingGame] = useState(false);
  const [nextingQuestion, setNextingQuestion] = useState(false);
  const [totalVotes, setTotalVotes] = useState(0);
  const [getReadyCount, setGetReadyCount] = useState(3);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);
  const [gameEndData, setGameEndData] = useState<{ correctCount: number; totalQuestions: number } | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutCalledRef = useRef(false);
  const autoAdvanceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoAdvanceCancelledRef = useRef(false);
  const isHostRef = useRef(false);
  const getReadyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasNavigatedRef = useRef(false);

  // Reanimated values for result animations
  const resultSlideY = useSharedValue(100);
  const resultShakeX = useSharedValue(0);

  const isHost = room?.hostId === user?.id || !room;
  isHostRef.current = isHost;
  const playerCount = room?.players?.length ?? 1;

  // ── Auto-advance helpers ──────────────────────────────────
  function startAutoAdvance(seconds: number, action: () => Promise<unknown>) {
    clearAutoAdvance();
    autoAdvanceCancelledRef.current = false;
    let remaining = seconds;
    setAutoAdvanceCountdown(seconds);
    autoAdvanceRef.current = setInterval(() => {
      remaining -= 1;
      setAutoAdvanceCountdown(remaining);
      if (remaining <= 0) {
        clearAutoAdvance();
        if (isHostRef.current && !autoAdvanceCancelledRef.current) {
          action().catch(() => {});
        }
      }
    }, 1000);
  }

  function clearAutoAdvance() {
    if (autoAdvanceRef.current) {
      clearInterval(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    setAutoAdvanceCountdown(null);
  }

  // ── "Get Ready" countdown ─────────────────────────────────
  function startGetReady() {
    setGetReadyCount(3);
    setPhase("get-ready");
    getReadyTimerRef.current = setInterval(() => {
      setGetReadyCount((n) => {
        if (n <= 1) {
          if (getReadyTimerRef.current) clearInterval(getReadyTimerRef.current);
          getReadyTimerRef.current = null;
          setPhase("listening");
          return 0;
        }
        return n - 1;
      });
    }, 1000);
  }

  // ── Pusher subscription ───────────────────────────────────
  useEffect(() => {
    const pusher =
      (global as any).__pusher ??
      new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });

    const existing = pusher.channel(`room-${roomId}`);
    if (existing) {
      existing.unbind_all();
      pusher.unsubscribe(`room-${roomId}`);
    }
    const channel = pusher.subscribe(`room-${roomId}`);

    channel.bind("room:updated", (data: any) => setRoom(data));

    channel.bind("round:question", (data: RoundQuestionEvent) => {
      clearAutoAdvance();
      setCurrentQuestion({
        text: data.question,
        choices: data.choices,
        audioUrl: data.audioUrl,
      });
      setQuestionIndex(data.questionIndex);
      setTotalVotes(0);
      timeoutCalledRef.current = false;
      startGetReady();
    });

    channel.bind("vote:update", (data: VoteUpdateEvent) => {
      setCrewVoteCounts({ [data.userId]: data.hasVoted ? 1 : 0 });
      setTotalVotes(data.totalVotes);
    });

    channel.bind("round:result", (data: RoundResultEvent) => {
      clearTimer();
      clearAutoAdvance();
      setLastResult({
        isCorrect: data.isCorrect,
        correctAnswer: data.correctAnswer,
        crewAnswer: data.crewAnswer,
        questionIndex: data.questionIndex,
        isGameOver: data.isGameOver,
      });
      addQuestionResult(data.isCorrect);
      setPhase("result");

      // Trigger result animation
      resultSlideY.value = 100;
      resultSlideY.value = withSpring(0, { damping: 12, stiffness: 120 });
      if (!data.isCorrect) {
        resultShakeX.value = withSequence(
          withSpring(-8, { damping: 3, stiffness: 400 }),
          withSpring(8, { damping: 3, stiffness: 400 }),
          withSpring(0, { damping: 8, stiffness: 200 })
        );
      }

      // Auto-advance to next question (if not game over)
      if (!data.isGameOver) {
        startAutoAdvance(AUTO_ADVANCE_RESULT, () => apiClient.nextQuestion(roomId));
      }
    });

    channel.bind("game:end", (data: GameEndEvent) => {
      clearTimer();
      clearAutoAdvance();
      autoAdvanceCancelledRef.current = true;
      setGameEndData(data);
      // Navigate to results after brief delay
      setTimeout(() => {
        setPhase("final");
      }, 2000);
    });

    // Connection state handling
    channel.bind("pusher:subscription_error", (status: any) => {
      console.warn("[Pusher] subscription error:", status);
      setConnectionError("Connection lost. Trying to reconnect...");
    });

    pusher.connection.bind("disconnected", () => {
      setConnectionError("Disconnected from game server.");
    });

    pusher.connection.bind("connected", () => {
      setConnectionError(null);
    });

    pusher.connection.bind("error", (err: any) => {
      console.warn("[Pusher] connection error:", err);
      setConnectionError("Connection error. Trying to reconnect...");
    });

    return () => {
      clearTimer();
      clearAutoAdvance();
      if (getReadyTimerRef.current) clearInterval(getReadyTimerRef.current);
      channel.unbind_all();
      pusher.unsubscribe(`room-${roomId}`);
      pusher.connection.unbind("disconnected");
      pusher.connection.unbind("connected");
      pusher.connection.unbind("error");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    if (phase === "final" && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      router.replace("/(multiplayer)/results");
    }
  }, [phase]);

  // ── Vote timer (30s) ─────────────────────────────────────
  function startTimer() {
    setTimeLeft(30);
    timeoutCalledRef.current = false;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearTimer();
          if (isHostRef.current && !timeoutCalledRef.current) {
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

  // ── Actions ───────────────────────────────────────────────
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

  async function handleStartGame() {
    if (!isHost || startingGame) return;
    setStartingGame(true);
    try {
      await apiClient.startRound(roomId);
    } catch {
      // Ignore race condition errors
    } finally {
      setStartingGame(false);
    }
  }

  async function handleNextQuestion() {
    if (!isHost || nextingQuestion) return;
    clearAutoAdvance();
    autoAdvanceCancelledRef.current = true;
    setNextingQuestion(true);
    try {
      await apiClient.nextQuestion(roomId);
    } catch {
      // Ignore race condition errors
    } finally {
      setNextingQuestion(false);
    }
  }

  // Animated styles for result phase
  const resultSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: resultSlideY.value }],
  }));
  const resultShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: resultShakeX.value }],
  }));

  return (
    <SafeAreaView className="flex-1 bg-ocean-deep" edges={["top"]}>
    <ScrollView contentContainerClassName="px-6 pt-4 pb-8">

      {/* Connection error banner */}
      {connectionError && (
        <View style={{ backgroundColor: "rgba(127,29,29,0.6)", borderWidth: 1, borderColor: "rgba(239,68,68,0.4)", borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <Text style={{ color: "#fca5a5", fontSize: 13, textAlign: "center" }}>{connectionError}</Text>
          <TouchableOpacity
            onPress={() => {
              const p = (global as any).__pusher;
              if (p) p.connect();
            }}
            style={{ marginTop: 8, backgroundColor: "#991b1b", borderRadius: 8, paddingVertical: 8, alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Reconnect</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Header */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-parchment-dark text-sm">
          Room: <Text className="text-gold font-bold tracking-widest">{code}</Text>
        </Text>
        <View className="items-end">
          {phase === "waiting" ? (
            <Text className="text-parchment-dark text-sm">Waiting to start</Text>
          ) : (
            <Text className="text-parchment-dark text-sm">
              Clue <Text className="text-gold font-bold">{questionIndex + 1}</Text>/5
            </Text>
          )}
        </View>
      </View>

      {/* Treasure Map — always visible after game starts */}
      {phase !== "waiting" && (
        <TreasureMap
          questionResults={questionResults}
          currentIndex={questionIndex}
          totalQuestions={5}
        />
      )}

      {/* Vote timer bar */}
      {phase === "voting" && (
        <View className="mt-3 mb-1">
          <View className="flex-row justify-between mb-1">
            <Text className="text-parchment-dark text-xs">Vote timer</Text>
            <Text className={`text-xs font-bold ${timeLeft <= 10 ? "text-coral" : timeLeft <= 15 ? "text-yellow-400" : "text-gold"}`}>
              {timeLeft}s
            </Text>
          </View>
          <View style={{ height: 6, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
            <View style={{
              height: "100%",
              width: `${(timeLeft / 30) * 100}%`,
              backgroundColor: timeLeft <= 10 ? "#ff6b6b" : timeLeft <= 15 ? "#f5a623" : "#f5c518",
              borderRadius: 3,
            }} />
          </View>
          {timeLeft <= 10 && timeLeft > 0 && (
            <Text className="text-red-400 text-xs text-center mt-1 font-bold">Time running out!</Text>
          )}
        </View>
      )}

      {/* ── WAITING phase ─────────────────────────────────────── */}
      {phase === "waiting" && (
        <View className="items-center mt-12">
          <Text className="text-5xl mb-4">🗺️</Text>
          <Text className="text-gold text-xl font-bold mb-2">Treasure Hunt</Text>
          <Text className="text-parchment-dark text-sm mb-1">
            {playerCount} sailor{playerCount !== 1 ? "s" : ""} aboard
          </Text>
          <Text className="text-parchment-dark text-xs mb-4">
            Solve 5 audio clues to find the treasure!
          </Text>

          {/* Player list */}
          <View className="w-full bg-ocean-mid rounded-xl p-4 border border-ocean-light mb-6">
            {room?.players?.map((player) => (
              <View
                key={player.userId}
                className="flex-row items-center justify-between py-2.5 border-b border-ocean-light/20 last:border-b-0"
              >
                <View className="flex-row items-center">
                  <Text className="text-parchment text-sm font-medium">{player.username}</Text>
                  {player.userId === room.hostId && (
                    <View className="ml-2 bg-gold/20 rounded-full px-2 py-0.5">
                      <Text className="text-gold text-xs font-bold">Captain</Text>
                    </View>
                  )}
                </View>
                {player.userId === user?.id && (
                  <Text className="text-parchment-dark text-xs italic">You</Text>
                )}
              </View>
            ))}
          </View>

          {isHost && (
            <TouchableOpacity
              onPress={handleStartGame}
              disabled={startingGame}
              className="bg-gold rounded-xl px-10 py-4 items-center w-full"
            >
              {startingGame
                ? <ActivityIndicator color="#1a1a2e" />
                : <Text className="text-ocean-deep font-bold text-lg">Begin Treasure Hunt</Text>
              }
            </TouchableOpacity>
          )}
          {!isHost && (
            <Text className="text-parchment-dark text-sm italic mt-2">Waiting for captain to start...</Text>
          )}
        </View>
      )}

      {/* ── GET READY phase ───────────────────────────────────── */}
      {phase === "get-ready" && (
        <View className="items-center mt-10">
          <Text className="text-4xl mb-3">🧭</Text>
          <Text className="text-gold text-xl font-bold mb-4">Get ready, sailors!</Text>
          <Text className="text-parchment text-6xl font-bold mb-4">{getReadyCount}</Text>
          <Text className="text-parchment-dark text-sm">Listen carefully — audio plays once.</Text>
          <QuestionDots results={questionResults} currentIndex={questionIndex} />
        </View>
      )}

      {/* ── LISTENING phase ────────────────────────────────────── */}
      {phase === "listening" && currentQuestion && (
        <View className="mt-4">
          <View className="bg-ocean-mid/50 rounded-lg px-3 py-2 mb-4 border border-ocean-light/20">
            <Text className="text-parchment-dark text-xs text-center">
              Clue <Text className="text-gold font-bold">{questionIndex + 1}</Text>/5 — Listen carefully, audio plays once.
            </Text>
          </View>

          <AudioPlayer audioUrl={currentQuestion.audioUrl} onEnd={handleAudioEnd} autoPlay />
          <QuestionDots results={questionResults} currentIndex={questionIndex} />
        </View>
      )}

      {/* ── VOTING phase ──────────────────────────────────────── */}
      {phase === "voting" && currentQuestion && (
        <View className="mt-4">
          <Text className="text-parchment text-base font-semibold mb-5 leading-7">
            {currentQuestion.text}
          </Text>

          <View className="space-y-3">
            {currentQuestion.choices.map((choice) => {
              const isMyVote = myVote === choice.label;
              let bg = "bg-ocean-mid border-ocean-light";
              if (isMyVote) bg = "bg-ocean-light border-gold";

              return (
                <TouchableOpacity
                  key={choice.label}
                  onPress={() => handleVote(choice.label)}
                  disabled={hasVoted}
                  className={`rounded-xl p-4 border ${bg}`}
                  activeOpacity={0.7}
                >
                  <Text className="text-parchment">
                    <Text className="font-bold">{choice.label}. </Text>
                    {choice.text}
                  </Text>
                  {isMyVote && (
                    <Text className="text-gold text-xs mt-1">✓ Your vote</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Per-player vote status chips */}
          <View className="mt-4">
            {totalVotes >= playerCount && (
              <View className="bg-ocean-mid/50 rounded-lg px-3 py-2 border border-green-500/30 mb-3">
                <Text className="text-green-400 text-xs text-center font-bold">
                  All crew voted! Results incoming...
                </Text>
              </View>
            )}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {room?.players?.map((player) => {
                const voted = !!crewVoteCounts[player.userId];
                const isMe = player.userId === user?.id;
                return (
                  <View
                    key={player.userId}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 20,
                      backgroundColor: voted ? "#f5c518" : "transparent",
                      borderWidth: 1.5,
                      borderColor: voted ? "#f5c518" : "rgba(245,197,24,0.35)",
                      borderStyle: voted ? "solid" : "dashed",
                    }}
                  >
                    <Text
                      style={{
                        color: voted ? "#1a1a2e" : "rgba(255,255,255,0.4)",
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      {voted ? "✓" : "○"} {player.username}{isMe ? " (You)" : ""}
                    </Text>
                  </View>
                );
              })}
            </View>
            {!hasVoted && (
              <Text className="text-parchment-dark text-xs text-center mt-3">
                Discuss with your crew and tap your answer.
              </Text>
            )}
          </View>

          {voteError ? (
            <Text className="text-coral text-xs text-center mt-2">{voteError}</Text>
          ) : null}
        </View>
      )}

      {/* ── RESULT phase ──────────────────────────────────────── */}
      {phase === "result" && lastResult && currentQuestion && (
        <View className="mt-4">
          {/* Show question + answers with correct/wrong highlights */}
          <Text className="text-parchment text-base font-semibold mb-5 leading-7">
            {currentQuestion.text}
          </Text>
          <View className="space-y-3">
            {currentQuestion.choices.map((choice) => {
              const isCorrect = lastResult.correctAnswer === choice.label;
              const isCrewAnswer = lastResult.crewAnswer === choice.label;
              let bg = "bg-ocean-mid border-ocean-light";
              if (isCorrect) bg = "bg-green-900 border-green-500";
              else if (isCrewAnswer && !isCorrect) bg = "bg-red-900 border-red-500";

              return (
                <View key={choice.label} className={`rounded-xl p-4 border ${bg}`}>
                  <Text className="text-parchment">
                    <Text className="font-bold">{choice.label}. </Text>
                    {choice.text}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Result banner — animated */}
          <Animated.View style={[lastResult.isCorrect ? resultSlideStyle : resultShakeStyle]}>
            <View className={`mt-5 rounded-xl p-4 border ${
              lastResult.isCorrect ? "bg-green-900/50 border-green-500/40" : "bg-red-900/50 border-red-500/40"
            }`}>
              <Text className="text-white font-bold text-lg mb-1">
                {lastResult.isCorrect ? "✓ Correct!" : "✗ Wrong!"}
              </Text>
              <Text className="text-parchment text-sm">
                {lastResult.isCorrect
                  ? "The crew found the right clue! +1 step closer to the treasure."
                  : `Not quite... The answer was ${lastResult.correctAnswer}.`}
              </Text>
              <Text className="text-parchment-dark text-xs mt-2">
                Crew voted: <Text className="font-bold">{lastResult.crewAnswer}</Text> · Correct: <Text className="font-bold">{lastResult.correctAnswer}</Text>
              </Text>
            </View>
          </Animated.View>

          {/* Game over state */}
          {lastResult.isGameOver && gameEndData && (
            <View className={`mt-4 rounded-xl p-4 items-center border ${
              gameEndData.correctCount >= 3 ? "bg-green-900/40 border-green-500/40" : "bg-ocean-mid border-ocean-light"
            }`}>
              <Text className="text-gold text-lg font-bold mb-1">
                {gameEndData.correctCount >= 3 ? "Treasure Found!" : "Treasure Lost..."}
              </Text>
              <Text className="text-parchment-dark text-sm">
                {gameEndData.correctCount}/{gameEndData.totalQuestions} clues solved. Heading to results...
              </Text>
            </View>
          )}

          {/* Auto-advance (only if not game over) */}
          {!lastResult.isGameOver && (
            <>
              {isHost && (
                <TouchableOpacity
                  onPress={handleNextQuestion}
                  disabled={nextingQuestion}
                  className="mt-4 bg-gold rounded-xl py-4 items-center"
                >
                  {nextingQuestion
                    ? <ActivityIndicator color="#1a1a2e" />
                    : <Text className="text-ocean-deep font-bold text-base">
                        Next Clue{autoAdvanceCountdown !== null ? ` (${autoAdvanceCountdown}s)` : ""} →
                      </Text>
                  }
                </TouchableOpacity>
              )}
              {!isHost && (
                <AutoAdvanceBar
                  countdown={autoAdvanceCountdown}
                  totalSeconds={AUTO_ADVANCE_RESULT}
                  label="Next clue"
                />
              )}
            </>
          )}
        </View>
      )}

    </ScrollView>
    </SafeAreaView>
  );
}
