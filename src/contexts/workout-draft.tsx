/**
 * Shared draft for the workout composer + exercise picker. Lives on the
 * workout modal stack, so dismissing the flow clears it naturally.
 */
import { createContext, useContext, useState, type Dispatch, type SetStateAction } from "react";

export type DraftExercise = {
  id: string;
  name: string;
  image: string | null;
  muscles: string;
  sets: number;
  reps: number;
  targetWeight: number | null;
  restSeconds: number;
};

type DraftState = [DraftExercise[], Dispatch<SetStateAction<DraftExercise[]>>];

const DraftContext = createContext<DraftState | null>(null);

export function WorkoutDraftProvider({ children }: React.PropsWithChildren) {
  const state = useState<DraftExercise[]>([]);
  return <DraftContext.Provider value={state}>{children}</DraftContext.Provider>;
}

export function useWorkoutDraft() {
  const value = useContext(DraftContext);
  if (!value) throw new Error("useWorkoutDraft requires WorkoutDraftProvider");
  return value;
}

export const DEFAULT_PRESCRIPTION = { sets: 3, reps: 10, targetWeight: null, restSeconds: 90 } as const;
