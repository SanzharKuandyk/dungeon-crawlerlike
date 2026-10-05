import { z } from "zod";
import { envelopeSchema } from "./validation.js";
export const rewardClaimSchema = envelopeSchema
  .extend({
    inventoryRevision: z.number().int().nonnegative(),
    claim: z
      .object({
        offerId: z.string().min(1),
        optionId: z.string().nullable(),
        disposition: z.enum(["equip", "keep", "upgrade", "leave"]),
        replacementItemId: z.string().nullable(),
      })
      .strict(),
  })
  .strict();
