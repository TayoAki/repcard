/**
 * Typed client for our API routes. Every call goes through authClient.$fetch
 * so the session cookie rides along. Errors are per-operation, never generic.
 */
import { API_URL, authClient } from "@/lib/auth-client";

async function request<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const { data, error } = await authClient.$fetch<T>(`${API_URL}${path}`, {
    method: init?.method ?? "GET",
    ...(init?.body !== undefined && {
      body: JSON.stringify(init.body),
      headers: { "Content-Type": "application/json" },
    }),
  });
  if (error) {
    throw new Error(
      (error as { message?: string }).message ?? `Request failed: ${init?.method ?? "GET"} ${path}`,
    );
  }
  return data as T;
}

// ----- Exercises ------------------------------------------------------------

export type ExerciseListItem = {
  id: string;
  name: string;
  image: string | null;
  muscles: string;
  difficulty: string;
};

export type ExerciseDetail = ExerciseListItem & {
  slug: string;
  description: string;
  instructions: string[];
  equipment: string | null;
  force: string | null;
  mechanics: string | null;
  category: string;
};

export const fetchExercises = (search?: string) =>
  request<ExerciseListItem[]>(`/api/exercises${search ? `?search=${encodeURIComponent(search)}` : ""}`);

export const fetchExercise = (id: string) => request<ExerciseDetail>(`/api/exercises/${id}`);

// ----- Workouts -------------------------------------------------------------

export type WorkoutListItem = {
  id: string;
  name: string;
  image: string | null;
  source: "manual" | "ai_plan" | "imported";
  muscles: string;
  exerciseCount: number;
  totalSets: number;
};

export type WorkoutExerciseItem = {
  id: string;
  name: string;
  image: string | null;
  muscles: string;
  sets: number;
  reps: number;
  targetWeight: number | null;
  restSeconds: number;
  position: number;
};

export type WorkoutDetail = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  muscles: string;
  exercises: WorkoutExerciseItem[];
};

export type WorkoutPayload = {
  name: string;
  description?: string;
  image?: string | null;
  exercises: {
    id: string;
    sets: number;
    reps: number;
    targetWeight?: number | null;
    restSeconds: number;
  }[];
};

export const fetchWorkouts = () => request<WorkoutListItem[]>("/api/workouts");
export const fetchWorkout = (id: string) => request<WorkoutDetail>(`/api/workouts/${id}`);
export const createWorkout = (payload: WorkoutPayload) =>
  request<{ id: string }>("/api/workouts", { method: "POST", body: payload });
export const updateWorkout = (id: string, payload: WorkoutPayload) =>
  request<{ message: string }>(`/api/workouts/${id}`, { method: "PATCH", body: payload });
export const deleteWorkout = (id: string) =>
  request<{ message: string }>(`/api/workouts/${id}`, { method: "DELETE" });
