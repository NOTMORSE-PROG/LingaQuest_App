import { Redirect } from "expo-router";
import { View, Text, ActivityIndicator } from "react-native";
import { useAuthStore } from "@/stores/auth";

export default function Index() {
  const { token, user, isInitialized } = useAuthStore();

  // Wait for SecureStore to restore session before redirecting
  if (!isInitialized) {
    return (
      <View className="flex-1 bg-ocean-deep items-center justify-center gap-y-2">
        <Text className="text-gold text-3xl font-bold tracking-wide">LinguaQuest</Text>
        <Text className="text-parchment-dark text-sm mb-6">Setting sail…</Text>
        <ActivityIndicator color="#f5c518" size="large" />
      </View>
    );
  }

  if (!token || !user) return <Redirect href="/(auth)/login" />;
  if (!user.isOnboarded) return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(main)/dashboard" />;
}
