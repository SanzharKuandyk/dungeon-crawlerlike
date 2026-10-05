import { z } from "zod";
import { envelopeSchema } from "./validation.js";

const id = z.string().min(1).max(200);
export const inventoryCommandSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("blessing"),
      offerId: id,
      replace: z
        .enum([
          "iron-nerve",
          "opener",
          "last-stand",
          "field-medic",
          "clear-purpose",
          "second-breath",
        ])
        .nullable(),
    })
    .strict(),
  z.object({ kind: z.literal("splint"), itemId: id, injury: z.enum(["arm", "leg"]) }).strict(),
  z.object({ kind: z.literal("keep-overflow"), itemId: id }).strict(),
  z.object({ kind: z.literal("equip"), itemId: id }).strict(),
  z.object({ kind: z.literal("sell"), itemId: id }).strict(),
  z.object({ kind: z.literal("unequip"), slot: z.enum(["weapon", "armor", "charm"]) }).strict(),
  z.object({ kind: z.literal("transfer"), itemId: id, targetHeroId: id }).strict(),
  z.object({ kind: z.literal("overflow"), itemId: id, replaceItemId: id.nullable() }).strict(),
]);
export const inventoryEnvelopeSchema = envelopeSchema
  .extend({ inventoryRevision: z.number().int().min(0), command: inventoryCommandSchema })
  .strict();
export const shopSchema = envelopeSchema
  .extend({ offerId: id, inventoryRevision: z.number().int().min(0) })
  .strict();
export const upgradeSchema = shopSchema.extend({ targetItemId: id }).strict();
export const treatmentSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("heal") }).strict(),
  z.object({ kind: z.literal("calm") }).strict(),
  z.object({ kind: z.literal("injury"), injury: z.enum(["arm", "leg"]) }).strict(),
  z
    .object({
      kind: z.literal("affliction"),
      affliction: z.enum(["shaken", "doubtful", "brittle", "haunted"]),
    })
    .strict(),
]);
