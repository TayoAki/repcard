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
