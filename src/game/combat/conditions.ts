import type { AfflictionKind, InjuryKind } from "../../shared/condition-types.js";
import type { Hero } from "../../shared/game-types.js";
import { nextRandom } from "../random.js";
import { calculateDamage } from "./damage.js";
export const hasAffliction = (hero: Hero, kind: AfflictionKind) =>
  hero.conditions.afflictions.some((a) => a.kind === kind);
export function useOnce(hero: Hero, key: string) {
  if (hero.encounterUses.includes(key)) return false;
  hero.encounterUses.push(key);
  return true;
}
export function applyStress(hero: Hero, amount: number) {
  if (amount > 0) {
    const nerve = hero.conditions.blessings.find((b) => b.kind === "iron-nerve");
    if (nerve && useOnce(hero, "iron-nerve")) amount = Math.max(0, amount - nerve.rank);
    if (
      amount > 0 &&
      hero.inventory.equipment.charm?.kind === "calm-charm" &&
      useOnce(hero, "calm-charm")
    )
      amount = Math.max(0, amount - 1);
  }
  hero.stress = Math.max(0, hero.stress + amount);
}
export function applyAffliction(hero: Hero, kind: AfflictionKind) {
  if (hasAffliction(hero, kind) || hero.conditions.afflictions.length >= 2) hero.stress += 3;
  else hero.conditions.afflictions.push({ kind });
}
export function applyInjury(hero: Hero, kind: InjuryKind) {
  if (hero.conditions.injuries.includes(kind)) applyStress(hero, 2);
  else hero.conditions.injuries.push(kind);
}
export function rollInjury(rng: number, chance: number) {
  const next = nextRandom(rng);
  return {
    outcome: next.value * 100 < chance,
    roll: Math.floor(next.value * 100),
    nextRng: next.state,
  };
}
export function resolvePanic(hero: Hero) {
  if (hero.stress < 10) return false;
  hero.hp = calculateDamage(hero.hp, hero.power).hp;
  hero.stress = 6;
  applyAffliction(
    hero,
    (["shaken", "doubtful", "brittle", "haunted"] as const).find((k) => !hasAffliction(hero, k)) ??
      "shaken",
  );
  hero.stress = Math.min(9, hero.stress);
  return true;
}
