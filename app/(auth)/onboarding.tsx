import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/auth";
import { apiClient } from "@/lib/api";
import { DagatCharacter } from "@/components/characters/DagatCharacter";
import { CaptainSalita } from "@/components/characters/CaptainSalita";

const TOTAL_STEPS = 4;

export default function OnboardingScreen() {
  const { user, updateUser } = useAuthStore();

  // Step 1 — username
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState(user?.username ?? "");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [checkUsernameError, setCheckUsernameError] = useState("");
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (checkTimer.current) clearTimeout(checkTimer.current);
    };
  }, []);

  // Final step loading
  const [completing, setCompleting] = useState(false);

  function onUsernameChange(val: string) {
    setUsername(val);
    setUsernameAvailable(null);
    setCheckUsernameError("");

    const trimmed = val.trim();

    // Show format error immediately so user knows why
    if (trimmed.length > 0 && !/^[a-zA-Z0-9_ ]*$/.test(trimmed)) {
      setUsernameError("Only letters, numbers, spaces, and underscores are allowed.");
      if (checkTimer.current) clearTimeout(checkTimer.current);
      return;
    }
    setUsernameError("");

    if (checkTimer.current) clearTimeout(checkTimer.current);
    if (trimmed.length < 3) return;

    checkTimer.current = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const result = await apiClient.checkUsername(trimmed);
        setUsernameAvailable(result.available || trimmed === user?.username);
      } catch {
        setUsernameAvailable(null);
        setCheckUsernameError("Could not verify name. Check your connection.");
      } finally {
        setCheckingUsername(false);
      }
    }, 500);
  }

  async function handleSaveUsername() {
    const trimmed = username.trim();
    if (trimmed.length < 3) {
      setUsernameError("Name needs at least 3 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_ ]+$/.test(trimmed)) {
      setUsernameError("Only letters, numbers, spaces, and underscores are allowed.");
      return;
    }
    if (usernameAvailable === false) {
      setUsernameError("That name is taken. Try another.");
      return;
    }
    setSavingUsername(true);
    setUsernameError("");
    try {
      if (trimmed !== user?.username) {
        const updated = await apiClient.updateUsername(trimmed);
        await updateUser({ username: updated.username });
      }
      setStep(2);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : undefined;
      setUsernameError(msg ?? "Could not save username.");
    } finally {
      setSavingUsername(false);
    }
  }

  async function handleComplete() {
    setCompleting(true);
    try {
      await apiClient.completeOnboarding();
      await updateUser({ isOnboarded: true });
      router.replace("/(main)/dashboard");
    } catch {
      setCompleting(false);
      Alert.alert("Something went wrong", "Could not complete setup. Please try again.");
    }
  }

  function skipToEnd() {
    setStep(TOTAL_STEPS);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-ocean-deep"
    >
      <SafeAreaView edges={["top", "bottom"]} className="flex-1">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 items-center justify-center px-8 py-12">

          {/* Step dots */}
          <View className="flex-row space-x-2 mb-10">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View
                key={i}
                className={`w-2 h-2 rounded-full ${i + 1 === step ? "bg-gold" : i + 1 < step ? "bg-gold opacity-50" : "bg-ocean-light"}`}
              />
            ))}
          </View>

          {/* ── STEP 1: Pick Sailor Name ── */}
          {step === 1 && (
            <View className="w-full items-center">
              <DagatCharacter state="idle" size={160} />
              <Text className="text-gold text-2xl font-bold text-center mt-6 mb-2">
                What should your crew call you?
              </Text>
              <Text className="text-parchment-dark text-sm text-center mb-6">
                Choose your sailor name — you can always change it later.
              </Text>

              <View className="w-full relative">
                <TextInput
                  className="bg-ocean-mid border border-ocean-light rounded-xl px-4 py-4 text-parchment text-base pr-10"
                  placeholder="Sailor name"
                  placeholderTextColor="#6b7280"
                  value={username}
                  onChangeText={onUsernameChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={20}
                  returnKeyType="done"
                  onSubmitEditing={handleSaveUsername}
                />
                {checkingUsername && (
                  <ActivityIndicator
                    color="#f5c518"
                    size="small"
                    style={{ position: "absolute", right: 14, top: 16 }}
                  />
                )}
                {!checkingUsername && usernameAvailable === true && (
                  <Text style={{ position: "absolute", right: 14, top: 14, fontSize: 20, color: "#22c55e" }}>✓</Text>
                )}
                {!checkingUsername && usernameAvailable === false && (
                  <Text style={{ position: "absolute", right: 14, top: 14, fontSize: 20, color: "#ef4444" }}>✗</Text>
                )}
              </View>

              <Text className="text-parchment-dark text-xs text-center mt-2">
                Letters, numbers, spaces, and underscores · 3–20 characters
              </Text>

              {usernameError ? (
                <Text className="text-coral mt-1 text-sm text-center">{usernameError}</Text>
              ) : null}
              {!usernameError && checkUsernameError ? (
                <Text className="text-parchment-dark mt-1 text-xs text-center">{checkUsernameError}</Text>
              ) : null}

              <TouchableOpacity
                onPress={handleSaveUsername}
                disabled={savingUsername || checkingUsername || usernameAvailable === false}
                className={`mt-6 w-full rounded-xl py-4 items-center ${usernameAvailable === false ? "bg-ocean-light" : "bg-gold"}`}
              >
                {savingUsername ? (
                  <ActivityIndicator color="#1a1a2e" />
                ) : (
                  <Text className="text-ocean-deep font-bold text-lg">Looks good!</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 2: Meet the Crew ── */}
          {step === 2 && (
            <View className="w-full items-center relative">
              <DagatCharacter state="celebrating" size={180} />
              <Text className="text-gold text-2xl font-bold text-center mt-6 mb-4">
                You are Dagat.
              </Text>
              <Text className="text-parchment text-base text-center leading-7 mb-8">
                A brave pirate apprentice. Captain Salita needs your ears — her voice was stolen by Ingay, the spirit of noise. Sail the Listening Sea. Recover the 7 shards.
              </Text>
              <View className="absolute bottom-0 right-0 opacity-80">
                <CaptainSalita state="pointing" size={100} />
              </View>
              <View className="flex-row w-full mt-4">
                <TouchableOpacity onPress={skipToEnd} className="flex-1 py-4 items-center">
                  <Text className="text-parchment text-base underline opacity-70">Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setStep(3)}
                  className="flex-2 flex-1 bg-gold rounded-xl py-4 items-center ml-3"
                >
                  <Text className="text-ocean-deep font-bold text-lg">Next</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── STEP 3: The One Rule ── */}
          {step === 3 && (
            <View className="w-full items-center">
              <Text className="text-7xl mb-6">👂</Text>
              <Text className="text-gold text-2xl font-bold text-center mb-4">
                Audio plays once.
              </Text>
              <Text className="text-parchment text-base text-center leading-7 mb-12">
                No pause. No replay. That's the challenge.{"\n\n"}Trust what you heard. A sharp ear is built through pressure — not comfort.
              </Text>
              <View className="flex-row w-full">
                <TouchableOpacity onPress={skipToEnd} className="flex-1 py-4 items-center">
                  <Text className="text-parchment text-base underline opacity-70">Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setStep(4)}
                  className="flex-2 flex-1 bg-gold rounded-xl py-4 items-center ml-3"
                >
                  <Text className="text-ocean-deep font-bold text-lg">Next</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── STEP 4: Earn Badges ── */}
          {step === 4 && (
            <View className="w-full items-center">
              <Text className="text-7xl mb-6">🏅</Text>
              <Text className="text-gold text-2xl font-bold text-center mb-4">
                Sail. Listen. Grow.
              </Text>
              <Text className="text-parchment text-base text-center leading-7 mb-12">
                Complete islands, earn badges, save the Alingawngaw.{"\n\n"}No scores — just progress.
              </Text>
              <TouchableOpacity
                onPress={handleComplete}
                disabled={completing}
                className="w-full bg-gold rounded-xl py-4 items-center"
              >
                {completing ? (
                  <ActivityIndicator color="#1a1a2e" />
                ) : (
                  <Text className="text-ocean-deep font-bold text-lg">Begin the Quest</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

        </View>
      </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
