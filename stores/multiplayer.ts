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
    questionIndex: number;
    isRoundOver: boolean;
    newPartTarget?: ShipPart;
  } | null;
  currentPartTarget: ShipPart | null;
  questionIndex: number;
  repairVoteCounts: Record<string, number>;
  myRepairVote: ShipPart | null;

  setRoom: (room: MultiplayerRoom) => void;
  setCurrentQuestion: (q: MultiplayerStore["currentQuestion"]) => void;
  setTimeRemaining: (t: number) => void;
  setVote: (vote: string | null) => void;
  setCrewVoteCounts: (counts: Record<string, number>) => void;
  setLastResult: (result: MultiplayerStore["lastResult"]) => void;
  setCurrentPartTarget: (part: ShipPart | null) => void;
  setQuestionIndex: (idx: number) => void;
  setRepairVoteCounts: (counts: Record<string, number>) => void;
  setMyRepairVote: (part: ShipPart | null) => void;
  reset: () => void;
}

const defaultState = {
  room: null,
  currentQuestion: null,
  timeRemaining: 45,
  hasVoted: false,
  myVote: null,
  crewVoteCounts: {},
  lastResult: null,
  currentPartTarget: null,
  questionIndex: 0,
  repairVoteCounts: {},
  myRepairVote: null,
};

export const useMultiplayerStore = create<MultiplayerStore>((set) => ({
  ...defaultState,

  setRoom: (room) => set({ room }),
  setCurrentQuestion: (currentQuestion) =>
    set({ currentQuestion, hasVoted: false, myVote: null, crewVoteCounts: {} }),
  setTimeRemaining: (timeRemaining) => set({ timeRemaining }),
  setVote: (vote) => set({ hasVoted: vote !== null, myVote: vote }),
  setCrewVoteCounts: (crewVoteCounts) => set({ crewVoteCounts }),
  setLastResult: (lastResult) => set({ lastResult }),
  setCurrentPartTarget: (currentPartTarget) => set({ currentPartTarget }),
  setQuestionIndex: (questionIndex) => set({ questionIndex }),
  setRepairVoteCounts: (repairVoteCounts) => set({ repairVoteCounts }),
  setMyRepairVote: (myRepairVote) => set({ myRepairVote }),
  reset: () => set(defaultState),
}));
