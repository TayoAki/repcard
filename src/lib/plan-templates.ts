/**
 * Deterministic plan generator - the no-AI-key fallback and the safety net
 * when AI output fails validation. Picks real exercises from the seeded
 * catalog by muscle keyword, scaled to experience.
 */
export type CatalogExercise = { id: string; slug: string; name: string; muscles: string };

type Goal = "build-muscle" | "lose-fat" | "maintain";
type Experience = "beginner" | "intermediate" | "advanced";

type Blueprint = { name: string; description: string; muscleKeys: string[] };

const SPLITS: Record<Goal, Blueprint[]> = {
  "build-muscle": [
    { name: "Push Day", description: "Chest, shoulders, triceps.", muscleKeys: ["chest", "shoulders", "triceps"] },
    { name: "Pull Day", description: "Back and biceps.", muscleKeys: ["lats", "middle back", "biceps"] },
    { name: "Leg Day", description: "Quads, hamstrings, calves.", muscleKeys: ["quadriceps", "hamstrings", "calves"] },
  ],
  "lose-fat": [
    { name: "Full Body A", description: "Big movers, short rests.", muscleKeys: ["quadriceps", "chest", "lats"] },
    { name: "Full Body B", description: "Posterior chain focus.", muscleKeys: ["hamstrings", "middle back", "shoulders"] },
    { name: "Engine Room", description: "Core and conditioning.", muscleKeys: ["abdominals", "quadriceps", "chest"] },
  ],
  maintain: [
    { name: "Upper Body", description: "Everything above the belt.", muscleKeys: ["chest", "lats", "shoulders", "biceps"] },
    { name: "Lower Body", description: "Legs and core.", muscleKeys: ["quadriceps", "hamstrings", "abdominals"] },
    { name: "Full Body", description: "The whole machine.", muscleKeys: ["chest", "lats", "quadriceps"] },
  ],
};

const DOSAGE: Record<Experience, { perMuscle: number; sets: number; reps: number; restSeconds: number }> = {
  beginner: { perMuscle: 1, sets: 3, reps: 10, restSeconds: 90 },
  intermediate: { perMuscle: 2, sets: 4, reps: 8, restSeconds: 105 },
  advanced: { perMuscle: 2, sets: 5, reps: 6, restSeconds: 150 },
};

/** Builds one workout's exercise list from muscle keys, dosed by experience. */
export function buildWorkoutFromKeys(
  muscleKeys: readonly string[],
  experience: Experience,
  catalog: CatalogExercise[],
) {
  const dose = DOSAGE[experience];
  const picked: CatalogExercise[] = [];
  for (const key of muscleKeys) {
    const matches = catalog
      .filter((e) => e.muscles.toLowerCase().includes(key) && !picked.some((p) => p.id === e.id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, dose.perMuscle);
    picked.push(...matches);
  }
  return picked.map((e) => ({
    id: e.id,
    sets: dose.sets,
    reps: dose.reps,
    restSeconds: dose.restSeconds,
  }));
}

export function buildFallbackPlan(goal: Goal, experience: Experience, catalog: CatalogExercise[]) {
  return SPLITS[goal].map((blueprint) => ({
    name: blueprint.name,
    description: blueprint.description,
    exercises: buildWorkoutFromKeys(blueprint.muscleKeys, experience, catalog),
  }));
}

/** Composer Quick Start chips: one-tap starting points, goal-independent. */
export const QUICK_STARTS = {
  push: { name: "Push Day", muscleKeys: ["chest", "shoulders", "triceps"] },
  pull: { name: "Pull Day", muscleKeys: ["lats", "middle back", "biceps"] },
  legs: { name: "Leg Day", muscleKeys: ["quadriceps", "hamstrings", "calves"] },
  upper: { name: "Upper Body", muscleKeys: ["chest", "lats", "shoulders", "biceps"] },
  lower: { name: "Lower Body", muscleKeys: ["quadriceps", "hamstrings", "abdominals"] },
  full: { name: "Full Body", muscleKeys: ["chest", "lats", "quadriceps"] },
} as const;

export type QuickStartKey = keyof typeof QUICK_STARTS;
