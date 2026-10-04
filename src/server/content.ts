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
    sealPower: z.number().int().positive(),
    strikePower: z.number().int().nonnegative(),
    heavyBonusPower: z.number().int().nonnegative(),
    shieldPower: z.number().int().nonnegative(),
    woundedBonusPower: z.number().int().nonnegative(),
    finalPhaseBonusPower: z.number().int().nonnegative(),
    seerStress: z.number().int().nonnegative(),
    sealedStress: z.number().int().nonnegative(),
    startingGold: z.number().int().positive(),
    ordinaryReward: z.number().int().positive(),
    eliteReward: z.number().int().positive(),
    bossReward: z.number().int().positive(),
    cacheReward: z.number().int().positive(),
    rescueDebt: z.number().int().positive(),
    ordinaryTurns: z.number().int().positive(),
    bossTurns: z.number().int().positive(),
    injuryChance: z.number().min(0).max(100),
    backpackSlots: z.literal(6),
    stackLimit: z.literal(3),
    signatureCooldown: z.literal(2),
    skirmishStress: z.number().int().min(0).max(3),
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
  };
}
