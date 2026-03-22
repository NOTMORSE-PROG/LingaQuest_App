import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useNetInfo } from "@react-native-community/netinfo";
import { apiClient } from "@/lib/api";
import { useMultiplayerStore } from "@/stores/multiplayer";
import Pusher from "pusher-js";
import { MultiplayerRoom } from "@/types";

const PUSHER_KEY = process.env.EXPO_PUBLIC_PUSHER_KEY ?? "";
const PUSHER_CLUSTER = process.env.EXPO_PUBLIC_PUSHER_CLUSTER ?? "ap1";

export default function LobbyScreen() {
  const netInfo = useNetInfo();
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setRoom } = useMultiplayerStore();

  if (!netInfo.isConnected) {
    return (
      <View className="flex-1 bg-ocean-deep items-center justify-center px-8">
        <Text className="text-6xl mb-6">⚓</Text>
        <Text className="text-gold text-xl font-bold text-center mb-4">
          No Internet Connection
        </Text>
        <Text className="text-parchment text-base text-center mb-8">
          Abandon Ship requires an internet connection. Sail to the Main Quest instead.
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
      const { code, roomId } = await apiClient.createRoom(5);
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
      const { roomId } = await apiClient.joinRoom(roomCode.trim().toUpperCase());
      connectToPusher(roomId, roomCode.trim().toUpperCase());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function connectToPusher(roomId: string, code: string) {
    const pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });
    const channel = pusher.subscribe(`room-${roomId}`);

    channel.bind("room:updated", (room: MultiplayerRoom) => {
      setRoom(room);
    });

    channel.bind("game:start", () => {
      router.replace("/(multiplayer)/game");
    });

    // Store pusher instance for later cleanup (via global ref or context)
    (global as any).__pusher = pusher;
    router.push({ pathname: "/(multiplayer)/game", params: { roomId, code } });
  }

  return (
    <SafeAreaView className="flex-1 bg-ocean-deep" edges={["top"]}>
    <View className="flex-1 px-8 pt-4">
      <TouchableOpacity onPress={() => router.back()} className="mb-8">
        <Text className="text-gold text-base">← Back</Text>
      </TouchableOpacity>

      <Text className="text-gold text-4xl font-bold mb-2">Abandon Ship</Text>
      <Text className="text-parchment-dark text-sm mb-10">
        4–6 sailors. One ship. Will you make it?
      </Text>

      {mode === "menu" && (
        <View className="space-y-4">
          <TouchableOpacity
            onPress={() => setMode("create")}
            className="bg-ocean-light rounded-2xl p-5 border border-gold/30"
          >
            <Text className="text-gold font-bold text-lg">Create Room</Text>
            <Text className="text-parchment-dark text-sm mt-1">
              Be the captain. Share the code with your crew.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMode("join")}
            className="bg-ocean-mid rounded-2xl p-5 border border-ocean-light"
          >
            <Text className="text-parchment font-bold text-lg">Join Room</Text>
            <Text className="text-parchment-dark text-sm mt-1">
              Enter the room code from your captain.
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {mode === "create" && (
        <View>
          <Text className="text-parchment mb-6">
            A room code will be generated. Share it with your crew (4–6 players).
          </Text>
          {error ? <Text className="text-coral mb-4">{error}</Text> : null}
          <TouchableOpacity
            onPress={handleCreateRoom}
            disabled={loading}
            className="bg-gold rounded-xl py-4 items-center"
          >
            {loading ? (
              <ActivityIndicator color="#1a1a2e" />
            ) : (
              <Text className="text-ocean-deep font-bold text-lg">Create Room</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {mode === "join" && (
        <View>
          <TextInput
            className="bg-ocean-mid border border-ocean-light rounded-xl px-4 py-4 text-parchment text-2xl font-bold text-center tracking-widest mb-4"
            placeholder="ROOM CODE"
            placeholderTextColor="#6b7280"
            value={roomCode}
            onChangeText={(t) => setRoomCode(t.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
          />
          {error ? <Text className="text-coral mb-4 text-center">{error}</Text> : null}
          <TouchableOpacity
            onPress={handleJoinRoom}
            disabled={loading}
            className="bg-gold rounded-xl py-4 items-center"
          >
            {loading ? (
              <ActivityIndicator color="#1a1a2e" />
            ) : (
              <Text className="text-ocean-deep font-bold text-lg">Join Crew</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
    </SafeAreaView>
  );
}
