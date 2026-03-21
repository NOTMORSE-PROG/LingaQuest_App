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
  shardItemName?: string;
  shardDescription?: string;
}

export interface Pin {
  id: string;
  islandId: string;
  number: number;
  type: PinType;
  sortOrder: number;
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
  pins: (Pin & { challenges: Challenge[] })[];
}
