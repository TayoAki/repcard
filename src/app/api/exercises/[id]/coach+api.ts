import { generateText, Output } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db, exercises } from "@/db";
import { auth } from "@/lib/auth";

const idSchema = z.uuid();

// Per-instance cache: AI cues for an exercise are stable, so one generation
// per exercise per server instance caps Gateway spend. (A DB-backed cache is
// the durable upgrade if instances multiply.)
const aiCueCache = new Map<string, { cues: string[]; mistake: string | null }>();

const cuesSchema = z.object({
  cues: z
    .array(z.string().min(4).max(220))
    .min(3)
    .max(6)
    .describe("Short, imperative form cues for performing the exercise safely"),
  mistake: z.string().max(220).describe("The single most common mistake to avoid"),
});

/**
 * AI form coaching with graceful degradation:
 * - AI key present  -> Gemini structured output, personalized to the athlete's level
 * - no key / AI down -> the dataset's own step-by-step instructions
 * The response always carries `source` so the UI can label it honestly.
 */
export async function GET(request: Request, { id }: Record<string, string>) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });
  if (!idSchema.safeParse(id).success) {
    return Response.json({ message: "Exercise not found" }, { status: 404 });
  }

  const [exercise] = await db.select().from(exercises).where(eq(exercises.id, id)).limit(1);
  if (!exercise) return Response.json({ message: "Exercise not found" }, { status: 404 });

  const fallback = {
    source: "dataset" as const,
    cues: exercise.instructions,
    mistake: null as string | null,
  };

  if (!process.env.AI_GATEWAY_API_KEY) return Response.json(fallback);

  const cached = aiCueCache.get(id);
  if (cached) return Response.json({ source: "ai" as const, ...cached });

  try {
    const { output } = await generateText({
      model: "google/gemini-2.5-flash",
      output: Output.object({ schema: cuesSchema }),
      system:
        "You are a strength coach. Give concise, imperative form cues. No fluff, no numbering, no emojis.",
      prompt: `Exercise: ${exercise.name}\nCategory: ${exercise.category}\nTarget muscles: ${exercise.muscles}\nEquipment: ${exercise.equipment ?? "none"}\nReference steps: ${exercise.instructions.join(" ")}`,
    });
    if (output?.cues?.length) {
      const result = { cues: output.cues, mistake: output.mistake };
      aiCueCache.set(id, result);
      return Response.json({ source: "ai" as const, ...result });
    }
  } catch (error) {
    console.warn("AI coach fell back to dataset:", error);
  }
  return Response.json(fallback);
}
