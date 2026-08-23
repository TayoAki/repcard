/**
 * The Overall rating (40-99), sports-game style. Pure function over
 * pre-aggregated training data so it is trivially unit-testable and the
 * formula lives in exactly one place.
 *
 * overall = 40 + round(59 * (0.40*consistency + 0.25*volume + 0.20*variety + 0.15*prMomentum))
 *
 * Component normalization (each clamped to 0..1):
 * - consistency: sessions/week (last 28d) vs a goal-derived target,
 *   plus up to +0.25 from current streak (capped at 14 days)
 * - volume: last-14d volume vs previous-14d (1.0 at >=110% of prior;
 *   a fresh athlete with no prior volume scores 0.5 baseline)
 * - variety: distinct primary muscle groups hit in 28d, target 8
 * - prMomentum: exercises with a new all-time max in the last 30d, target 4
 */
export type RatingInput = {
  goal: "build-muscle" | "lose-fat" | "maintain";
  sessionsLast28: number;
  currentStreak: number;
  volumeLast14: number;
  volumePrev14: number;
  muscleGroups28: number;
  prCount30: number;
};

export type Rating = {
  overall: number;
  components: { consistency: number; volume: number; variety: number; prMomentum: number };
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const WEEKLY_TARGET: Record<RatingInput["goal"], number> = {
  "build-muscle": 4,
  "lose-fat": 5,
  maintain: 3,
};

export function computeRating(input: RatingInput): Rating {
  const weekly = input.sessionsLast28 / 4;
  const base = clamp01(weekly / WEEKLY_TARGET[input.goal]);
  const streakBonus = clamp01(input.currentStreak / 14) * 0.25;
  const consistency = clamp01(base * 0.75 + streakBonus + (base >= 1 ? 0.25 : 0));

  const volume =
    input.volumePrev14 <= 0
      ? input.volumeLast14 > 0
        ? 0.5
        : 0
      : clamp01(input.volumeLast14 / (input.volumePrev14 * 1.1));

  const variety = clamp01(input.muscleGroups28 / 8);
  const prMomentum = clamp01(input.prCount30 / 4);

  const blended =
    0.4 * consistency + 0.25 * volume + 0.2 * variety + 0.15 * prMomentum;

  return {
    overall: 40 + Math.round(59 * blended),
    components: { consistency, volume, variety, prMomentum },
  };
}

export const POSITION: Record<RatingInput["goal"], string> = {
  "build-muscle": "Builder",
  "lose-fat": "Shredder",
  maintain: "Keeper",
};
