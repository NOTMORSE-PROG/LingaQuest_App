export type BadgeType =
  // Quest badges
  | "first_steps"
  | "sharp_ear"
  | "never_lost"
  | "ship_saver"
  | "the_captain"
  // Island badges (island_1 through island_7)
  | `island_${1 | 2 | 3 | 4 | 5 | 6 | 7}`
  // Abandon Ship badges
  | "unsinkable"
  | "unanimous"
  | "true_crew"
  | "comeback"
  // Certificate
  | "island_conqueror";

export interface Badge {
  id: string;
  userId: string;
  badgeType: BadgeType;
  earnedAt: string;
}
