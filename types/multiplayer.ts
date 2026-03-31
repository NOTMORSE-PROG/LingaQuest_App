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

// Pusher event payloads

export interface RepairVoteStartEvent {
  round: number;
  totalRounds: number;
  shipHealth: ShipHealth;
}

export interface RepairVoteUpdateEvent {
  userId: string;
  hasVoted: boolean;
  totalVotes: number;
  totalPlayers: number;
}

export interface RepairVoteResultEvent {
  chosenPart: ShipPart;
  shipHealth: ShipHealth;
}

export interface RoundQuestionEvent {
  round: number;
  questionIndex: number;
  totalQuestions: number;
  audioUrl: string;
  question: string;
  choices: { label: string; text: string }[];
  challengeId: string;
  partToRepair: ShipPart;
}

export interface VoteUpdateEvent {
  userId: string;
  hasVoted: boolean;
  totalVotes: number;
  totalPlayers: number;
}

export interface RoundResultEvent {
  crewAnswer: "A" | "B" | "C" | "D";
  correctAnswer: "A" | "B" | "C" | "D";
  isCorrect: boolean;
  healthDelta: number;
  partTarget: ShipPart;
  newShipHealth: ShipHealth;
  questionIndex: number;
  isRoundOver: boolean;
  newPartTarget?: ShipPart;
}

export interface RoundEndEvent {
  round: number;
  totalRounds: number;
  shipHealth: ShipHealth;
}
