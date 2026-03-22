import { create } from "zustand";
import { MultiplayerRoom, ShipHealth, ShipPart } from "@/types";

interface MultiplayerStore {
  room: MultiplayerRoom | null;
  currentQuestion: {
    text: string;
    choices: { label: string; text: string }[];
    audioUrl: string;
  } | null;
  timeRemaining: number;
  hasVoted: boolean;
  myVote: string | null;
  crewVoteCounts: Record<string, number>;
  lastResult: {
    isCorrect: boolean;
    correctAnswer: string;
    crewAnswer: string;
    newShipHealth: ShipHealth;
    partTarget: ShipPart;
  } | null;

  setRoom: (room: MultiplayerRoom) => void;
  setCurrentQuestion: (q: MultiplayerStore["currentQuestion"]) => void;
  setTimeRemaining: (t: number) => void;
  setVote: (vote: string | null) => void;
  setCrewVoteCounts: (counts: Record<string, number>) => void;
  setLastResult: (result: MultiplayerStore["lastResult"]) => void;
  reset: () => void;
}

export const useMultiplayerStore = create<MultiplayerStore>((set) => ({
  room: null,
  currentQuestion: null,
  timeRemaining: 45,
  hasVoted: false,
  myVote: null,
  crewVoteCounts: {},
  lastResult: null,

  setRoom: (room) => set({ room }),
  setCurrentQuestion: (currentQuestion) =>
    set({ currentQuestion, hasVoted: false, myVote: null, crewVoteCounts: {} }),
  setTimeRemaining: (timeRemaining) => set({ timeRemaining }),
  setVote: (vote) => set({ hasVoted: vote !== null, myVote: vote }),
  setCrewVoteCounts: (crewVoteCounts) => set({ crewVoteCounts }),
  setLastResult: (lastResult) => set({ lastResult }),
  reset: () =>
    set({
      room: null,
      currentQuestion: null,
      timeRemaining: 45,
      hasVoted: false,
      myVote: null,
      crewVoteCounts: {},
      lastResult: null,
    }),
}));
