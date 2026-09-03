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
    const err = new Error(
      (error as { message?: string }).message ?? `Request failed: ${init?.method ?? "GET"} ${path}`,
    ) as Error & { status?: number };
    err.status = (error as { status?: number }).status;
    throw err;
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

export type ExerciseFilters = {
  search?: string;
  muscle?: string;
  equipment?: string;
  difficulty?: string;
};

export type ExerciseFacets = { muscles: string[]; equipment: string[]; difficulties: string[] };

export const fetchExercises = (filters: ExerciseFilters = {}) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const qs = params.toString();
  return request<ExerciseListItem[]>(`/api/exercises${qs ? `?${qs}` : ""}`);
};

export const fetchExerciseFacets = () => request<ExerciseFacets>("/api/exercises/facets");

export type PresetWorkout = {
  name: string;
  exercises: {
    id: string;
    name: string;
    image: string | null;
    muscles: string;
    sets: number;
    reps: number;
    targetWeight: number | null;
    restSeconds: number;
  }[];
};

export const fetchPreset = (key: string) => request<PresetWorkout>(`/api/presets/${key}`);

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
  request<{ id: string; coverStored?: boolean }>("/api/workouts", { method: "POST", body: payload });
export const updateWorkout = (id: string, payload: WorkoutPayload) =>
  request<{ message: string; coverStored?: boolean }>(`/api/workouts/${id}`, {
    method: "PATCH",
    body: payload,
  });
export const deleteWorkout = (id: string) =>
  request<{ message: string }>(`/api/workouts/${id}`, { method: "DELETE" });

// ----- Sessions -------------------------------------------------------------

export type SessionSetInput = {
  exerciseId: string;
  setNumber: number;
  reps: number;
  weight?: number;
};

export type SaveSessionInput = {
  workoutId: string;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  sets: SessionSetInput[];
};

export type SessionListItem = {
  id: string;
  workoutId: string | null;
  workoutName: string;
  image: string | null;
  completedAt: string;
  durationSeconds: number;
  exerciseCount: number;
  setCount: number;
};

export type SessionPage = { items: SessionListItem[]; nextCursor: string | null };

export const fetchSessions = (options?: { limit?: number; cursor?: string }) => {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.cursor) params.set("cursor", options.cursor);
  const qs = params.toString();
  return request<SessionPage>(`/api/sessions${qs ? `?${qs}` : ""}`);
};
export const saveSession = (payload: SaveSessionInput) =>
  request<{ id: string; recordedSets: number }>("/api/sessions", { method: "POST", body: payload });

// ----- Session detail / calendar / streak / stats / profile -----------------

export type SessionDetail = {
  id: string;
  workoutId: string | null;
  workoutName: string;
  image: string | null;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  exercises: { id: string; name: string; image: string | null; sets: { reps: number; weight: number | null }[] }[];
  setCount: number;
  volumeKg: number | null;
};

export type DayStats = { sessions: number; totalSeconds: number; averageSeconds: number };

export type ProfileData = {
  handle: string;
  cardSerial: number;
  gender: "male" | "female";
  goal: "build-muscle" | "lose-fat" | "maintain";
  experience: "beginner" | "intermediate" | "advanced";
  weightUnit: "kg" | "lb";
  leaderboardOptOut: boolean;
  name: string;
  email: string;
};

const range = (start: Date, end: Date) =>
  new URLSearchParams({ start: start.toISOString(), end: end.toISOString() }).toString();

export const fetchSessionDetail = (id: string) => request<SessionDetail>(`/api/sessions/${id}`);
export const fetchCalendarDates = (start: Date, end: Date) =>
  request<{ dates: string[] }>(`/api/sessions/calendar?${range(start, end)}`);
export const fetchStreakDates = () => request<{ dates: string[] }>("/api/sessions/streak");
export const fetchDayStats = (start: Date, end: Date) =>
  request<DayStats>(`/api/stats/day?${range(start, end)}`);
export const fetchProfile = () => request<ProfileData>("/api/profile");
export const updateProfile = (patch: {
  weightUnit?: "kg" | "lb";
  pushToken?: string | null;
  leaderboardOptOut?: boolean;
}) =>
  request<{ message: string }>("/api/profile", { method: "PATCH", body: patch });

export const setupProfile = (answers: {
  gender: "male" | "female";
  goal: "build-muscle" | "lose-fat" | "maintain";
  experience: "beginner" | "intermediate" | "advanced";
}) => request<{ id: string }>("/api/profile", { method: "POST", body: answers });

/**
 * Whether the signed-in user has a profile. Only a 404 means "no profile"
 * (the social-signup case) - 401 / 5xx / network errors are rethrown so the
 * app never routes a real user into profile setup over a transient blip.
 */
export const hasProfile = async (): Promise<boolean> => {
  try {
    await fetchProfile();
    return true;
  } catch (error) {
    if ((error as { status?: number }).status === 404) return false;
    throw error;
  }
};

// ----- Player card ----------------------------------------------------------

export type CardData = {
  name: string;
  handle: string;
  serial: number;
  position: string;
  season: number;
  overall: number;
  components: { consistency: number; volume: number; variety: number; prMomentum: number };
  streak: number;
  bestStreak: number;
  stats: {
    sessions28: number;
    totalSessions: number;
    totalMinutes: number;
    volume28Kg: number;
    prCount30: number;
    muscleGroups28: number;
    distance28Meters: number;
    runs28: number;
  };
};

export const fetchMyCard = () => request<CardData>("/api/card/me");
export const deleteAccount = () => request<{ message: string }>("/api/account", { method: "DELETE" });

// ----- Coach ----------------------------------------------------------------

export type CoachCues = { source: "ai" | "dataset"; cues: string[]; mistake: string | null };

export const fetchCoachCues = (exerciseId: string) =>
  request<CoachCues>(`/api/exercises/${exerciseId}/coach`);

// ----- Plans ----------------------------------------------------------------

export type GeneratedPlan = {
  source: "ai" | "template";
  workouts: { id: string; name: string; exerciseCount: number }[];
};

export const generatePlan = () => request<GeneratedPlan>("/api/plans/generate", { method: "POST", body: {} });

// ----- Sharing / import -----------------------------------------------------

export const mintShareSlug = (workoutId: string) =>
  request<{ slug: string }>(`/api/workouts/${workoutId}/share`, { method: "POST", body: {} });
export const importWorkout = (slug: string) =>
  request<{ id: string; name: string }>("/api/workouts/import", { method: "POST", body: { slug } });

// ----- Referrals ------------------------------------------------------------

export type ReferralInfo = { code: string; recruits: number; redeemed: boolean };

export const fetchReferral = () => request<ReferralInfo>("/api/referral");
export const redeemReferral = (code: string) =>
  request<{ ok: boolean; referrer: { handle: string; name: string } }>("/api/referral/redeem", {
    method: "POST",
    body: { code },
  });

// ----- Battles --------------------------------------------------------------

export type BattleListItem = {
  id: string;
  code: string;
  status: "pending" | "active" | "finished";
  startedAt: string | null;
  endsAt: string | null;
};

export type BattleFighter = { name: string; handle: string; streak: number; sessionsInBattle: number };

export type BattleDetail = BattleListItem & { me: BattleFighter; rival: BattleFighter | null };

export const fetchBattles = () => request<BattleListItem[]>("/api/battles");
export const createBattle = () => request<BattleListItem>("/api/battles", { method: "POST", body: {} });
export const joinBattle = (code: string) =>
  request<{ id: string }>("/api/battles/join", { method: "POST", body: { code } });
export const fetchBattle = (id: string) => request<BattleDetail>(`/api/battles/${id}`);

// ----- Runs -----------------------------------------------------------------

export type RunItem = {
  id: string;
  distanceMeters: number;
  durationSeconds: number;
  note: string | null;
  completedAt: string;
};

export type RunPage = { items: RunItem[]; nextCursor: string | null };

export const fetchRuns = (options?: { limit?: number; cursor?: string }) => {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.cursor) params.set("cursor", options.cursor);
  const qs = params.toString();
  return request<RunPage>(`/api/runs${qs ? `?${qs}` : ""}`);
};

export const logRun = (payload: {
  distanceMeters: number;
  durationSeconds: number;
  note?: string;
}) => request<RunItem>("/api/runs", { method: "POST", body: payload });

// ----- Leaderboard ----------------------------------------------------------

export type LeaderboardMetric = "sessions" | "volume" | "distance";
export type LeaderboardPeriod = "week" | "all";
export type LeaderboardRow = {
  rank: number;
  handle: string;
  name: string;
  value: number;
  isMe: boolean;
};
export type Leaderboard = {
  metric: LeaderboardMetric;
  period: LeaderboardPeriod;
  rows: LeaderboardRow[];
  me: LeaderboardRow | null;
};

export const fetchLeaderboard = (metric: LeaderboardMetric, period: LeaderboardPeriod) =>
  request<Leaderboard>(`/api/leaderboard?metric=${metric}&period=${period}`);
