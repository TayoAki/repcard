import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

export * from "./auth-schema";

export const genderEnum = pgEnum("gender", ["male", "female"]);
export const goalEnum = pgEnum("goal", ["build-muscle", "lose-fat", "maintain"]);
export const experienceEnum = pgEnum("experience", ["beginner", "intermediate", "advanced"]);
export const weightUnitEnum = pgEnum("weight_unit", ["kg", "lb"]);
export const workoutSourceEnum = pgEnum("workout_source", ["manual", "ai_plan", "imported"]);
export const battleStatusEnum = pgEnum("battle_status", ["pending", "active", "finished"]);

/** One per user, created by the signup hook. Holds card identity + prefs. */
export const profiles = pgTable("profiles", {
  id: uuid().defaultRandom().primaryKey(),
  userId: text()
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  handle: text().notNull().unique(), // public card URL: /card/[handle]
  cardSerial: serial(), // sequential collector number: card #0042
  gender: genderEnum().notNull(),
  goal: goalEnum().notNull(),
  experience: experienceEnum().notNull(),
  weightUnit: weightUnitEnum().notNull().default("kg"),
  pushToken: text(), // Expo push token, set on opt-in (battles)
  leaderboardOptOut: boolean().notNull().default(false),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * GLOBAL exercise catalog - not user-owned. Seeded from the public
 * free-exercise-db dataset, including its step-by-step instructions,
 * which double as the no-AI-key fallback for the coach endpoint.
 */
export const exercises = pgTable("exercises", {
  id: uuid().defaultRandom().primaryKey(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  image: text(),
  description: text().notNull(),
  instructions: jsonb().$type<string[]>().notNull().default([]),
  muscles: text().notNull(),
  equipment: text(),
  difficulty: text().notNull(),
  force: text(),
  mechanics: text(),
  category: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const workouts = pgTable("workouts", {
  id: uuid().defaultRandom().primaryKey(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text().notNull(),
  description: text(),
  image: text(),
  source: workoutSourceEnum().notNull().default("manual"),
  shareSlug: text().unique(), // minted on first share; powers /w/[slug]
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const workoutExercises = pgTable("workout_exercises", {
  id: uuid().defaultRandom().primaryKey(),
  workoutId: uuid()
    .notNull()
    .references(() => workouts.id, { onDelete: "cascade" }),
  exerciseId: uuid()
    .notNull()
    .references(() => exercises.id, { onDelete: "cascade" }),
  sets: integer().notNull(),
  reps: integer().notNull(),
  targetWeight: real(), // kg canonical; converted for display by profile pref
  restSeconds: integer().notNull(),
  position: integer().notNull(),
});

export const workoutSessions = pgTable("workout_sessions", {
  id: uuid().defaultRandom().primaryKey(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  // History outlives its template: deleting a workout must never erase
  // completed sessions (they feed stats, streaks, and the card rating).
  workoutId: uuid().references(() => workouts.id, { onDelete: "set null" }),
  startedAt: timestamp({ withTimezone: true }).notNull(),
  completedAt: timestamp({ withTimezone: true }).notNull(),
  durationSeconds: integer().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const workoutSessionSets = pgTable("workout_session_sets", {
  id: uuid().defaultRandom().primaryKey(),
  sessionId: uuid()
    .notNull()
    .references(() => workoutSessions.id, { onDelete: "cascade" }),
  exerciseId: uuid()
    .notNull()
    .references(() => exercises.id),
  setNumber: integer().notNull(),
  reps: integer().notNull(),
  weight: real(), // kg canonical
});

/** Logged runs - manual entry v1 (GPS is a later phase). Meters canonical. */
export const runs = pgTable("runs", {
  id: uuid().defaultRandom().primaryKey(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  distanceMeters: integer().notNull(),
  durationSeconds: integer().notNull(),
  note: text(),
  completedAt: timestamp({ withTimezone: true }).notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** Head-to-head streak battles, joined by short invite code. */
export const battles = pgTable("battles", {
  id: uuid().defaultRandom().primaryKey(),
  code: text().notNull().unique(),
  creatorId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  opponentId: text().references(() => user.id, { onDelete: "cascade" }),
  status: battleStatusEnum().notNull().default("pending"),
  startedAt: timestamp({ withTimezone: true }),
  endsAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export type Profile = typeof profiles.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type WorkoutSessionSet = typeof workoutSessionSets.$inferSelect;
export type Battle = typeof battles.$inferSelect;
export type Run = typeof runs.$inferSelect;
