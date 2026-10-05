import { readFile } from "node:fs/promises";
import { z } from "zod";
import { validateTrialPack } from "../game/trials/board.js";
import type { DungeonContent } from "../shared/content-types.js";
import { trialPackSchema } from "../shared/trial-validation.js";
import { classDefinitionSchema, roomDefinitionSchema } from "../shared/validation.js";

const balanceSchema = z
  .object({
    ordinaryHealthBase: z.number().int().positive(),
    eliteHealthBase: z.number().int().positive(),
    bossHealthBase: z.number().int().positive(),
    startingGold: z.number().int().positive(),
    ordinaryReward: z.number().int().positive(),
    eliteReward: z.number().int().positive(),
    bossReward: z.number().int().positive(),
    cacheReward: z.number().int().positive(),
    rescueDebt: z.number().int().positive(),
    ordinaryTurns: z.number().int().positive(),
    eliteTurns: z.number().int().positive(),
    bossTurns: z.number().int().positive(),
    injuryChance: z.number().min(0).max(100),
    backpackSlots: z.literal(6),
    stackLimit: z.literal(3),
    signatureCooldown: z.literal(2),
    skirmishStress: z.number().int().min(0).max(3),
    trialGoldPer100: z.number().int().nonnegative().optional(),
  })
  .strict();
const enemyMoveSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    target: z.enum(["rotating", "wounded", "none"]),
    damagePower: z.number().nonnegative(),
    stress: z.number().int().nonnegative(),
    stressPerPhase: z.boolean(),
    blockPower: z.number().nonnegative(),
    recipient: z.enum(["self", "ally"]).nullable(),
    bleed: z.boolean(),
    injury: z.enum(["arm", "leg"]).nullable(),
    injuryChance: z.number().min(0).max(100),
    finalPhaseDamagePower: z.number().nonnegative(),
  })
  .strict();
const enemyPatternSchema = z
  .object({
    name: z.string().min(1),
    moves: z.tuple([enemyMoveSchema, enemyMoveSchema, enemyMoveSchema]),
  })
  .strict();
const enemyPatternsSchema = z
  .object({
    raider: enemyPatternSchema,
    guard: enemyPatternSchema,
    whisperer: enemyPatternSchema,
    supporter: enemyPatternSchema,
    devourer: enemyPatternSchema,
    "iron-warden": enemyPatternSchema,
    "hollow-regent": enemyPatternSchema,
  })
  .strict();
export async function loadContent(): Promise<DungeonContent> {
  const read = async (name: string): Promise<unknown> => JSON.parse(await readFile(name, "utf8"));
  const classes = classDefinitionSchema.array().parse(await read("content/dungeon/classes.json"));
  const rooms = roomDefinitionSchema.array().parse(await read("content/dungeon/rooms.json"));
  let trialPack: import("../shared/trial-types.js").TrialPack;
  try {
    trialPack = trialPackSchema.parse(await read("content/learning/trials.reviewed.json"));
    validateTrialPack(trialPack, true);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    trialPack = trialPackSchema.parse(await read("content/learning/trials.fixture.json"));
    validateTrialPack(trialPack);
  }
  return {
    classes,
    rooms,
    trialPack,
    balance: balanceSchema.parse(await read("content/dungeon/balance.json")),
    enemyPatterns: enemyPatternsSchema.parse(await read("content/dungeon/enemies.json")),
    mapTemplates: z
      .array(
        z
          .object({
            chapter: z.union([z.literal(1), z.literal(2)]),
            rows: z
              .array(
                z.array(
                  z.enum([
                    "battle",
                    "elite",
                    "merchant",
                    "treasure",
                    "event",
                    "altar",
                    "siege",
                    "camp",
                    "arena",
                    "shrine",
                    "boss",
                  ]),
                ),
              )
              .length(12),
          })
          .strict(),
      )
      .length(2)
      .parse(await read("content/dungeon/maps.json")),
    sharedEvents: z
      .array(
        z
          .object({
            id: z.enum(["trial-1", "trial-2", "trial-3", "siege-1"]),
            chapter: z.union([z.literal(1), z.literal(2)]),
            row: z.number().int().min(1).max(12),
            bands: z.array(z.union([z.literal(100), z.literal(200), z.literal(300)])),
          })
          .strict(),
      )
      .length(4)
      .parse(await read("content/dungeon/shared-events.json")),
  };
}
