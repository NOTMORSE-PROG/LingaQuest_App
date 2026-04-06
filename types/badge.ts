export type BadgeType =
  // Quest badges
  | "first_steps"
  | "sharp_ear"
  | "the_captain"
  // Island badges (island_1 through island_7)
  | `island_${1 | 2 | 3 | 4 | 5 | 6 | 7}`
  // Certificate
  | "island_conqueror";

export interface Badge {
  id: string;
  userId: string;
  badgeType: BadgeType;
  earnedAt: string;
}
