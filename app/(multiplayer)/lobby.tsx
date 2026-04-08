import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { useNetInfo } from "@react-native-community/netinfo";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { apiClient } from "@/lib/api";
import { useMultiplayerStore, destroyPusher } from "@/stores/multiplayer";
import Pusher from "pusher-js";

const PUSHER_KEY = process.env.EXPO_PUBLIC_PUSHER_KEY ?? "";
const PUSHER_CLUSTER = process.env.EXPO_PUBLIC_PUSHER_CLUSTER ?? "ap1";

export default function LobbyScreen() {
  const netInfo = useNetInfo();
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setRoom, reset } = useMultiplayerStore();

  useFocusEffect(
    useCallback(() => {
      destroyPusher();
      reset();
    }, [reset])
  );

  if (!netInfo.isConnected) {
    return (
      <View className="flex-1 bg-ocean-deep items-center justify-center px-8">
        <Text className="text-6xl mb-6">⚓</Text>
        <Text className="text-gold text-xl font-bold text-center mb-4">
          No Internet Connection
        </Text>
        <Text className="text-parchment text-base text-center mb-8">
          Treasure Hunt requires an internet connection. Sail to the Main Quest instead.
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/(main)/map")}
          className="bg-gold rounded-xl px-8 py-4"
        >
          <Text className="text-ocean-deep font-bold">Go to Main Quest</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function handleCreateRoom() {
    setLoading(true);
    setError("");
    try {
      const { code, roomId, room } = await apiClient.createRoom(1);
      setRoom(room);
      connectToPusher(roomId, code);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinRoom() {
    if (!roomCode.trim()) {
      setError("Enter a room code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { roomId, room } = await apiClient.joinRoom(roomCode.trim().toUpperCase());
      setRoom(room);
      connectToPusher(roomId, roomCode.trim().toUpperCase());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function connectToPusher(roomId: string, code: string) {
    destroyPusher();
    const pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });
    (global as any).__pusher = pusher;
    router.push({ pathname: "/(multiplayer)/game", params: { roomId, code } });
  }

  return (
    <SafeAreaView className="flex-1 bg-ocean-deep" edges={["top"]}>
      <View className="flex-1 px-8 pt-4">
        <TouchableOpacity
          onPress={() => (mode === "menu" ? router.back() : setMode("menu"))}
          className="mb-6"
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text className="text-gold text-base">← Back</Text>
        </TouchableOpacity>

        <Animated.View entering={FadeInDown.duration(360)}>
          <Text style={{ fontSize: 64, marginBottom: 4 }}>🏴‍☠️</Text>
          <Text className="text-gold text-4xl font-bold mb-2">Treasure Hunt</Text>
          <Text className="text-parchment-dark text-sm mb-10">
            1–6 sailors · 5 audio clues · Find the treasure!
          </Text>
        </Animated.View>

        {mode === "menu" && (
          <Animated.View entering={FadeIn.duration(320)} style={{ gap: 16 }}>
            <TouchableOpacity
              onPress={() => setMode("create")}
              accessibilityRole="button"
              accessibilityLabel="Create room"
              activeOpacity={0.85}
              style={{
                backgroundColor: "#0f3460",
                borderRadius: 20,
                padding: 20,
                borderWidth: 1.5,
                borderColor: "rgba(245,197,24,0.4)",
                shadowColor: "#f5c518",
                shadowOpacity: 0.25,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: 4,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 32, marginRight: 14 }}>⚓</Text>
                <View style={{ flex: 1 }}>
                  <Text className="text-gold font-bold text-lg">Create Room</Text>
                  <Text className="text-parchment-dark text-sm mt-1">
                    Be the captain. Share the code with your crew.
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMode("join")}
              accessibilityRole="button"
              accessibilityLabel="Join room"
              activeOpacity={0.85}
              style={{
                backgroundColor: "#16213e",
                borderRadius: 20,
                padding: 20,
                borderWidth: 1.5,
                borderColor: "#0f3460",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 32, marginRight: 14 }}>🧭</Text>
                <View style={{ flex: 1 }}>
                  <Text className="text-parchment font-bold text-lg">Join Room</Text>
                  <Text className="text-parchment-dark text-sm mt-1">
                    Enter the room code from your captain.
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {mode === "create" && (
          <Animated.View entering={FadeIn.duration(280)}>
            <View
              style={{
                backgroundColor: "rgba(244,228,193,0.06)",
                borderColor: "rgba(245,197,24,0.3)",
                borderWidth: 1,
                borderRadius: 16,
                padding: 18,
                marginBottom: 24,
              }}
            >
              <Text className="text-parchment leading-6">
                A room code will be generated. Share it with your crew, then solve 5 audio clues to find the treasure!
              </Text>
            </View>

            {error ? <Text className="text-coral mb-4">{error}</Text> : null}
            <TouchableOpacity
              onPress={handleCreateRoom}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Create room"
              style={{
                backgroundColor: "#f5c518",
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: "center",
                shadowColor: "#f5c518",
                shadowOpacity: 0.5,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: 6,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#1a1a2e" />
              ) : (
                <Text style={{ color: "#1a1a2e", fontWeight: "900", fontSize: 18 }}>
                  ⚓  Create Room
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}

        {mode === "join" && (
          <Animated.View entering={FadeIn.duration(280)}>
            <Text className="text-parchment-dark text-sm text-center mb-3">
              Enter the 6-character code from your captain
            </Text>
            <TextInput
              accessibilityLabel="Room code"
              style={{
                backgroundColor: "#16213e",
                borderColor: "rgba(245,197,24,0.4)",
                borderWidth: 2,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 18,
                color: "#f5c518",
                fontSize: 32,
                fontWeight: "900",
                textAlign: "center",
                letterSpacing: 8,
                marginBottom: 18,
              }}
              placeholder="ABC123"
              placeholderTextColor="rgba(244,228,193,0.25)"
              value={roomCode}
              onChangeText={(t) => setRoomCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
            />
            {error ? <Text className="text-coral mb-4 text-center">{error}</Text> : null}
            <TouchableOpacity
              onPress={handleJoinRoom}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Join crew"
              style={{
                backgroundColor: "#f5c518",
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: "center",
                shadowColor: "#f5c518",
                shadowOpacity: 0.5,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: 6,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#1a1a2e" />
              ) : (
                <Text style={{ color: "#1a1a2e", fontWeight: "900", fontSize: 18 }}>
                  🧭  Join Crew
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}
