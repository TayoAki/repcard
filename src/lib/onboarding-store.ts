/**
 * Onboarding answers collected BEFORE an account exists. Persisted to
 * AsyncStorage on every change so a user who quits mid-flow resumes
 * where they left off; cleared after a successful signup.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

import { onboardingSchema, type Onboarding } from "@/lib/validation/onboarding";

const KEY = "repcard.onboarding";

export const draft: Partial<Onboarding> = {};

// Hydrate once at module load; failures just mean a fresh draft. Consumers
// that branch on completeness await `hydrationReady` so a cold start can't
// read the draft before storage resolves.
export const hydrationReady: Promise<void> = AsyncStorage.getItem(KEY)
  .then((raw) => {
    if (raw) Object.assign(draft, JSON.parse(raw));
  })
  .catch(() => {});

export function saveAnswer<K extends keyof Onboarding>(field: K, value: Onboarding[K]) {
  draft[field] = value;
  AsyncStorage.setItem(KEY, JSON.stringify(draft)).catch(() => {});
}

export const completedDraft = () => onboardingSchema.safeParse(draft);

export function clearDraft() {
  for (const key of Object.keys(draft) as (keyof Onboarding)[]) delete draft[key];
  AsyncStorage.removeItem(KEY).catch(() => {});
}
