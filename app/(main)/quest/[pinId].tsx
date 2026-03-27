import { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { AudioPlayer } from "@/components/audio/AudioPlayer";
import { DagatCharacter, DagatState } from "@/components/characters/DagatCharacter";
import { CaptainSalita } from "@/components/characters/CaptainSalita";
import { QuestSceneOverlay } from "@/components/scene/QuestSceneOverlay";
import { ShardClaimCinematic } from "@/components/scene/ShardClaimCinematic";
import { useAuthStore } from "@/stores/auth";
import { MuteButton } from "@/components/audio/MuteButton";
import { useSoundEffect } from "@/hooks/useSoundEffect";
import { Challenge } from "@/types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const LABELS = ["A", "B", "C", "D"] as const;

// Shuffle choices and reassign labels A→D in display order.
// Also updates `answer` so it still points to the correct choice.
function shuffleChallenge(c: Challenge): Challenge {
  const correctChoice = c.choices.find((ch) => ch.label === c.answer);
  const shuffled = shuffle(c.choices); // same object refs, new array
  // Find the correct choice's new position by reference before relabeling
  const shuffledIdx = correctChoice ? shuffled.indexOf(correctChoice) : -1;
  const relabeled = shuffled.map((ch, i) => ({ ...ch, label: LABELS[i] }));
  const newAnswer = shuffledIdx >= 0 ? LABELS[shuffledIdx] : c.answer;
  return { ...c, choices: relabeled, answer: newAnswer };
}

type Phase = "intro" | "listening" | "answering" | "result" | "submitting" | "claimShard" | "pinComplete";

export default function QuestScreen() {
  const { pinId, mode, nextPinId } = useLocalSearchParams<{ pinId: string; mode?: string; nextPinId?: string }>();
  const [isResultMode, setIsResultMode] = useState(mode === "result");
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const characterMode = user?.characterModeEnabled ?? false;
  const { playCorrect, playWrong } = useSoundEffect();

  const [phase, setPhase] = useState<Phase>("intro");
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [selected, setSelected] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [pinScore, setPinScore] = useState(0);
  const [shuffledChallenges, setShuffledChallenges] = useState<Challenge[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Track if pin was already completed when loaded — used to skip shard cinematic on retry
  const wasAlreadyCompleted = useRef(false);

  // Reset all per-pin state when navigating to a different pin.
  // The (main) layout uses a Tabs navigator which REUSES this component instance across
  // router.replace() calls — useState initialises only once on mount, so stale values
  // (especially isResultMode=true) would bleed into the next pin without this reset.
  const prevPinIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (prevPinIdRef.current === undefined) {
      prevPinIdRef.current = pinId;
      return; // initial mount — useState already set correctly
    }
    if (prevPinIdRef.current === pinId) return;
    prevPinIdRef.current = pinId;

    setIsResultMode(mode === "result");
    setPhase("intro");
    setChallengeIndex(0);
    setSelected(null);
    setCorrectCount(0);
    setPinScore(0);
    setShowHint(false);
    setSubmitError(null);
    wasAlreadyCompleted.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinId]);

  const { data: pin, isLoading, isError: isPinError, refetch: refetchPin } = useQuery({
    queryKey: ["pin", pinId],
    queryFn: () => apiClient.getPin(pinId),
  });

  const submitMutation = useMutation({
    mutationFn: (data: { pinId: string; accuracy: number }) =>
      apiClient.submitProgress(data),
    onSuccess: () => {
      setSubmitError(null);
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["island"] });
      queryClient.invalidateQueries({ queryKey: ["islands"] });
      setPhase((prev) => (prev === "submitting" ? "pinComplete" : prev));
    },
    onError: (err: unknown) => {
      setSubmitError(
        err instanceof Error ? err.message : "Progress could not be saved. Please retry."
      );
      setPhase((prev) => (prev === "submitting" ? "pinComplete" : prev));
    },
  });

  // Shuffle challenges and choices once per pin load
  useEffect(() => {
    if (!pin?.challenges?.length) return;
    const shuffled = shuffle(pin.challenges).map(shuffleChallenge);
    setShuffledChallenges(shuffled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin?.id]); // intentional: only re-shuffle when pin changes, not on every challenges reference update

  // Mark if pin was already completed when first loaded (skip shard cinematic on retry)
  useEffect(() => {
    if (pin?.isCompleted) {
      wasAlreadyCompleted.current = true;
    }
  }, [pin?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Result mode: jump straight to score page if pin is already completed
  useEffect(() => {
    if (isResultMode && pin?.isCompleted && pin?.accuracy !== undefined && phase === "intro") {
      setPinScore(pin.accuracy ?? 0);
      setPhase("pinComplete");
    }
  }, [isResultMode, pin?.isCompleted, pin?.accuracy, pin?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Play correct/wrong SFX when result is revealed
  useEffect(() => {
    if (phase !== "result" || selected === null) return;
    if (selected === current?.answer) playCorrect();
    else playWrong();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // 4-second countdown when result is shown — forces student to read explanation
  useEffect(() => {
    if (phase !== "result") return;
    setCountdown(4);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Auto-show hint after 30s of no answer
  useEffect(() => {
    if (phase !== "answering" || selected !== null || showHint) return;
    const timer = setTimeout(() => setShowHint(true), 30000);
    return () => clearTimeout(timer);
  }, [phase, selected, showHint]);

  function confirmExit() {
    const dest = `/(main)/island/${pin?.islandId}` as const;
    if (phase === "intro" || phase === "submitting" || phase === "pinComplete" || phase === "claimShard") {
      router.replace(dest);
      return;
    }
    Alert.alert(
      "Abandon this pin?",
      "Your progress will be lost to the sea.",
      [
        { text: "Stay", style: "cancel" },
        { text: "Exit", style: "destructive", onPress: () => router.replace(dest) },
      ]
    );
  }

  // Must be declared before any early returns — Rules of Hooks
  const handleAudioEnd = useCallback(() => {
    setPhase("answering");
  }, []);

  if (isLoading) {
    return (
      <View className="flex-1 bg-ocean-deep items-center justify-center">
        <ActivityIndicator color="#f5c518" size="large" />
      </View>
    );
  }

  if (isPinError || !pin) {
    return (
      <View className="flex-1 bg-ocean-deep items-center justify-center px-8">
        <Text className="text-5xl mb-4">🌊</Text>
        <Text className="text-gold text-xl font-bold text-center mb-2">The sea is rough</Text>
        <Text className="text-parchment text-sm text-center mb-8">
          Could not load this quest. Check your connection and try again.
        </Text>
        <TouchableOpacity
          onPress={() => refetchPin()}
          className="bg-gold rounded-xl px-8 py-3 mb-4 w-full items-center"
        >
          <Text className="text-ocean-deep font-bold">Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} className="items-center">
          <Text className="text-parchment/60 text-sm">← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const challenges: Challenge[] = shuffledChallenges.length > 0 ? shuffledChallenges : (pin.challenges ?? []);
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

  // Island + pin scene config
  const ISLAND_ACCENT = ["#27ae60","#8e44ad","#3498db","#e74c3c","#e67e22","#1abc9c","#f5c518"];
  const islandNum = pin.island?.number ?? 1;
  const accentColor = ISLAND_ACCENT[islandNum - 1] ?? "#27ae60";
  const islandName = pin.island?.name ?? "";
  const islandSkill = pin.island?.skillFocus ?? "";
  const npcIntro = pin.island?.npcDialogueIntro ?? "Listen carefully, young sailor. The audio plays once. Trust what you hear.";
  const npcFail = pin.island?.npcDialogueFail ?? "Even seasoned sailors mishear. The sea will test you again.";
  const npcAudioFail = (pin.island as any)?.npcAudioFail ?? undefined;
  const npcAudioSuccess = (pin.island as any)?.npcAudioSuccess ?? undefined;
  const pinSortOrder: number = pin.sortOrder;
  const questBg =
    islandNum === 1 ? { backgroundColor: "#0d1e35" } :
    islandNum === 2 ? { backgroundColor: "#0f0a1e" } :
    islandNum === 3 ? { backgroundColor: "#080e1c" } :
    islandNum === 4 ? { backgroundColor: "#140808" } :
    islandNum === 5 ? { backgroundColor: "#160c00" } :
    islandNum === 6 ? { backgroundColor: "#031714" } :
    islandNum === 7 ? { backgroundColor: "#100d00" } :
    {};

  // Island 1 per-pin story intro cards (Dagat's POV moment before each challenge)
  const PIN_STORY_I1: Record<number, string> = {
    1: "On the dock, an old navigator had unrolled his map — but every word was frozen solid. Dagat knelt beside him and listened.",
    2: "Young Mando had failed again. The sailors' laughter hung frozen in the cold air. Dagat waited for the words to break free.",
    3: "Halfway through the frozen dock, Dagat found the notice board. Every announcement, every label, every name — encased in ice. But the harbour master was still calling out to passing ships. Dagat listened for the words that broke through the freeze.",
    4: "A peculiar ship emerged from the fog. Old Kulas squinted — even the ship's name was frozen on its hull, unreadable.",
    5: "The Alingawngaw storm was building. Captain Hana watched the waves. The crew's voices turned to frozen breath.",
  };
  const PIN_STORY_I2: Record<number, string> = {
    1: "The Baybayin had barely anchored when Dagat heard it — every voice on the dock moving at double speed. Ingay had stolen time from this island. Dagat steadied herself and listened.",
    2: "Further into Bilis, the announcements came faster. Sailors flinched at voices they couldn't catch. Dagat pressed her back against a dock post and breathed slowly.",
    3: "The radio tower at the centre of Bilis crackled and hissed. Ingay had wound every broadcast tight — voices rushing past like wind through rigging. A ship's log was being read aloud. The words blurred together. Dagat breathed slowly and reached into the rush for the thread.",
    4: "Deep in Isla ng Bilis now, the blur was worse — words piling on each other, syllables compressed to near-nothing. Dagat could feel Ingay pushing back harder.",
    5: "The Swift Shard pulled at the air around her. One more challenge. Ingay poured everything into this island — but Dagat had learned to breathe slow when everything ran fast.",
  };

  const PIN_STORY_I3: Record<number, string> = {
    1: "The fog of Isla ng Diwa was not like ordinary sea mist. It moved with purpose — it had been sent. Dagat could hear a voice ahead, but the words kept shifting, circling, returning. She focused on what repeated.",
    2: "Deeper into the fog. The voice changed, but the fog held its shape. Dagat noticed that important things came back — spoke twice, then three times. She stopped chasing every detail and waited for what stayed.",
    3: "The fog split into two voices here — one loud, one quiet. Ingay had layered them on purpose. Dagat closed her eyes. The loud voice carried the detail. The quiet one carried the meaning. She waited for the quiet one to speak again.",
    4: "The fog pressed deeper. Dagat moved further in. Here, the details were longer, the misdirections more deliberate. Ingay wanted her lost in the particulars. She held to what the voice kept returning to.",
    5: "The Clarity Shard was close. One more passage to hear through the fog. The mist swirled at its densest — but Dagat had learned: the main idea was never hiding. It was the thing the speaker could not stop saying.",
  };

  const PIN_STORY_I4: Record<number, string> = {
    1: "Isla ng Damdamin had no sound Dagat expected — no clashing steel, no howling wind. Just silence with all the feeling taken out. A navigator's voice reached her, all the words intact, but hollow. She listened past the surface. The worry was still there — hidden in the pauses.",
    2: "The emotional drain went deeper here. Dagat heard a sailor recount a terrible morning that turned kind — but the voice told her nothing of how it felt. She traced the arc of it anyway: from frustration to warmth. The shape of the story carried the feeling.",
    3: "A letter had been posted on the harbour board — an announcement that should have been urgent, or proud, or afraid. Ingay's drain had taken all of it. Dagat read the shape of the words instead. The emotion was still there — pressed flat, but present.",
    4: "Ingay's drain was total now. Even encouragement arrived cold. A captain spoke to a young sailor who had made a mistake — and every note of firmness, every hidden warmth, was invisible. Dagat closed her eyes and listened for what the words were trying to do.",
    5: "The Empathy Shard glowed somewhere in the ash-grey air. One passage left — a handwritten letter, its warmth stripped to nothing by the drain. Dagat took it in her hands and read it aloud herself. The courage between the lines was still there. It was always there.",
  };

  const PIN_STORY_I5: Record<number, string> = {
    1: "Isla ng Tanong felt like stepping into a registry hall mid-storm. Numbers and names flew everywhere, attaching themselves to the wrong facts. Dagat steadied herself at a dock post and listened for the one detail she needed — not the one that floated loudest, but the right one.",
    2: "The scatter was relentless further in. A name would begin to land, then a number would knock it sideways. Dagat learned to lock onto a single anchor word — 'increase', 'maximum', 'first' — and wait for the precise detail that followed it.",
    3: "A crew manifest was being called aloud. Names and numbers, ranks and records — Ingay had scrambled the order. Dagat fixed on one anchor: a name she had heard twice. Everything else she let go. The specific detail she needed was attached to that name. She waited for it to return.",
    4: "Ingay's interference was at full force now. Gallery numbers transposed; pier numbers multiplied. Dagat tuned out every number that arrived before the one she was hunting. One specific fact. That was all she needed.",
    5: "The Precision Shard glittered somewhere beyond the harbormaster's post — sharp-edged, catching light at exact angles. Dagat could feel it cutting through the scatter like a lighthouse beam. One number left to catch. She held her breath and let all the wrong ones float past.",
  };

  const PIN_STORY_I6: Record<number, string> = {
    1: "Isla ng Kwento was an island of broken sentences and unfinished tales. Storytellers stood mid-word, their memories shattered by Ingay's curse. Dagat found she had to gather the fragments — like picking up spilled beads — and thread them back into the shape of a story.",
    2: "Further in, the fragments were wilder — beginnings attached to the wrong endings, middles floating loose. Dagat learned to anchor on the characters. Follow Andoy. Follow Tala. The people carry the story even when the memory breaks.",
    3: "A storyteller sat at the centre of the dock, telling a tale that had no middle. Ingay had taken it. Dagat listened to the beginning and listened to the end — then built the bridge herself. It was not guessing. It was understanding. The story wanted to be whole.",
    4: "The stories arrived heavier now. These weren't just tales — they were memories. A grandfather on a dock. An empty hammock. Dagat held each one carefully, knowing that what people remember — and why — is where the meaning lives.",
    5: "The Story Shard pulsed. One more story to follow. And somewhere in its last words, Dagat heard a name she knew she would need again. Stories, she had learned, do not end. They travel forward.",
  };

  const PIN_STORY_I7: Record<number, string> = {
    1: "Isla ng Alingawngaw hit all at once. Words scrambled. Time blurring. Fog pressing in. Emotions stripped. Facts scattering. Stories mid-shatter. Ingay had saved everything for here — her last stronghold. Dagat stood still at the shore and breathed. Six glowing shards in her satchel. Everything she had learned. She had not come this far to stop listening.",
    2: "Further in, the chaos was deliberate. Ingay wasn't just throwing noise — she was layering every curse at once. Dagat felt the pull to panic. She chose instead to anchor on what she knew: context for unfamiliar words, main idea beneath the noise, tone beneath the silence. One thread at a time.",
    3: "The storm had a pattern. Dagat began to see it — the same sequence of interference, cycling back. Ingay was not random. She was relentless. Dagat matched her rhythm and found the gap — the one moment between gusts where the voice was clear. She listened for that gap.",
    4: "And then she heard a voice she recognised. Old Mang Berto — here, in the heart of Ingay's stronghold — telling a story clear as a lighthouse beam through the storm. The word he named was one she had been living. Dagat listened without moving. Stories, she had learned, do not end. They travel forward.",
    5: "The Echo Shard pulsed — the greatest of them all. It echoed with the sound of every island she had conquered. Dagat placed it with the other six. Six shards. One crystal. Captain Salita stepped forward. He opened his mouth. And for the first time in one hundred years, he spoke.",
  };

  const ISLAND_CARD_LABEL: Record<number, string> = {
    1: "❄  ISLA NG SALITA",
    2: "⚡  ISLA NG BILIS",
    3: "🌫  ISLA NG DIWA",
    4: "🔥  ISLA NG DAMDAMIN",
    5: "🔍  ISLA NG TANONG",
    6: "📜  ISLA NG KWENTO",
    7: "🌪️  ISLA NG ALINGAWNGAW",
  };

  const storyCard =
    islandNum === 1 ? (PIN_STORY_I1[pinSortOrder] ?? null) :
    islandNum === 2 ? (PIN_STORY_I2[pinSortOrder] ?? null) :
    islandNum === 3 ? (PIN_STORY_I3[pinSortOrder] ?? null) :
    islandNum === 4 ? (PIN_STORY_I4[pinSortOrder] ?? null) :
    islandNum === 5 ? (PIN_STORY_I5[pinSortOrder] ?? null) :
    islandNum === 6 ? (PIN_STORY_I6[pinSortOrder] ?? null) :
    islandNum === 7 ? (PIN_STORY_I7[pinSortOrder] ?? null) :
    null;
  const storyCardLabel = ISLAND_CARD_LABEL[islandNum] ?? "";

  const dagatState: DagatState =
    phase === "intro" ? "idle" :
    phase === "listening" ? "listening" :
    phase === "answering" ? "idle" :
    isCorrect ? (isLastChallenge ? "celebrating" : "correct") : "wrong";

  function handleAnswer(choice: "A" | "B" | "C" | "D") {
    setSelected(choice);
    if (choice === current.answer) setCorrectCount((c) => c + 1);
    setPhase("result");
  }

  function handleNext() {
    if (isLastChallenge) {
      // With React 18 batching, correctCount is already committed by the time
      // the user presses Continue (4+ seconds after handleAnswer).
      const accuracy = Math.round((correctCount / challenges.length) * 100);
      setPinScore(accuracy);
      // Submit immediately so progress is saved even if user exits during cinematic
      submitMutation.mutate({ pinId, accuracy });
      // Shard cinematic only fires on the LAST pin of the island (sortOrder 5),
      // and only on first-ever completion — not on retries
      const isLastPin = pin?.sortOrder === 5;
      if (isLastPin && !wasAlreadyCompleted.current) {
        // Cinematic plays while submit happens in background
        setPhase("claimShard");
      } else {
        // Show loading until submit resolves, then onSuccess transitions to pinComplete
        setPhase("submitting");
      }
    } else {
      setChallengeIndex((i) => i + 1);
      setPhase("listening");
      setSelected(null);
      setShowHint(false);
    }
  }

  function handleClaimShard() {
    setPhase("pinComplete");
  }


  return (
    <SafeAreaView className="flex-1 bg-ocean-deep" style={questBg} edges={["top"]}>
      {/* Per-island curse effect overlay */}
      <QuestSceneOverlay islandNumber={islandNum} />
      {phase !== "listening" && <MuteButton />}

    <ScrollView
      contentContainerClassName="px-6 pt-4 pb-8"
      showsVerticalScrollIndicator={false}
      style={{ zIndex: 1 }}
    >
      <TouchableOpacity onPress={confirmExit} className="mb-4">
        <Text className="text-gold text-base">← Exit Quest</Text>
      </TouchableOpacity>

      {/* Challenge progress dots */}
      {challenges.length > 0 && (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {challenges.map((_, i) => (
              <View key={i} style={{
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: i < challengeIndex
                  ? "#f5c518"
                  : i === challengeIndex
                  ? "#f5c518"
                  : "rgba(255,255,255,0.15)",
                borderWidth: i === challengeIndex ? 2 : 0,
                borderColor: "rgba(255,255,255,0.6)",
              }} />
            ))}
          </View>
          <Text style={{ color: "#9ca3af", fontSize: 11 }}>
            {challengeIndex + 1} / {challenges.length}
          </Text>
        </View>
      )}

      {/* Island + Pin Banner */}
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
          {pin?.number != null && (
            <View style={{
              backgroundColor: "rgba(255,255,255,0.07)",
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.15)",
            }}>
              <Text style={{ color: "#e5e7eb", fontSize: 11, fontWeight: "700" }}>
                Pin {pin.number}
              </Text>
            </View>
          )}
          {islandSkill ? (
            <Text style={{ color: "#6b7280", fontSize: 10 }}>{islandSkill}</Text>
          ) : null}
        </View>
      ) : null}

      {/* ========== INTRO ========== */}
      {phase === "intro" && (
        <View className="mt-4">
          {/* Per-pin story card (Island 1) */}
          {storyCard && (
            <View style={{
              backgroundColor:
                islandNum === 2 ? "rgba(13,8,28,0.92)" :
                islandNum === 3 ? "rgba(5,10,20,0.92)" :
                islandNum === 4 ? "rgba(20,6,6,0.92)" :
                islandNum === 5 ? "rgba(18,10,0,0.92)" :
                islandNum === 6 ? "rgba(3,12,10,0.92)" :
                islandNum === 7 ? "rgba(16,13,0,0.92)" :
                "rgba(13,30,53,0.92)",
              borderRadius: 14,
              borderWidth: 1,
              borderColor:
                islandNum === 2 ? "rgba(142,68,173,0.40)" :
                islandNum === 3 ? "rgba(52,152,219,0.35)" :
                islandNum === 4 ? "rgba(231,76,60,0.35)" :
                islandNum === 5 ? "rgba(230,126,34,0.40)" :
                islandNum === 6 ? "rgba(26,188,156,0.35)" :
                islandNum === 7 ? "rgba(245,197,24,0.40)" :
                "rgba(100,200,230,0.35)",
              paddingHorizontal: 18,
              paddingVertical: 14,
              marginBottom: 20,
            }}>
              <Text style={{
                color:
                  islandNum === 2 ? "rgba(180,100,220,0.65)" :
                  islandNum === 3 ? "rgba(100,180,240,0.60)" :
                  islandNum === 4 ? "rgba(220,80,60,0.65)" :
                  islandNum === 5 ? "rgba(230,126,34,0.65)" :
                  islandNum === 6 ? "rgba(26,188,156,0.65)" :
                  islandNum === 7 ? "rgba(245,197,24,0.65)" :
                  "rgba(148,210,240,0.6)",
                fontSize: 10, marginBottom: 6, letterSpacing: 1.2
              }}>
                {storyCardLabel}
              </Text>
              <Text style={{
                color:
                  islandNum === 2 ? "#d7b8f0" :
                  islandNum === 3 ? "#b8d4ee" :
                  islandNum === 4 ? "#f0c4b8" :
                  islandNum === 5 ? "#f5d5a8" :
                  islandNum === 6 ? "#b2ead8" :
                  islandNum === 7 ? "#f5e8a0" :
                  "#c8e6f0",
                fontSize: 13, lineHeight: 21, fontStyle: "italic"
              }}>
                {storyCard}
              </Text>
            </View>
          )}
          <View className="items-center">
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

      {/* ========== SUBMITTING ========== */}
      {phase === "submitting" && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#f5c518" size="large" />
          <Text className="text-parchment-dark text-xs mt-4 tracking-widest uppercase">
            Saving progress…
          </Text>
        </View>
      )}

      {/* ========== PIN COMPLETE ========== */}
      {phase === "pinComplete" && (
        <View className="mt-8 items-center px-2">
          <Text className="text-5xl mb-4">{pinScore === 100 ? "⭐" : "❌"}</Text>
          <Text className="text-gold text-2xl font-bold text-center mb-3">
            {pinScore === 100 ? "Quest Complete!" : "Quest Failed"}
          </Text>
          <View style={{
            paddingHorizontal: 24, paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: pinScore === 100 ? "rgba(21,87,36,0.5)" : "rgba(127,29,29,0.5)",
            borderWidth: 1,
            borderColor: pinScore === 100 ? "#4ade80" : "#ef4444",
            marginBottom: 20,
          }}>
            <Text style={{ color: pinScore === 100 ? "#4ade80" : "#f87171", fontSize: 20, fontWeight: "800", textAlign: "center" }}>
              {pinScore === 100 ? "PASSED" : "FAILED"}
            </Text>
          </View>
          <Text className="text-parchment/60 text-xs text-center mb-6 leading-5">
            {pinScore === 100
              ? "Perfect score! Your best record is saved."
              : "Any wrong answer fails the quest. Try again to pass!"}
          </Text>

          {/* Submission error + manual retry */}
          {submitError && (
            <View className="w-full bg-red-900/50 border border-red-500 rounded-xl p-4 mb-4">
              <Text className="text-red-300 text-sm text-center mb-3">{submitError}</Text>
              <TouchableOpacity
                onPress={() => submitMutation.mutate({ pinId, accuracy: pinScore })}
                className="bg-red-700 rounded-lg py-2 items-center"
              >
                <Text className="text-white font-bold text-sm">Retry Submission</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Try Again */}
          <TouchableOpacity
            onPress={() => {
              setIsResultMode(false);
              setPhase("intro");
              setChallengeIndex(0);
              setSelected(null);
              setCorrectCount(0);
              setPinScore(0);
              setShowHint(false);
              setSubmitError(null);
              if (pin?.challenges?.length) {
                setShuffledChallenges(
                  shuffle(pin.challenges).map(shuffleChallenge)
                );
              }
            }}
            style={{
              borderRadius: 12, paddingVertical: 14, width: "100%",
              alignItems: "center", marginBottom: 10,
              backgroundColor: "transparent",
              borderWidth: 1.5, borderColor: "rgba(245,197,24,0.5)",
            }}
          >
            <Text style={{ color: "#f5c518", fontWeight: "700", fontSize: 16 }}>↺ Try Again</Text>
          </TouchableOpacity>

          {/* Next Quest — shown whenever there is a next pin (pass or fail) */}
          {nextPinId && (
            <TouchableOpacity
              onPress={() => router.replace(`/(main)/quest/${nextPinId}`)}
              disabled={submitMutation.isPending}
              className={`rounded-xl px-10 py-4 w-full items-center mb-3 ${
                submitMutation.isPending ? "bg-gold/40" : "bg-gold"
              }`}
            >
              {submitMutation.isPending ? (
                <ActivityIndicator color="#1a3550" size="small" />
              ) : (
                <Text className="text-ocean-deep font-bold text-lg">Next Quest →</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Return to Island — disabled while saving */}
          <TouchableOpacity
            onPress={() => router.replace(`/(main)/island/${pin.islandId}`)}
            disabled={submitMutation.isPending}
            className={`rounded-xl px-10 py-4 w-full items-center ${
              submitMutation.isPending ? "opacity-40 bg-ocean-light" : "border border-gold"
            }`}
          >
            {submitMutation.isPending ? (
              <ActivityIndicator color="#1a3550" size="small" />
            ) : (
              <Text className="text-parchment font-semibold text-lg">Return to Island</Text>
            )}
          </TouchableOpacity>
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

          {/* Hint — auto-appears after 30s of no answer */}
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
                    dialogue={isCorrect ? current.explanation : npcFail}
                    audioUrl={isCorrect ? (current.explanationAudioUrl ?? undefined) : npcAudioFail}
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
                disabled={countdown > 0}
                className={`rounded-xl py-4 items-center ${countdown > 0 ? "bg-gold/40" : "bg-gold"}`}
              >
                <Text className="text-ocean-deep font-bold text-base">
                  {countdown > 0
                    ? `Read carefully... ${countdown}s`
                    : isLastChallenge ? "Continue →" : "Next Challenge →"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </ScrollView>

    {/* Cinematic shard claim overlay — full-screen, above everything */}
    {phase === "claimShard" && (
      <ShardClaimCinematic
        islandNum={islandNum}
        accentColor={accentColor}
        characterMode={characterMode}
        npcSuccess={pin.island?.npcDialogueSuccess ?? "The shard is yours, sailor. The sea remembers."}
        npcAudioSuccess={npcAudioSuccess}
        onClaim={handleClaimShard}
      />
    )}
    </SafeAreaView>
  );
}
