import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { User } from "@linguaquest/shared";

const TOKEN_KEY = "linguaquest_token";
const USER_KEY = "linguaquest_user";

interface AuthStore {
  token: string | null;
  user: User | null;
  initialize: () => Promise<void>;
  setAuth: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  user: null,

  initialize: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    const userJson = await SecureStore.getItemAsync(USER_KEY);
    if (token && userJson) {
      set({ token, user: JSON.parse(userJson) });
    }
  },

  setAuth: async (token, user) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ token, user });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    set({ token: null, user: null });
  },
}));
