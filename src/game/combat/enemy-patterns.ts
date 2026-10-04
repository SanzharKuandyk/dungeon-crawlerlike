import DEFAULT_BALANCE from "../../../content/dungeon/balance.json" with { type: "json" };
import type { StructuredIntent } from "../../shared/encounter-types.js";
import type { Hero, RoomEncounter } from "../../shared/game-types.js";
export function publishedIntent(
  enemy: RoomEncounter,
  heroes: Hero[],
  turn: number,
  injuryChance?: number,
): StructuredIntent {
  const rules = enemy.rules ?? DEFAULT_BALANCE;
  injuryChance ??= rules.injuryChance;
  const family = enemy.definition.family;
  const sealed = enemy.weakHp > 0;
  const boss = enemy.kind === "boss";
  const phase = enemy.bossPhase;
  const cycle = (turn - 1) % 3;
  const defensive = family === "sentinel" ? cycle === 2 : family === "seer" && cycle === 1;
  const heavy = family === "sentinel" && cycle === 1;
  const regentStress = boss && family === "devourer" && cycle === 1;
  const name = defensive
    ? "Raise shield"
    : heavy
      ? "Crushing blow"
      : regentStress
        ? "Dread summons"
        : family === "seer"
          ? "Ash whisper"
          : family === "devourer"
            ? "Rending bite"
            : "Iron strike";
  return {
    moveId: `${family}:${cycle}:${phase}`,
    name,
    shieldGain: defensive ? enemy.spawnPower * rules.shieldPower : 0,
    sealModifier: sealed
      ? family === "sentinel"
        ? "Heavy blows add damage and can injure"
        : family === "seer"
          ? "Whispers add stress"
          : "Bites cause wounds and Bleed"
      : null,
    targets: heroes
      .filter((h) => h.status === "alive")
      .map((h) => ({
        heroId: h.id,
        damage:
          (defensive || regentStress ? 0 : h.power * rules.strikePower) +
          (heavy && sealed ? h.power * rules.heavyBonusPower : 0) +
          (family === "devourer" && !regentStress && sealed && h.hp <= h.maxHp / 2
            ? h.power * rules.woundedBonusPower
            : 0) +
          (boss &&
          phase === 3 &&
          ((family === "devourer" && !regentStress) ||
            (family === "sentinel" && heavy && sealed)) &&
          !defensive
            ? h.power * rules.finalPhaseBonusPower
            : 0),
        stress: defensive
          ? 0
          : family === "seer"
            ? rules.seerStress + (sealed ? rules.sealedStress : 0) + (boss ? phase - 1 : 0)
            : boss && family === "devourer" && cycle === 1
              ? phase
              : 0,
        bleed: family === "devourer" && sealed && !defensive && !regentStress,
        injury:
          heavy && sealed ? "arm" : family === "devourer" && sealed && cycle === 2 ? "leg" : null,
        injuryChance:
          (heavy && sealed) || (family === "devourer" && sealed && cycle === 2) ? injuryChance : 0,
      })),
  };
}
