import { Stack } from "expo-router";

export default function MultiplayerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="lobby" />
      <Stack.Screen name="game" />
      <Stack.Screen name="results" />
    </Stack>
  );
}
