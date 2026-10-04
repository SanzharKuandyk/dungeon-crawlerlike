import type { EnemyPart } from "../../shared/command-types.js";
import type { Hero } from "../../shared/game-types.js";
export type DamageOutcome = { attempted: number; blocked: number; damage: number; hp: number };
export type HealingOutcome = { restored: number; hp: number };
export function healingAmount(source: Hero, base: number) {
  const charm =
    source.inventory.equipment.charm?.kind === "healer-charm" &&
    !source.encounterUses.includes("healer-charm")
      ? source.power
      : 0;
  const medic = !source.encounterUses.includes("field-medic")
    ? (source.conditions.blessings.find((b) => b.kind === "field-medic")?.rank ?? 0) * source.power
    : 0;
  return base + charm + medic;
}
export function calculateDamage(hp: number, attempted: number, barrier = 0): DamageOutcome {
  const blocked = Math.min(attempted, barrier);
  const damage = Math.min(hp, attempted - blocked);
  return { attempted, blocked, damage, hp: hp - damage };
}
export function calculateHealing(hero: Hero, amount: number): HealingOutcome {
  const restored =
    hero.status === "dead" || hero.hp === 0 ? 0 : Math.min(hero.maxHp - hero.hp, amount);
  return { restored, hp: hero.hp + restored };
}
export function outgoingDamage(hero: Hero, base: number, part: EnemyPart, stress = hero.stress) {
  let amount = base;
  const weapon = hero.inventory.equipment.weapon?.kind;
  if (
    (weapon === "body-blade" && part === "body") ||
    (weapon === "seal-pick" && part === "weak-point")
  )
    amount += hero.power;
  if (
    hero.conditions.afflictions.some((a) => a.kind === "doubtful") &&
    !hero.encounterUses.includes("doubtful")
  )
    amount -= hero.power;
  if (part === "weak-point" && !hero.encounterUses.includes("sealbreaker"))
    amount +=
      (hero.conditions.blessings.find((b) => b.kind === "sealbreaker")?.rank ?? 0) * hero.power;
  amount *= stress >= 7 ? 0.8 : stress >= 4 ? 0.9 : 1;
  if (hero.conditions.injuries.includes("arm")) amount *= 0.75;
  return Math.max(1, Math.floor(amount));
}
