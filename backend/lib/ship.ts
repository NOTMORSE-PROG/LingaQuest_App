import { ShipHealth, ShipPart } from "../types/multiplayer";

export const INITIAL_SHIP_HEALTH: ShipHealth = {
  hull: 50,
  mast: 50,
  sails: 50,
  anchor: 50,
  rudder: 50,
};

export function applyHealthDelta(
  health: ShipHealth,
  part: ShipPart,
  delta: number
): ShipHealth {
  return {
    ...health,
    [part]: Math.max(0, Math.min(100, health[part] + delta)),
  };
}

export function isShipSunk(health: ShipHealth): boolean {
  return Object.values(health).some((hp) => (hp as number) <= 0);
}

export function countFullyRepairedParts(health: ShipHealth): number {
  return Object.values(health).filter((hp) => (hp as number) >= 100).length;
}

export function crewWins(health: ShipHealth): boolean {
  return countFullyRepairedParts(health) >= 3;
}

export function getMostDamagedPart(health: ShipHealth): ShipPart {
  const parts = Object.entries(health) as [ShipPart, number][];
  return parts.reduce((a, b) => (a[1] < b[1] ? a : b))[0];
}

export function resolveRepairVote(votes: string[], shipHealth: ShipHealth): ShipPart {
  if (votes.length === 0) return getMostDamagedPart(shipHealth);
  const tally: Record<string, number> = {};
  for (const v of votes) tally[v] = (tally[v] ?? 0) + 1;
  const max = Math.max(...Object.values(tally));
  const winners = Object.keys(tally).filter((k) => tally[k] === max);
  if (winners.length === 1) return winners[0] as ShipPart;
  // Tie: pick most-damaged among tied parts
  return winners.reduce((a, b) =>
    (shipHealth[a as ShipPart] ?? 0) <= (shipHealth[b as ShipPart] ?? 0) ? a : b
  ) as ShipPart;
}

export function getNextDamagedPart(health: ShipHealth, excluding: ShipPart): ShipPart | null {
  const parts = (Object.entries(health) as [ShipPart, number][]).filter(
    ([p, hp]) => p !== excluding && hp > 0 && hp < 100
  );
  if (parts.length === 0) return null;
  return parts.reduce((a, b) => (a[1] < b[1] ? a : b))[0];
}

const CHOICE_LABELS = ["A", "B", "C", "D"] as const;

export function shuffleChoices(
  choices: { label: string; text: string }[],
  correctAnswer: string
): { shuffledChoices: { label: string; text: string }[]; shuffledAnswer: string } {
  const arr = [...choices];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const relabeled = arr.map((c, i) => ({ ...c, label: CHOICE_LABELS[i] }));
  const originalCorrect = choices.find((c) => c.label === correctAnswer);
  const newIdx = originalCorrect ? arr.findIndex((c) => c.text === originalCorrect.text) : 0;
  return { shuffledChoices: relabeled, shuffledAnswer: CHOICE_LABELS[newIdx] };
}

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}
