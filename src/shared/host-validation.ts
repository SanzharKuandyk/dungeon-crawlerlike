import { z } from "zod";
import { codeSchema, envelopeSchema, secretSchema } from "./validation.js";

const id = z.string().min(1).max(100);
const simple = (kind: "start" | "pause" | "resume" | "end") =>
  z.object({ kind: z.literal(kind) }).strict();
const policy = (kind: "learning" | "fallback" | "pvp-policy") =>
  z.object({ kind: z.literal(kind), enabled: z.boolean() }).strict();
const crew = (kind: "crew-pause" | "crew-resume" | "crew-extend" | "crew-resolve") =>
  z
    .object({ kind: z.literal(kind), crewId: id, expectedCrewPhaseId: z.number().int().min(0) })
    .strict();
export const hostSchema = envelopeSchema
  .extend({
    command: z.discriminatedUnion("kind", [
      simple("start"),
      simple("pause"),
      simple("resume"),
      simple("end"),
      policy("learning"),
      policy("fallback"),
      policy("pvp-policy"),
      crew("crew-pause"),
      crew("crew-resume"),
      crew("crew-extend"),
      crew("crew-resolve"),
      z
        .object({
          kind: z.literal("duel-cancel"),
          duelId: id,
          expectedTurn: z.number().int().min(1).max(3),
          expectedDuelPhase: z.enum(["choice", "reveal"]),
        })
        .strict(),
      z.object({ kind: z.literal("question-skip"), questionId: id }).strict(),
    ]),
  })
  .strict();
export const testControlSchema = envelopeSchema
  .extend({
    command: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("advance") }).strict(),
      z.object({ kind: z.literal("speed"), speed: z.enum(["manual", "normal", "fast"]) }).strict(),
    ]),
  })
  .strict();
export const recoveryCodeSchema = z.string().regex(/^[A-Z2-7]{12}$/);
export const recoveryIssueSchema = envelopeSchema
  .extend({ playerId: id, recoveryCode: recoveryCodeSchema })
  .strict();
export const recoveryRedeemSchema = z
  .object({ code: codeSchema, recoveryCode: recoveryCodeSchema, bootstrapSecret: secretSchema })
  .strict();
export const hostRecoverySchema = z
  .object({ code: codeSchema, installationKey: secretSchema, bootstrapSecret: secretSchema })
  .strict();
