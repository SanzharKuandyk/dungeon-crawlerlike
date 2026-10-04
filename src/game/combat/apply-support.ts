import type { HeroAction } from "../../shared/command-types.js";
import { ACTION_NAMES, CLASS_NAMES } from "../../shared/display-names.js";
import type { Hero, MatchState } from "../../shared/game-types.js";
import { consumeItem, ownsItem } from "../inventory/inventory.js";
import { goldReward } from "../progression/economy.js";
import { expeditionEvent } from "../progression/events.js";
import { applyStress, useOnce } from "./conditions.js";
import { calculateHealing, healingAmount } from "./damage.js";
import { barrierAmount, braceBarrier } from "./protection.js";

export function applyHealing(state: MatchState, source: Hero, target: Hero, amount: number) {
  amount = healingAmount(source, amount);
  const result = calculateHealing(target, amount);
  if (result.restored > 0) {
    if (source.inventory.equipment.charm?.kind === "healer-charm") useOnce(source, "healer-charm");
    if (source.conditions.blessings.some((b) => b.kind === "field-medic"))
      useOnce(source, "field-medic");
  }
  target.hp = result.hp;
  expeditionEvent(
    state,
    source.crewId,
    { kind: "hero", actor: source.id, hero: target },
    `${state.players.find((p) => p.id === target.playerId)?.name} heals ${result.restored}.`,
    0.12,
    "heal",
  );
}
export function applySupport(
  state: MatchState,
  hero: Hero,
  action: HeroAction,
  barriers: Map<string, number>,
) {
  const add = (target: Hero, amount: number) => {
    barriers.set(target.id, (barriers.get(target.id) ?? 0) + barrierAmount(target, amount));
    expeditionEvent(
      state,
      hero.crewId,
      {
        kind: "effect",
        actor: hero.id,
        effect: { type: "barrier", target: target.id, amount: barrierAmount(target, amount) },
      },
      `${CLASS_NAMES[hero.classId]} protects ${state.players.find((p) => p.id === target.playerId)?.name}.`,
      0.15,
      "barrier",
    );
  };
  const target =
    "targetHeroId" in action
      ? state.heroes.find(
          (h) => h.id === action.targetHeroId && h.crewId === hero.crewId && h.status === "alive",
        )
      : hero;
  if (action.kind === "ward") {
    if (target)
      barriers.set(
        `aid:${target.id}`,
        Math.min(
          target.power,
          (barriers.get(`aid:${target.id}`) ?? 0) + Math.min(hero.power, target.power),
        ),
      );
    return;
  }
  if (hero.status === "dead") return;
  if (action.kind === "brace") {
    add(hero, braceBarrier(hero));
    const purpose = hero.conditions.blessings.find((b) => b.kind === "clear-purpose");
    applyStress(hero, -1 - (purpose && useOnce(hero, "clear-purpose") ? purpose.rank : 0));
  }
  if (action.kind === "protect" && target) add(target, 3 * hero.power);
  if (action.kind === "mend" && target) {
    applyHealing(state, hero, target, 2 * hero.power);
    target.conditions.combatEffects = [];
  }
  if (action.kind === "hex") applyStress(hero, 2);
  if (action.kind === "skirmish") {
    add(hero, hero.power);
    applyStress(hero, state.content.balance?.skirmishStress ?? 2);
  }
  if (action.kind === "channel") {
    applyHealing(state, hero, hero, hero.power);
    applyStress(hero, -1);
  }
  if (action.kind === "pilfer") {
    const enemy = state.encounters.find(
      (e) => e.id === state.crewProgress[hero.crewId].encounterId,
    );
    if (enemy && !enemy.pilfered.includes(hero.id)) {
      enemy.pilfered.push(hero.id);
      const crew = state.crews.find((c) => c.id === hero.crewId);
      if (crew) {
        crew.economy = goldReward(crew, hero.power);
        expeditionEvent(
          state,
          crew.id,
          { kind: "crew", actor: hero.id, crew },
          `Steal gains ${hero.power} gold.`,
          0.25,
          "pilfer",
        );
      }
    }
  }
  if (action.kind === "use-item" && target) {
    const item = ownsItem(hero.inventory, action.itemId);
    if (!item || action.inventoryRevision !== hero.inventory.revision)
      throw new Error("Consumable changed before lock.");
    if (item.kind === "tonic") applyStress(target, -3);
    else {
      applyHealing(state, hero, target, (item.kind === "draught" ? 2 : 1) * target.power);
      if (item.kind === "bandage") target.conditions.combatEffects = [];
    }
    hero.inventory = consumeItem(hero.inventory, item.id);
  }
  expeditionEvent(
    state,
    hero.crewId,
    { kind: "hero", actor: hero.id, hero },
    `${CLASS_NAMES[hero.classId]} uses ${ACTION_NAMES[action.kind]}.`,
    0.18,
    "action",
  );
}
