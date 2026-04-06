import { create } from "zustand";
import { MultiplayerRoom } from "@/types";

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
  questionResults: (boolean | null)[]; // [true, false, null, null, null]

  setRoom: (room: MultiplayerRoom) => void;
  setCurrentQuestion: (q: MultiplayerStore["currentQuestion"]) => void;
  setVote: (vote: string | null) => void;
  setCrewVoteCounts: (counts: Record<string, number>) => void;
  setLastResult: (result: MultiplayerStore["lastResult"]) => void;
  setQuestionIndex: (idx: number) => void;
  addQuestionResult: (isCorrect: boolean) => void;
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
  reset: () => set(defaultState),
}));

export function destroyPusher() {
  const pusher = (global as any).__pusher;
  if (pusher) {
    pusher.disconnect();
    (global as any).__pusher = null;
  }
}
