import type { Hero, MatchState } from "../../shared/game-types.js";
import type { Treatment } from "../../shared/inventory-types.js";
import { calculateHealing } from "../combat/damage.js";
import { treatmentCost } from "../inventory/shops.js";
export function reviveHero(hero: Hero) {
  hero.status = "alive";
  hero.hp = Math.ceil(hero.maxHp / 2);
  hero.stress = 3;
  hero.conditions.combatEffects = [];
}
export function applyRescue(state: MatchState, crewId: string, heroId?: string) {
  const crew = state.crews.find((c) => c.id === crewId);
  if (!crew) throw new Error("Crew not found.");
  const heroes = state.heroes.filter(
    (h) => h.crewId === crewId && (!heroId || h.id === heroId) && h.status === "dead",
  );
  if (!heroes.length) throw new Error("No fallen character needs rescue.");
  if (!heroId) crew.economy.gold = Math.floor(crew.economy.gold / 2);
  crew.economy.rescueDebt += heroId ? 2 * heroes[0].power : 24;
  heroes.forEach(reviveHero);
  crew.status = "active";
}
export function applyTreatment(state: MatchState, hero: Hero, treatment: Treatment) {
  const crew = state.crews.find((c) => c.id === hero.crewId);
  if (!crew?.shop) throw new Error("Treatment is available at recovery stops.");
  const price = treatmentCost(hero, treatment);
  if (price > (crew.shop.allowances[hero.id] ?? 0) || price > crew.economy.gold)
    throw new Error("Not enough reserved gold; a fallen spirit can request rescue instead.");
  if (treatment.kind === "revive") {
    if (hero.status !== "dead") throw new Error("This character is alive.");
    reviveHero(hero);
    crew.status = "active";
  } else {
    if (hero.status === "dead") throw new Error("Revive before treatment.");
    if (treatment.kind === "heal") hero.hp = calculateHealing(hero, 2 * hero.power).hp;
    if (treatment.kind === "calm") hero.stress = Math.max(0, hero.stress - 3);
    if (treatment.kind === "injury") {
      if (!hero.conditions.injuries.includes(treatment.injury))
        throw new Error("That injury is absent.");
      hero.conditions.injuries = hero.conditions.injuries.filter((i) => i !== treatment.injury);
    }
    if (treatment.kind === "affliction") {
      if (!hero.conditions.afflictions.some((a) => a.kind === treatment.affliction))
        throw new Error("That Affliction is absent.");
      hero.conditions.afflictions = hero.conditions.afflictions.filter(
        (a) => a.kind !== treatment.affliction,
      );
    }
  }
  crew.shop.allowances[hero.id] -= price;
  crew.economy.gold -= price;
}
