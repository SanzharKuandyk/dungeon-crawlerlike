import { z } from "zod";
import { envelopeSchema } from "./validation.js";
export const trialCommandSchema = envelopeSchema.extend({ trialId: z.string().min(1) });
export const wagerSchema = z.enum(["steady", "bold", "oath"]);
export const trialPackSchema = z
  .object({
    fixture: z.boolean(),
    categories: z.tuple([z.string(), z.string(), z.string()]),
    questions: z.array(
      z
        .object({
          id: z.string(),
          category: z.string(),
          value: z.union([z.literal(100), z.literal(200), z.literal(300)]),
          prompt: z.string(),
          code: z.string().nullable(),
          choices: z.tuple([z.string(), z.string(), z.string(), z.string()]),
          correctIndex: z.number().int().min(0).max(3),
          explanation: z.string(),
          distractors: z.tuple([z.string(), z.string(), z.string(), z.string()]),
          reference: z.object({ file: z.string(), slide: z.string() }),
          reviewed: z.boolean(),
        })
        .strict(),
    ),
  })
  .strict();
