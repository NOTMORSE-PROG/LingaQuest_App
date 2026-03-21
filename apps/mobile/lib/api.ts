import * as SecureStore from "expo-secure-store";
import { LoginRequest, LoginResponse, IslandWithPins, IslandProgress, Badge } from "@linguaquest/shared";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync("linguaquest_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }

  return res.json();
}

export const apiClient = {
  // Auth
  login: (data: LoginRequest) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Islands
  getIslands: () => request<IslandWithPins[]>("/islands"),
  getIsland: (id: string) => request<IslandWithPins>(`/islands/${id}`),
  getPin: (id: string) => request<IslandWithPins["pins"][number]>(`/islands/pins/${id}`),

  // Progress
  getProgress: () => request<IslandProgress[]>("/progress"),
  submitProgress: (data: { pinId: string; answer: string; hintsUsed: number; accuracy: number }) =>
    request("/progress", { method: "POST", body: JSON.stringify(data) }),

  // Badges
  getBadges: () => request<Badge[]>("/badges"),

  // Multiplayer
  createRoom: (roundCount: number) =>
    request<{ code: string; roomId: string }>("/multiplayer/rooms", {
      method: "POST",
      body: JSON.stringify({ roundCount }),
    }),
  joinRoom: (code: string) =>
    request<{ roomId: string }>("/multiplayer/rooms/join", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
  submitVote: (roomId: string, answer: string) =>
    request("/multiplayer/vote", {
      method: "POST",
      body: JSON.stringify({ roomId, answer }),
    }),
};
