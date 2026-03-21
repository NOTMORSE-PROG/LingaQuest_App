import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/stores/auth";
import { apiClient } from "@/lib/api";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();

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
      // New users go to tutorial, returning users to dashboard
      router.replace(data.user.createdAt ? "/(main)/dashboard" : "/(auth)/tutorial");
    } catch (e: any) {
      setError(e.message ?? "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-ocean-deep"
    >
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
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            className="bg-ocean-mid border border-ocean-light rounded-xl px-4 py-4 text-parchment text-base"
            placeholder="Password"
            placeholderTextColor="#6b7280"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {error ? (
          <Text className="text-coral mt-3 text-sm text-center">{error}</Text>
        ) : null}

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          className="mt-8 w-full bg-gold rounded-xl py-4 items-center"
        >
          {loading ? (
            <ActivityIndicator color="#1a1a2e" />
          ) : (
            <Text className="text-ocean-deep font-bold text-lg">Set Sail</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
