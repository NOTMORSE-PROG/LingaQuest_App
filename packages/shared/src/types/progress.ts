export interface Progress {
  id: string;
  userId: string;
  pinId: string;
  isCompleted: boolean;
  accuracy: number;
  hintsUsed: number;
  completedAt?: string;
}

export interface IslandProgress {
  islandId: string;
  completedPins: number;
  totalPins: number;
  isUnlocked: boolean;
  isCompleted: boolean;
}
