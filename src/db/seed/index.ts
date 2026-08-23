/**
 * Seeds the global exercise catalog from the public free-exercise-db dataset
 * (https://github.com/yuhonas/free-exercise-db, public domain).
 *
 * Curation is programmatic, not a hand-typed name list: keep exercises that
 * have an image + instructions, then take a balanced spread per muscle group.
 * Run: npm run db:seed
 */
const DATA_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const IMAGE_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

const PER_MUSCLE = 8;

type SourceExercise = {
  id: string;
  name: string;
  category: string;
  equipment: string | null;
  force: string | null;
  level: string;
  mechanic: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  images: string[];
};

async function main() {
  // env comes from `tsx --env-file=.env` (see the db:seed script) - no
  // process.loadEnvFile(), which would demand Node >= 20.12.
  const { db } = await import("../index");
  const { exercises } = await import("../schema");

  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`Dataset fetch failed: ${res.status}`);
  const all = (await res.json()) as SourceExercise[];

  const usable = all.filter(
    (e) => e.images.length > 0 && e.instructions.length > 0 && e.primaryMuscles.length > 0,
  );

  // Balanced spread: up to PER_MUSCLE exercises per primary muscle group,
  // preferring beginner/intermediate so new users see approachable movements.
  const rank = { beginner: 0, intermediate: 1, expert: 2 } as const;
  const byMuscle = new Map<string, SourceExercise[]>();
  for (const e of usable) {
    const key = e.primaryMuscles[0];
    const bucket = byMuscle.get(key) ?? [];
    bucket.push(e);
    byMuscle.set(key, bucket);
  }

  const picked: SourceExercise[] = [];
  for (const bucket of byMuscle.values()) {
    bucket.sort(
      (a, b) =>
        (rank[a.level as keyof typeof rank] ?? 3) - (rank[b.level as keyof typeof rank] ?? 3) ||
        a.name.localeCompare(b.name),
    );
    picked.push(...bucket.slice(0, PER_MUSCLE));
  }

  const rows = picked.map((e) => ({
    slug: e.id.replaceAll("_", "-").toLowerCase(),
    name: e.name,
    image: `${IMAGE_BASE}/${e.images[0]}`,
    description: `${e.name} is a ${e.level} ${e.category} movement targeting ${e.primaryMuscles.join(", ")}.`,
    instructions: e.instructions,
    muscles: e.primaryMuscles.join(" • "),
    equipment: e.equipment,
    difficulty: e.level,
    force: e.force,
    mechanics: e.mechanic,
    category: e.category,
  }));

  await db.insert(exercises).values(rows).onConflictDoNothing();
  console.log(`Seeded ${rows.length} exercises across ${byMuscle.size} muscle groups`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
