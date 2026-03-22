export type PinType = "CHALLENGE" | "CHECKPOINT";

export interface Island {
  id: string;
  number: number;
  name: string;
  skillFocus: string;
  description: string;
  isLocked: boolean;
  npcName?: string;
  npcDialogueIntro?: string;
  npcDialogueSuccess?: string;
  npcDialogueFail?: string;
  npcAudioIntro?: string;
  npcAudioSuccess?: string;
  npcAudioFail?: string;
  ingayAudioUrl?: string;
  shardItemName?: string;
  shardDescription?: string;
  cumulativeAccuracy?: number | null;
  allPinsCompleted?: boolean;
  islandPassed?: boolean;
}

export interface PinIslandContext {
  number: number;
  name: string;
  skillFocus: string;
  npcDialogueIntro?: string;
  npcDialogueSuccess?: string;
  npcDialogueFail?: string;
}

export interface Pin {
  id: string;
  islandId: string;
  number: number;
  type: PinType;
  sortOrder: number;
  island?: PinIslandContext;
  isCompleted?: boolean;
  accuracy?: number | null;
}

export interface Choice {
  label: "A" | "B" | "C" | "D";
  text: string;
}

export interface Challenge {
  id: string;
  pinId: string;
  sortOrder: number;
  audioUrl: string;
  question: string;
  choices: Choice[];
  answer: "A" | "B" | "C" | "D";
  explanation: string;
  hint: string;
}

export interface IslandWithPins extends Island {
  pins: (Pin & { challenges: Challenge[]; isCompleted: boolean; accuracy: number | null })[];
}
