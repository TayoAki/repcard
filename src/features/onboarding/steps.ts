import { type Onboarding } from "@/lib/validation/onboarding";

export type StepKey = keyof Onboarding;

type Option<K extends StepKey> = {
  value: Onboarding[K];
  label: string;
  icon: string; // FontAwesome6 name
  hint?: string;
};

export type StepConfig<K extends StepKey = StepKey> = {
  key: K;
  title: string;
  subtitle: string;
  options: readonly Option<K>[];
};

export const STEPS: readonly [StepConfig<"gender">, StepConfig<"goal">, StepConfig<"experience">] = [
  {
    key: "gender",
    title: "How should your card read?",
    subtitle: "Used to tune plan suggestions.",
    options: [
      { value: "male", label: "Male", icon: "person" },
      { value: "female", label: "Female", icon: "person-dress" },
    ],
  },
  {
    key: "goal",
    title: "Pick your position.",
    subtitle: "Your goal sets the position printed on your card.",
    options: [
      { value: "build-muscle", label: "Builder", icon: "dumbbell", hint: "Build muscle" },
      { value: "lose-fat", label: "Shredder", icon: "fire", hint: "Lose fat" },
      { value: "maintain", label: "Keeper", icon: "scale-balanced", hint: "Stay consistent" },
    ],
  },
  {
    key: "experience",
    title: "What's your level?",
    subtitle: "We scale starting plans to match.",
    options: [
      { value: "beginner", label: "Rookie", icon: "seedling", hint: "New or returning" },
      { value: "intermediate", label: "Pro", icon: "medal", hint: "Consistent for a year+" },
      { value: "advanced", label: "Veteran", icon: "trophy", hint: "Years under the bar" },
    ],
  },
] as const;

export const stepIndex = (key: string) => STEPS.findIndex((s) => s.key === key);
