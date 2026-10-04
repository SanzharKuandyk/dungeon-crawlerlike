import { z } from "zod";
import { CLASS_IDS } from "./constants.js";

export const classSchema = z.enum(CLASS_IDS);
const part = z.enum(["body", "weak-point"]);
const target = z.string().min(1).max(100);
export const actionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("attack"), part }).strict(),
  z.object({ kind: z.literal("brace") }).strict(),
  z
    .object({
      kind: z.literal("use-item"),
      itemId: target,
      targetHeroId: target,
      inventoryRevision: z.number().int().min(0),
    })
    .strict(),
  z.object({ kind: z.literal("protect"), targetHeroId: target }).strict(),
  z.object({ kind: z.literal("mend"), targetHeroId: target }).strict(),
  z.object({ kind: z.literal("hex"), part }).strict(),
  z.object({ kind: z.literal("pilfer") }).strict(),
  z.object({ kind: z.literal("skirmish"), part }).strict(),
  z.object({ kind: z.literal("channel"), part }).strict(),
  z.object({ kind: z.literal("ward"), targetHeroId: target }).strict(),
  z.object({ kind: z.literal("observe") }).strict(),
]);
export const campSchema = z.enum([
  "rest",
  "continue",
  "rescue",
  "leave",
  "risk",
  "recover-health",
  "recover-stress",
  "sacrifice",
]);
export const classDefinitionSchema = z
  .object({
    id: classSchema,
    name: z.string().min(1),
    skill: z.string().min(1),
    description: z.string().min(1),
    maxCrewSize: z.literal(4),
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
export const nameSchema = z.string().trim().min(1).max(24);
export const secretSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const codeSchema = z.string().regex(/^[A-Z0-9]{6}$/);
export const envelopeSchema = z.object({
  requestId: target,
  matchId: target,
  phaseId: z.number().int().min(0),
});
export const rosterSchema = z.discriminatedUnion("action", [
  envelopeSchema.extend({ action: z.literal("remove-player"), playerId: target }).strict(),
  envelopeSchema.extend({ action: z.literal("delete-crew"), crewId: target }).strict(),
]);
export const scenarioSchema = z.enum([
  "duel",
  "reward",
  "reward-full",
  "result",
  "fresh",
  "split",
  "treasure",
  "critical",
  "question",
  "final",
  "rivalry",
  "injuries",
  "panic",
  "overflow",
  "shop",
  "revival",
  "rescue",
  "boss-transition",
  "trial-intro",
  "trial-board",
  "trial-wager",
  "trial-answer",
  "trial-reveal",
  "trial-reward",
  "trial-return",
]);
export const bootstrapSchema = z.object({
  hostSecret: secretSchema,
  scenario: scenarioSchema,
  players: z.array(z.object({ clientId: target, bootstrapSecret: secretSchema })).length(10),
});
