import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

const MUTE_KEY = "linguaquest_muted";

interface AudioStore {
  isMuted: boolean;
  initialize: () => Promise<void>;
  toggleMute: () => Promise<void>;
}

export const useAudioStore = create<AudioStore>((set, get) => ({
  isMuted: false,

  initialize: async () => {
    try {
      const saved = await SecureStore.getItemAsync(MUTE_KEY);
      if (saved === "1") set({ isMuted: true });
    } catch {
      // ignore — defaults to unmuted
    }
  },

  toggleMute: async () => {
    const next = !get().isMuted;
    set({ isMuted: next });
    try {
      await SecureStore.setItemAsync(MUTE_KEY, next ? "1" : "0");
    } catch {
      // ignore storage failure — in-memory state still flipped
    }
  },
}));
