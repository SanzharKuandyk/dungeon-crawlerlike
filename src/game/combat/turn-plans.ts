import type { Hero, MatchState } from "../../shared/game-types.js";
import type { TurnPlan } from "../../shared/turn-plans.js";
import { planActions } from "../../shared/turn-plans.js";
import { actionKey } from "../action-options.js";
import { legalHeroActions, SKILLS } from "./hero-actions.js";

export function defaultPlan(hero: Hero): TurnPlan {
  return hero.status === "dead"
    ? { kind: "spirit", action: { kind: "observe" } }
    : {
        kind: "hero",
        actions: [{ kind: "brace" }],
        activation: null,
        inventoryRevision: hero.inventory.revision,
      };
}
export function validateTurnPlan(state: MatchState, hero: Hero, plan: TurnPlan) {
  if ((hero.status === "dead") !== (plan.kind === "spirit"))
    throw new Error("Choose an action for your current character state.");
  if (plan.kind === "hero") {
    if (plan.inventoryRevision !== hero.inventory.revision)
      throw new Error("Your Bag changed. Review this plan.");
    const charm = hero.inventory.equipment.charm;
    if (
      plan.activation &&
      (charm?.kind !== "haste-charm" ||
        charm.id !== plan.activation.itemId ||
        hero.encounterUses.includes("haste"))
    )
      throw new Error("Haste requires your equipped, unused charm.");
    if (plan.actions.length !== (plan.activation ? 2 : 1))
      throw new Error("Choose one action, or activate Haste for two.");
    if (plan.actions.filter((a) => a.kind === SKILLS[hero.classId]).length > 1)
      throw new Error("Use your signature only once per turn.");
    if (plan.actions.filter((a) => a.kind === "use-item").length > 1)
      throw new Error("Use at most one consumable per turn.");
  }
  const legal = legalHeroActions(state, hero);
  if (planActions(plan).some((action) => !legal.some((a) => actionKey(a) === actionKey(action))))
    throw new Error("An action or target is unavailable.");
}
