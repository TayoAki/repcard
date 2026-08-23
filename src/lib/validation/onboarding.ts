import { z } from "zod";

export const onboardingSchema = z.object({
  gender: z.enum(["male", "female"]),
  goal: z.enum(["build-muscle", "lose-fat", "maintain"]),
  experience: z.enum(["beginner", "intermediate", "advanced"]),
});

export type Onboarding = z.infer<typeof onboardingSchema>;
