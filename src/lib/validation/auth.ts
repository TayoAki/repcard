import { z } from "zod";

const email = z.string().trim().min(1, "Email is required").pipe(z.email("Enter a valid email"));
const password = z.string().min(8, "At least 8 characters");

export const signInSchema = z.object({ email, password });
export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name"),
  email,
  password,
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
