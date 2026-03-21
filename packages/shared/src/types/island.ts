export type PinType = "challenge" | "checkpoint";

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
}

export interface Choice {
  label: "A" | "B" | "C" | "D";
  text: string;
}

export interface Challenge {
  id: string;
  pinId: string;
  audioUrl: string;
  question: string;
  choices: Choice[];
  answer: "A" | "B" | "C" | "D";
  explanation: string;
  hint: string;
}

export interface IslandWithPins extends Island {
  pins: (Pin & { challenges: Challenge[]; isCompleted: boolean })[];
}
