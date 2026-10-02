import { z } from "zod";
import { CLASS_IDS } from "./constants.js";
export const classSchema = z.enum(CLASS_IDS);
const part = z.enum(["body", "weak-point"]);
const target = z.string().min(1).max(100);
export const actionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("attack"), part }).strict(),
  z.object({ kind: z.literal("brace") }).strict(),
  z.object({ kind: z.literal("loot") }).strict(),
  z.object({ kind: z.literal("protect"), targetHeroId: target }).strict(),
  z.object({ kind: z.literal("mend"), targetHeroId: target }).strict(),
  z.object({ kind: z.literal("hex"), part }).strict(),
  z.object({ kind: z.literal("pilfer") }).strict(),
  z.object({ kind: z.literal("skirmish"), part }).strict(),
  z.object({ kind: z.literal("channel"), part }).strict(),
  z.object({ kind: z.literal("duel-attack"), targetHeroId: target }).strict(),
  z.object({ kind: z.literal("duel-hex"), targetHeroId: target }).strict(),
  z.object({ kind: z.literal("duel-pilfer"), targetHeroId: target }).strict(),
  z.object({ kind: z.literal("duel-skirmish"), targetHeroId: target }).strict(),
  z.object({ kind: z.literal("duel-channel"), targetHeroId: target }).strict(),
  z.object({ kind: z.literal("ward"), targetHeroId: target }).strict(),
  z.object({ kind: z.literal("observe") }).strict(),
]);
export const itemSchema = z.enum(["ward", "salve", "lantern", "keep"]);
export const campSchema = z.enum(["secure", "rest", "bargain"]);
export const classDefinitionSchema = z
  .object({
    id: classSchema,
    name: z.string().min(1),
    skill: z.string().min(1),
    description: z.string().min(1),
    maxCrewSize: z.union([z.literal(2), z.literal(4)]),
  })
  .strict();
export const roomDefinitionSchema = z
  .object({
    id: target,
    depth: z.number().int().min(1).max(5),
    name: z.string().min(1),
    risk: z.enum(["low", "medium", "high"]),
    family: z.enum(["sentinel", "seer", "devourer"]),
    description: z.string().min(1),
  })
  .strict();
export const questionSchema = z
  .object({
    id: target,
    topic: z.string(),
    prompt: z.string(),
    choices: z.array(z.string()).length(4),
    correctIndex: z.number().int().min(0).max(3),
    explanation: z.string(),
    source: z.string(),
  })
  .strict();
export const nameSchema = z.string().trim().min(1).max(24);
export const secretSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const codeSchema = z.string().regex(/^[A-Z0-9]{6}$/);
export const envelopeSchema = z.object({
  requestId: target,
  matchId: target,
  phaseId: z.number().int().min(0),
});
export const hostSchema = envelopeSchema.extend({
  action: z.enum(["start", "pause", "resume", "end", "learning", "advance", "speed"]),
  enabled: z.boolean().optional(),
  speed: z.enum(["manual", "normal", "fast"]).optional(),
});
export const rosterSchema = z.discriminatedUnion("action", [
  envelopeSchema.extend({ action: z.literal("remove-player"), playerId: target }).strict(),
  envelopeSchema.extend({ action: z.literal("delete-crew"), crewId: target }).strict(),
]);
export const scenarioSchema = z.enum([
  "fresh",
  "split",
  "treasure",
  "critical",
  "question",
  "final",
  "rivalry",
]);
export const bootstrapSchema = z.object({
  hostSecret: secretSchema,
  scenario: scenarioSchema,
  players: z.array(z.object({ clientId: target, bootstrapSecret: secretSchema })).length(10),
});
