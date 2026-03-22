import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import { GoogleSignin } from "@/lib/google-signin";
import { useAuthStore } from "@/stores/auth";

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

  useEffect(() => {
    async function setup() {
      try {
        await initialize();
      } finally {
        SplashScreen.hideAsync();
      }
    }
    setup();
  }, [initialize]);

  return (
    <GestureHandlerRootView className="flex-1">
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(main)" />
          <Stack.Screen name="(multiplayer)" />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
