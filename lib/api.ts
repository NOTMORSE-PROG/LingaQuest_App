import { LoginRequest, LoginResponse, GoogleAuthResponse, User, IslandWithPins, IslandProgress, Badge } from "@/types";
import { useAuthStore } from "@/stores/auth";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";

function getToken(): string | null {
  return useAuthStore.getState().token;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if ((err as { name?: string })?.name === "AbortError") {
      throw new Error("Request timed out. Check your connection.");
    }
    throw new Error("Network error. Check your connection.");
  }
  clearTimeout(timeoutId);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const STATUS_MESSAGES: Record<number, string> = {
      401: "Session expired. Please log in again.",
      403: "You don't have permission to do that.",
      404: "Content not found.",
      409: "Action not available right now.",
      500: "Server error. Please try again.",
    };
    if (res.status === 401) {
      // Auto-logout on expired/invalid token — layout guard handles redirect
      useAuthStore.getState().logout();
    }
    throw new Error(body.error ?? STATUS_MESSAGES[res.status] ?? `Something went wrong (${res.status}).`);
  }

  // BUG 4 FIX: guard final res.json() — a 200 with malformed body would otherwise
  // throw an unhandled rejection that silently kills the calling React Query
  return res.json().catch(() => {
    throw new Error("Unexpected server response. Please try again.");
  });
}

export const apiClient = {
  // Auth
  login: (data: LoginRequest) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  googleAuth: (idToken: string) =>
    request<GoogleAuthResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    }),

  // User
  updateUsername: (username: string) =>
    request<User>("/user/profile", {
      method: "PATCH",
      body: JSON.stringify({ username }),
    }),

  completeOnboarding: () =>
    request<{ ok: boolean }>("/user/onboarding", { method: "POST" }),

  checkUsername: (username: string) =>
    request<{ available: boolean }>(`/user/check-username?username=${encodeURIComponent(username)}`),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: boolean }>("/user/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  linkGoogle: (idToken: string) =>
    request<User>("/user/link-google", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    }),

  // Islands
  getIslands: () => request<IslandWithPins[]>("/islands"),
  getIsland: (id: string) => request<IslandWithPins>(`/islands/${id}`),
  getPin: (id: string) => request<IslandWithPins["pins"][number]>(`/islands/pins/${id}`),
  markIngaySeen: (islandId: string) => request<{ ok: boolean }>(`/islands/${islandId}/seen-ingay`, { method: "POST" }),

  // Progress
  getProgress: () => request<IslandProgress[]>("/progress"),
  submitProgress: (data: { pinId: string; accuracy: number }) =>
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

  startRound: (roomId: string) =>
    request("/multiplayer/start-round", {
      method: "POST",
      body: JSON.stringify({ roomId }),
    }),

  submitRepairVote: (roomId: string, part: string) =>
    request<{ ok: boolean }>("/multiplayer/repair-vote", {
      method: "POST",
      body: JSON.stringify({ roomId, part }),
    }),

  nextQuestion: (roomId: string) =>
    request<{ ok: boolean }>("/multiplayer/next-question", {
      method: "POST",
      body: JSON.stringify({ roomId }),
    }),

  questionTimeout: (roomId: string) =>
    request<{ ok: boolean }>("/multiplayer/question-timeout", {
      method: "POST",
      body: JSON.stringify({ roomId }),
    }),

  // Account
  deleteAccount: () => request<{ ok: boolean }>("/user/delete", { method: "DELETE" }),
};
