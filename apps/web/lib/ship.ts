import { ShipHealth, ShipPart } from "@linguaquest/shared";

export const INITIAL_SHIP_HEALTH: ShipHealth = {
  hull: 25,
  mast: 25,
  sails: 25,
  anchor: 25,
  rudder: 25,
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

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}
