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
  shipHealth: ShipHealth;
  players: RoomPlayer[];
}

export interface RoomPlayer {
  userId: string;
  username: string;
  joinedAt: string;
}

// Pusher event payloads
export interface RoundStartEvent {
  round: number;
  audioUrl: string;
  partToRepair: ShipPart;
  questionIndex: number;
  question: string;
  choices: { label: string; text: string }[];
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
}

export interface RepairVoteEvent {
  votes: Record<ShipPart, number>;
  winner: ShipPart;
}
