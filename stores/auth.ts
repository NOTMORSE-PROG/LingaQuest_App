import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { User } from "@/types";

const TOKEN_KEY = "linguaquest_token";
const USER_KEY = "linguaquest_user";

interface AuthStore {
  token: string | null;
  user: User | null;
  isInitialized: boolean;
  isGuest: boolean;
  initialize: () => Promise<void>;
  setAuth: (token: string, user: User) => Promise<void>;
  updateUser: (partial: Partial<User>) => Promise<void>;
  enterGuestMode: () => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  user: null,
  isInitialized: false,
  isGuest: false,

  initialize: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    const userJson = await SecureStore.getItemAsync(USER_KEY);
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        set({ token, user, isInitialized: true });
      } catch {
        // Corrupted storage — clear and treat as logged out
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(USER_KEY);
        set({ isInitialized: true });
      }
    } else {
      set({ isInitialized: true });
    }
  },

  setAuth: async (token, user) => {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    } catch (err) {
      // Storage failure (full, biometric invalidated) — still update memory so session works
      console.warn("[auth] SecureStore.setItemAsync failed — session will not persist:", err);
    }
    set({ token, user, isGuest: false });
  },

  enterGuestMode: () => {
    set({ isGuest: true, isInitialized: true });
  },

  updateUser: async (partial) => {
    const current = useAuthStore.getState().user;
    if (!current) return;
    const updated = { ...current, ...partial };
    try {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn("[auth] SecureStore.setItemAsync failed — user update will not persist:", err);
    }
    set({ user: updated });
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch {
      // Ignore storage errors on logout — clearing memory state is what matters
    }
    set({ token: null, user: null, isGuest: false });
  },
}));
