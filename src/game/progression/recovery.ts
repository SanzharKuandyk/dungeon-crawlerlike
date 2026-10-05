import type { Hero, MatchState } from "../../shared/game-types.js";
import type { Treatment } from "../../shared/inventory-types.js";
import { calculateHealing } from "../combat/damage.js";
import { treatmentCost } from "../inventory/shops.js";
export function reviveHero(hero: Hero) {
  hero.status = "alive";
  hero.hp = Math.ceil(hero.maxHp / 2);
  hero.stress = Math.min(9, Math.max(3, hero.stress));
  hero.conditions.combatEffects = [];
  hero.block = 0;
  hero.nextTurnBlock = 0;
}
export function rebalanceAllowances(state: MatchState, crewId: string) {
  const crew = state.crews.find((c) => c.id === crewId);
  if (!crew?.shop) return;
  const entries = Object.entries(crew.shop.allowances),
    total = entries.reduce((n, [, v]) => n + v, 0);
  if (total <= crew.economy.gold) return;
  const budget = crew.economy.gold;
  const scaled = entries.map(([id, v], index) => ({
    id,
    index,
    value: Math.floor((v * budget) / total),
    remainder: (v * budget) % total,
  }));
  let remaining = budget - scaled.reduce((n, e) => n + e.value, 0);
  for (const e of scaled.slice().sort((a, b) => b.remainder - a.remainder || a.index - b.index))
    if (remaining-- > 0) e.value++;
  crew.shop.allowances = Object.fromEntries(scaled.map((e) => [e.id, e.value]));
}
export function reviveAlly(
  state: MatchState,
  actor: Hero,
  targetId: string,
  payment: "gold" | "debt",
) {
  const target = state.heroes.find((h) => h.id === targetId && h.crewId === actor.crewId);
  const crew = state.crews.find((c) => c.id === actor.crewId);
  if (
    !crew ||
    actor.status !== "alive" ||
    !target ||
    target.id === actor.id ||
    target.status !== "dead"
  )
    throw new Error("A living teammate must select a fallen ally.");
  const price = 2 * target.power;
  if (payment === "gold") {
    if (crew.economy.gold < price) throw new Error("Not enough crew gold. Choose assistance debt.");
    crew.economy.gold -= price;
  } else {
    if (crew.economy.gold >= price)
      throw new Error("Use available crew gold before assistance debt.");
    crew.economy.rescueDebt += price;
  }
  reviveHero(target);
  crew.status = "active";
  state.crewProgress[crew.id].helpRequests = state.crewProgress[crew.id].helpRequests.filter(
    (id) => id !== target.id,
  );
  rebalanceAllowances(state, crew.id);
}
export function applyRescue(state: MatchState, crewId: string) {
  const crew = state.crews.find((c) => c.id === crewId),
    heroes = state.heroes.filter((h) => h.crewId === crewId);
  if (!crew || !heroes.length || heroes.some((h) => h.status === "alive"))
    throw new Error("External rescue is only for a fully fallen crew.");
  crew.economy.gold = Math.floor(crew.economy.gold / 2);
  crew.economy.rescueDebt += state.content.balance?.rescueDebt ?? 24;
  heroes.forEach(reviveHero);
  crew.status = "active";
  state.crewProgress[crew.id].helpRequests = [];
  rebalanceAllowances(state, crew.id);
}
export function applyTreatment(state: MatchState, hero: Hero, treatment: Treatment) {
  const crew = state.crews.find((c) => c.id === hero.crewId);
  if (!crew?.shop || hero.status !== "alive")
    throw new Error("A living character can receive treatment at a safe stop.");
  const price = treatmentCost(hero, treatment);
  if (price > (crew.shop.allowances[hero.id] ?? 0) || price > crew.economy.gold)
    throw new Error("Not enough gold in your budget.");
  if (treatment.kind === "heal") hero.hp = calculateHealing(hero, 2 * hero.power).hp;
  if (treatment.kind === "calm") hero.stress = Math.max(0, hero.stress - 3);
  if (treatment.kind === "injury") {
    if (!hero.conditions.injuries.includes(treatment.injury))
      throw new Error("That injury is absent.");
    hero.conditions.injuries = hero.conditions.injuries.filter((i) => i !== treatment.injury);
  }
  if (treatment.kind === "affliction") {
    if (!hero.conditions.afflictions.some((a) => a.kind === treatment.affliction))
      throw new Error("That curse is absent.");
    hero.conditions.afflictions = hero.conditions.afflictions.filter(
      (a) => a.kind !== treatment.affliction,
    );
  }
  crew.shop.allowances[hero.id] -= price;
  crew.economy.gold -= price;
}
