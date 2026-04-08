export type ShipPart = "hull" | "mast" | "sails" | "anchor" | "rudder";
export type RoomStatus = "waiting" | "active" | "finished";

export interface ShipHealth {
  hull: number;
  mast: number;
  sails: number;
  anchor: number;
  rudder: number;
}

export interface MultiplayerRoom {
  id: string;
  code: string;
  hostId: string;
  status: RoomStatus;
  roundCount: number;
  currentRound: number;
  currentQuestion: number;
  currentPartTarget: ShipPart | null;
  shipHealth: ShipHealth;
  players: RoomPlayer[];
}

export interface RoomPlayer {
  userId: string;
  username: string;
  joinedAt: string;
}

// Pusher event payloads — Treasure Hunt

export interface RoundQuestionEvent {
  round: number;
  questionIndex: number;
  totalQuestions: number;
  audioUrl: string;
  question: string;
  choices: { label: string; text: string }[];
  challengeId: string;
}

export interface VoteUpdateEvent {
  userId: string;
  hasVoted: boolean;
  totalVotes: number;
  totalPlayers: number;
}

export interface RoundResultEvent {
  crewAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  questionIndex: number;
  isGameOver: boolean;
}

export interface GameEndEvent {
  correctCount: number;
  totalQuestions: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
  pending?: boolean; // optimistic send flag
  failed?: boolean;
}

export type ChatMessageEvent = ChatMessage;
