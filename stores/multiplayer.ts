import { create } from "zustand";
import { MultiplayerRoom, ChatMessage } from "@/types";

interface MultiplayerStore {
  room: MultiplayerRoom | null;
  currentQuestion: {
    text: string;
    choices: { label: string; text: string }[];
    audioUrl: string;
  } | null;
  hasVoted: boolean;
  myVote: string | null;
  crewVoteCounts: Record<string, number>;
  lastResult: {
    isCorrect: boolean;
    correctAnswer: string;
    crewAnswer: string;
    questionIndex: number;
    isGameOver: boolean;
  } | null;
  questionIndex: number;
  correctCount: number;
  questionResults: (boolean | null)[];

  // Chat
  messages: ChatMessage[];
  unreadCount: number;
  chatOpen: boolean;

  setRoom: (room: MultiplayerRoom) => void;
  setCurrentQuestion: (q: MultiplayerStore["currentQuestion"]) => void;
  setVote: (vote: string | null) => void;
  setCrewVoteCounts: (counts: Record<string, number>) => void;
  setLastResult: (result: MultiplayerStore["lastResult"]) => void;
  setQuestionIndex: (idx: number) => void;
  addQuestionResult: (isCorrect: boolean) => void;

  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  replaceMessage: (tempId: string, message: ChatMessage) => void;
  markMessageFailed: (tempId: string) => void;
  clearMessages: () => void;
  setChatOpen: (open: boolean) => void;

  reset: () => void;
}

const defaultState = {
  room: null,
  currentQuestion: null,
  hasVoted: false,
  myVote: null,
  crewVoteCounts: {},
  lastResult: null,
  questionIndex: 0,
  correctCount: 0,
  questionResults: [null, null, null, null, null] as (boolean | null)[],
  messages: [] as ChatMessage[],
  unreadCount: 0,
  chatOpen: false,
};

export const useMultiplayerStore = create<MultiplayerStore>((set) => ({
  ...defaultState,

  setRoom: (room) => set({ room }),
  setCurrentQuestion: (currentQuestion) =>
    set({ currentQuestion, hasVoted: false, myVote: null, crewVoteCounts: {} }),
  setVote: (vote) => set({ hasVoted: vote !== null, myVote: vote }),
  setCrewVoteCounts: (update) => set((state) => ({
    crewVoteCounts: { ...state.crewVoteCounts, ...update },
  })),
  setLastResult: (lastResult) => set({ lastResult }),
  setQuestionIndex: (questionIndex) => set({ questionIndex }),
  addQuestionResult: (isCorrect) =>
    set((state) => {
      if (state.questionIndex < 0 || state.questionIndex >= state.questionResults.length) {
        return state;
      }
      const results = [...state.questionResults];
      results[state.questionIndex] = isCorrect;
      return {
        questionResults: results,
        correctCount: results.filter((r) => r === true).length,
      };
    }),

  setMessages: (messages) => set({ messages, unreadCount: 0 }),
  addMessage: (message) =>
    set((state) => {
      // Dedupe by server id — either we already added it, or we already
      // confirmed an optimistic message and tagged it with this serverId.
      if (
        state.messages.some(
          (m) => m.id === message.id || m.serverId === message.id
        )
      ) {
        return state;
      }

      // If we have an optimistic temp from this user with the same text, swap
      // it IN PLACE — but preserve the temp's local id so the FlatList key
      // stays stable and the row does not remount/flicker. The real server id
      // is recorded in `serverId` for future dedupe.
      const tempIdx = state.messages.findIndex(
        (m) =>
          m.pending &&
          m.userId === message.userId &&
          m.text === message.text
      );
      if (tempIdx !== -1) {
        const next = [...state.messages];
        const existing = next[tempIdx];
        next[tempIdx] = {
          ...existing,
          ...message,
          id: existing.id,
          serverId: message.id,
          pending: false,
          failed: false,
        };
        return { messages: next };
      }

      return {
        messages: [...state.messages, message],
        unreadCount: state.chatOpen ? 0 : state.unreadCount + 1,
      };
    }),
  replaceMessage: (tempId, message) =>
    set((state) => {
      // If Pusher already delivered the real message (raced ahead of the POST
      // response), it's already in state — drop the temp.
      const alreadyHasReal = state.messages.some(
        (m) => m.id === message.id || m.serverId === message.id
      );
      if (alreadyHasReal) {
        return { messages: state.messages.filter((m) => m.id !== tempId) };
      }
      // Otherwise: preserve the temp's local id so the React key stays stable,
      // and tag it with the real server id for future Pusher dedupe.
      return {
        messages: state.messages.map((m) =>
          m.id === tempId
            ? {
                ...m,
                ...message,
                id: m.id,
                serverId: message.id,
                pending: false,
                failed: false,
              }
            : m
        ),
      };
    }),
  markMessageFailed: (tempId) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === tempId ? { ...m, pending: false, failed: true } : m
      ),
    })),
  clearMessages: () => set({ messages: [], unreadCount: 0, chatOpen: false }),
  setChatOpen: (chatOpen) =>
    set((state) => ({
      chatOpen,
      unreadCount: chatOpen ? 0 : state.unreadCount,
    })),

  reset: () => set(defaultState),
}));

export function destroyPusher() {
  const pusher = (global as any).__pusher;
  if (pusher) {
    pusher.disconnect();
    (global as any).__pusher = null;
  }
}
