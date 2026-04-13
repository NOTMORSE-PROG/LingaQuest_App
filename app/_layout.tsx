import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SQLiteProvider } from "expo-sqlite";
import * as SplashScreen from "expo-splash-screen";
import { GoogleSignin } from "@/lib/google-signin";
import { useAuthStore } from "@/stores/auth";
import { useAudioStore } from "@/stores/audio";
import { initDatabase } from "@/lib/local-db";
import { initSyncEngine } from "@/lib/sync-engine";

if (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
  GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID });
} else if (__DEV__) {
  console.warn("[GoogleSignin] EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set — Google sign-in will not work");
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const { initialize } = useAuthStore();
  const { initialize: initAudio } = useAudioStore();

  useEffect(() => {
    async function setup() {
      try {
        await Promise.all([initialize(), initAudio()]);
      } finally {
        SplashScreen.hideAsync();
      }
    }
    setup();

    // Start sync engine listeners (foreground + network recovery triggers)
    const cleanupSync = initSyncEngine();
    return () => cleanupSync();
  }, [initialize, initAudio]);

  return (
    <GestureHandlerRootView className="flex-1">
      <SQLiteProvider databaseName="linguaquest.db" onInit={initDatabase}>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(main)" />
            <Stack.Screen name="(multiplayer)" />
          </Stack>
        </QueryClientProvider>
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}
