import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  type TextInput as TextInputType,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { GoogleSignin, statusCodes } from "@/lib/google-signin";
import { useAuthStore } from "@/stores/auth";
import { apiClient } from "@/lib/api";
import { syncProgress } from "@/lib/sync-engine";

function navigateAfterAuth(isOnboarded: boolean) {
  if (!isOnboarded) {
    router.replace("/(auth)/onboarding");
  } else {
    router.replace("/(main)/dashboard");
  }
}

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const passwordRef = useRef<TextInputType>(null);

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      setError("Please enter your username and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await apiClient.login({ username, password });
      await setAuth(data.token, data.user);
      syncProgress(); // fire-and-forget: push local + pull server data
      navigateAfterAuth(data.user.isOnboarded);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : undefined;
      setError(msg ?? "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError("");
    try {
      await GoogleSignin.hasPlayServices();
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;
      if (!idToken) throw new Error("Google sign-in failed. Please try again.");

      const data = await apiClient.googleAuth(idToken);
      await setAuth(data.token, data.user);
      syncProgress(); // fire-and-forget: push local + pull server data
      navigateAfterAuth(data.user.isOnboarded);
    } catch (e: unknown) {
      const code = (e as any)?.code;
      if (code === statusCodes.SIGN_IN_CANCELLED) return;
      if (code === statusCodes.IN_PROGRESS) return;
      if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError("Google Play Services is required. Please update it and try again.");
        return;
      }
      if (code === statusCodes.DEVELOPER_ERROR) {
        setError("Google Sign-In is not configured for this device. Please use username and password.");
        return;
      }
      const msg = e instanceof Error ? e.message : undefined;
      setError(msg ?? "Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-ocean-deep"
    >
      <SafeAreaView edges={["top", "bottom"]} className="flex-1">
      <View className="flex-1 items-center justify-center px-8">
        {/* Logo / Title */}
        <Text className="text-gold text-5xl font-bold mb-2">⚓ LinguaQuest</Text>
        <Text className="text-parchment text-base mb-12 text-center">
          The Listening Sea awaits, young sailor.
        </Text>

        {/* Form */}
        <View className="w-full space-y-4">
          <TextInput
            className="bg-ocean-mid border border-ocean-light rounded-xl px-4 py-4 text-parchment text-base"
            placeholder="Username"
            placeholderTextColor="#6b7280"
            value={username}
            onChangeText={(v) => { setUsername(v); setError(""); }}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            blurOnSubmit={false}
          />
          <TextInput
            ref={passwordRef}
            className="bg-ocean-mid border border-ocean-light rounded-xl px-4 py-4 text-parchment text-base"
            placeholder="Password"
            placeholderTextColor="#6b7280"
            value={password}
            onChangeText={(v) => { setPassword(v); setError(""); }}
            secureTextEntry
            returnKeyType="go"
            onSubmitEditing={handleLogin}
          />
        </View>

        {error ? (
          <Text className="text-coral mt-3 text-sm text-center">{error}</Text>
        ) : null}

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading || googleLoading}
          className="mt-8 w-full bg-gold rounded-xl py-4 items-center"
        >
          {loading ? (
            <ActivityIndicator color="#1a1a2e" />
          ) : (
            <Text className="text-ocean-deep font-bold text-lg">Set Sail</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View className="flex-row items-center w-full my-6">
          <View className="flex-1 h-px bg-ocean-light" />
          <Text className="text-parchment-dark mx-4 text-sm">or</Text>
          <View className="flex-1 h-px bg-ocean-light" />
        </View>

        {/* Google Sign-In */}
        <TouchableOpacity
          onPress={handleGoogleSignIn}
          disabled={loading || googleLoading}
          className="w-full border border-gold rounded-xl py-4 items-center flex-row justify-center"
        >
          {googleLoading ? (
            <ActivityIndicator color="#f5c518" />
          ) : (
            <>
              <Text className="text-parchment text-base mr-2">G</Text>
              <Text className="text-parchment font-semibold text-base">
                Sign in with Google
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Guest mode — play story offline without login */}
        <View className="mt-6 items-center w-full">
          <View className="flex-row items-center w-full mb-4">
            <View className="flex-1 h-px bg-ocean-light" />
            <Text className="text-parchment-dark mx-4 text-sm">or</Text>
            <View className="flex-1 h-px bg-ocean-light" />
          </View>
          <TouchableOpacity
            onPress={() => {
              useAuthStore.getState().enterGuestMode();
              router.replace("/(main)/dashboard");
            }}
            disabled={loading || googleLoading}
            className="w-full border border-gold/30 rounded-xl py-4 items-center"
          >
            <Text className="text-gold font-bold text-base">Start Adventure</Text>
            <Text className="text-parchment-dark text-xs mt-1">
              Play offline without an account
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
