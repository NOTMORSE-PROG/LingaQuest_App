import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import Pusher from "pusher-js";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";
import { useMultiplayerStore, destroyPusher } from "@/stores/multiplayer";
import { useAuthStore } from "@/stores/auth";
import { apiClient } from "@/lib/api";
import { AudioPlayer } from "@/components/audio/AudioPlayer";
import { TreasureMap } from "@/components/multiplayer/TreasureMap";
import { CrewChat } from "@/components/multiplayer/CrewChat";
import { RoundQuestionEvent, VoteUpdateEvent, RoundResultEvent, GameEndEvent, ChatMessage } from "@/types";

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
    addMessage,
    setMessages,
    reset,
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

  // Keep latest roomId in a ref so the unmount cleanup can read it without re-running.
  const roomIdRef = useRef<string | null>(null);
  roomIdRef.current = roomId ?? null;

  // When the user leaves the game screen: notify the server so other players are
  // updated (host transfers if needed), then disconnect Pusher and reset local state.
  useEffect(() => {
    return () => {
      const id = roomIdRef.current;
      if (id) {
        // Fire-and-forget — the component is unmounting, we can't await.
        apiClient.leaveRoom(id).catch(() => {});
      }
      destroyPusher();
      reset();
    };
  }, [reset]);

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

    channel.bind("chat:message", (data: ChatMessage) => {
      addMessage(data);
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
      // Refetch chat history on reconnect so we don't miss messages sent while offline
      apiClient
        .getChat(roomId, 50)
        .then(({ messages }) => setMessages(messages))
        .catch(() => {});
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
        <Animated.View entering={FadeIn.duration(360)} className="items-center mt-8">
          <Text style={{ fontSize: 64, marginBottom: 8 }}>🗺️</Text>
          <Text className="text-gold text-2xl font-bold mb-1">Treasure Hunt</Text>
          <Text className="text-parchment-dark text-xs mb-5">
            Solve 5 audio clues to find the treasure!
          </Text>

          {/* Room code card */}
          <View
            style={{
              backgroundColor: "rgba(244,228,193,0.08)",
              borderColor: "#f5c518",
              borderWidth: 1.5,
              borderRadius: 16,
              paddingVertical: 14,
              paddingHorizontal: 28,
              marginBottom: 18,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "rgba(244,228,193,0.7)", fontSize: 11, fontWeight: "700", letterSpacing: 1.2 }}>
              ROOM CODE
            </Text>
            <Text
              style={{
                color: "#f5c518",
                fontSize: 32,
                fontWeight: "900",
                letterSpacing: 6,
                marginTop: 4,
              }}
            >
              {code}
            </Text>
          </View>

          {/* Player avatar grid */}
          <View className="w-full bg-ocean-mid rounded-2xl p-4 border border-gold/30 mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-gold text-xs font-bold tracking-widest">CREW ABOARD</Text>
              <Text className="text-parchment-dark text-xs">
                {playerCount} sailor{playerCount !== 1 ? "s" : ""}
              </Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {room?.players?.map((player) => {
                const isMe = player.userId === user?.id;
                const isCaptain = player.userId === room?.hostId;
                const hash = player.userId.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0);
                const palette = ["#f5c518", "#e94560", "#22c55e", "#3b82f6", "#a855f7", "#fb923c"];
                const color = palette[Math.abs(hash) % palette.length];
                const safeName = (player.username ?? "Sailor").slice(0, 18);
                return (
                  <View
                    key={player.userId}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#0f3460",
                      borderColor: isMe ? "#f5c518" : "rgba(245,197,24,0.15)",
                      borderWidth: 1.5,
                      borderRadius: 22,
                      paddingLeft: 4,
                      paddingRight: 12,
                      paddingVertical: 4,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: color,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 8,
                      }}
                    >
                      <Text style={{ color: "#1a1a2e", fontWeight: "800", fontSize: 14 }}>
                        {(safeName[0] ?? "?").toUpperCase()}
                      </Text>
                    </View>
                    <Text style={{ color: "#f4e4c1", fontSize: 13, fontWeight: "600" }}>
                      {safeName}{isMe ? " (You)" : ""}
                    </Text>
                    {isCaptain && (
                      <Text style={{ marginLeft: 6, fontSize: 13 }}>👑</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {isHost && (
            <TouchableOpacity
              onPress={handleStartGame}
              disabled={startingGame}
              accessibilityRole="button"
              accessibilityLabel="Begin treasure hunt"
              style={{
                backgroundColor: "#f5c518",
                borderRadius: 16,
                paddingVertical: 16,
                paddingHorizontal: 32,
                alignItems: "center",
                width: "100%",
                shadowColor: "#f5c518",
                shadowOpacity: 0.5,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: 6,
              }}
            >
              {startingGame
                ? <ActivityIndicator color="#1a1a2e" />
                : <Text style={{ color: "#1a1a2e", fontWeight: "900", fontSize: 18, letterSpacing: 0.5 }}>⚓  Begin Treasure Hunt</Text>
              }
            </TouchableOpacity>
          )}
          {!isHost && (
            <View className="items-center mt-2">
              <Text className="text-parchment-dark text-sm italic">Waiting for captain to start...</Text>
              <Text className="text-parchment-dark text-xs mt-1">💡 Tip: open Crew Chat to talk while you wait</Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* ── GET READY phase ───────────────────────────────────── */}
      {phase === "get-ready" && (
        <Animated.View entering={FadeIn.duration(280)} className="items-center mt-10">
          <Text className="text-5xl mb-3">🧭</Text>
          <Text className="text-gold text-xl font-bold mb-6">Get ready, sailors!</Text>
          <Animated.Text
            key={getReadyCount}
            entering={FadeIn.duration(220)}
            className="text-parchment font-bold mb-4"
            style={{ fontSize: 96, lineHeight: 110, textShadowColor: "rgba(245,197,24,0.5)", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 18 }}
          >
            {getReadyCount}
          </Animated.Text>
          <Text className="text-parchment-dark text-sm">Listen carefully — audio plays once.</Text>
          <QuestionDots results={questionResults} currentIndex={questionIndex} />
        </Animated.View>
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
        <Animated.View entering={FadeInDown.duration(320).springify().damping(14)} className="mt-4">
          <View className="bg-ocean-mid/60 rounded-2xl px-4 py-4 border border-gold/25 mb-5">
            <Text className="text-parchment text-base font-semibold leading-7">
              {currentQuestion.text}
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            {currentQuestion.choices.map((choice, idx) => {
              const isMyVote = myVote === choice.label;
              return (
                <Animated.View
                  key={choice.label}
                  entering={FadeInDown.delay(80 * idx).duration(280)}
                >
                  <TouchableOpacity
                    onPress={() => handleVote(choice.label)}
                    disabled={hasVoted}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`Answer ${choice.label}: ${choice.text}`}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: isMyVote ? "rgba(245,197,24,0.15)" : "#16213e",
                      borderColor: isMyVote ? "#f5c518" : "#0f3460",
                      borderWidth: 2,
                      borderRadius: 16,
                      padding: 14,
                      shadowColor: isMyVote ? "#f5c518" : "transparent",
                      shadowOpacity: isMyVote ? 0.4 : 0,
                      shadowRadius: 8,
                      elevation: isMyVote ? 4 : 0,
                    }}
                  >
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 21,
                        backgroundColor: isMyVote ? "#f5c518" : "rgba(245,197,24,0.18)",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 14,
                      }}
                    >
                      <Text
                        style={{
                          color: isMyVote ? "#1a1a2e" : "#f5c518",
                          fontWeight: "800",
                          fontSize: 18,
                        }}
                      >
                        {choice.label}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#f4e4c1", fontSize: 15, lineHeight: 21, fontWeight: "500" }}>
                        {choice.text}
                      </Text>
                      {isMyVote && (
                        <Text style={{ color: "#f5c518", fontSize: 11, marginTop: 4, fontWeight: "700" }}>
                          ✓ Your vote
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
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
        </Animated.View>
      )}

      {/* ── RESULT phase ──────────────────────────────────────── */}
      {phase === "result" && lastResult && currentQuestion && (
        <View className="mt-4">
          {/* Show question + answers with correct/wrong highlights */}
          <View className="bg-ocean-mid/60 rounded-2xl px-4 py-4 border border-gold/25 mb-5">
            <Text className="text-parchment text-base font-semibold leading-7">
              {currentQuestion.text}
            </Text>
          </View>
          <View style={{ gap: 12 }}>
            {currentQuestion.choices.map((choice) => {
              const isCorrect = lastResult.correctAnswer === choice.label;
              const isCrewAnswer = lastResult.crewAnswer === choice.label;
              let bg = "#16213e";
              let border = "#0f3460";
              let badgeBg = "rgba(245,197,24,0.18)";
              let badgeColor = "#f5c518";
              if (isCorrect) {
                bg = "rgba(34,197,94,0.18)";
                border = "#22c55e";
                badgeBg = "#22c55e";
                badgeColor = "#052e16";
              } else if (isCrewAnswer && !isCorrect) {
                bg = "rgba(239,68,68,0.18)";
                border = "#ef4444";
                badgeBg = "#ef4444";
                badgeColor = "#450a0a";
              }

              return (
                <View
                  key={choice.label}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: bg,
                    borderColor: border,
                    borderWidth: 2,
                    borderRadius: 16,
                    padding: 14,
                  }}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      backgroundColor: badgeBg,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 14,
                    }}
                  >
                    <Text style={{ color: badgeColor, fontWeight: "800", fontSize: 18 }}>
                      {isCorrect ? "✓" : isCrewAnswer ? "✗" : choice.label}
                    </Text>
                  </View>
                  <Text style={{ flex: 1, color: "#f4e4c1", fontSize: 15, lineHeight: 21, fontWeight: "500" }}>
                    {choice.text}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Result banner — animated */}
          <Animated.View style={[lastResult.isCorrect ? resultSlideStyle : resultShakeStyle]}>
            <View
              style={{
                marginTop: 20,
                borderRadius: 16,
                padding: 18,
                borderWidth: 2,
                backgroundColor: lastResult.isCorrect ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)",
                borderColor: lastResult.isCorrect ? "#22c55e" : "#ef4444",
                shadowColor: lastResult.isCorrect ? "#22c55e" : "#ef4444",
                shadowOpacity: 0.5,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 0 },
                elevation: 6,
              }}
            >
              <Text style={{ fontSize: 22, fontWeight: "800", color: lastResult.isCorrect ? "#86efac" : "#fca5a5", marginBottom: 4 }}>
                {lastResult.isCorrect ? "✨ Correct!" : "✗ Wrong!"}
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

    {/* Crew chat overlay — floating button + drawer */}
    <CrewChat roomId={roomId} />
    </SafeAreaView>
  );
}
