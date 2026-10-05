import type { HeroAction } from "../../shared/command-types.js";
import type { Hero, MatchState } from "../../shared/game-types.js";
import { ownsItem } from "../inventory/inventory.js";
import { calculateHealing, healingAmount, outgoingDamage } from "./damage.js";
import { barrierAmount, braceBarrier } from "./protection.js";
export const SKILLS = {
  knight: "protect",
  physician: "mend",
  occultist: "hex",
  scavenger: "pilfer",
  wanderer: "skirmish",
  exorcist: "channel",
} as const;
export function legalHeroActions(state: MatchState, hero: Hero): HeroAction[] {
  const p = state.crewProgress[hero.crewId];
  if (p?.phase.kind !== "combat") return [];
  const enemy = state.encounters.find((e) => e.id === p.encounterId);
  const living = state.heroes.filter((h) => h.crewId === hero.crewId && h.status === "alive");
  if (hero.status === "dead" || !enemy || enemy.status !== "active")
    return [
      { kind: "observe" },
      ...living.map((h) => ({ kind: "ward" as const, targetHeroId: h.id })),
    ];
  const targets = enemy.enemies.filter((e) => e.hp > 0);
  const actions: HeroAction[] = [
    { kind: "brace" },
    ...targets.map((e) => ({ kind: "attack" as const, enemyId: e.id })),
  ];
  if (p.turn >= hero.skillReadyTurn) {
    const skill = SKILLS[hero.classId];
    if (skill === "protect" || skill === "mend")
      for (const target of living.filter(
        (h) => skill !== "mend" || h.hp < h.maxHp || h.conditions.combatEffects.length,
      ))
        actions.push({ kind: skill, targetHeroId: target.id });
    else for (const target of targets) actions.push({ kind: skill, enemyId: target.id });
  }
  for (const item of hero.inventory.backpack.filter((i) =>
    ["draught", "bandage", "tonic"].includes(i.kind),
  )) {
    for (const target of living.filter((h) =>
      item.kind === "tonic"
        ? h.stress > 0
        : h.hp < h.maxHp || (item.kind === "bandage" && h.conditions.combatEffects.length > 0),
    ))
      actions.push({
        kind: "use-item",
        itemId: item.id,
        targetHeroId: target.id,
        inventoryRevision: hero.inventory.revision,
      });
  }
  return actions;
}
export type ActionEffect = {
  stat: "damage" | "healing" | "barrier" | "stress" | "gold" | "bleed" | "mark";
  value: number;
};
export function actionEffects(
  hero: Hero,
  action: HeroAction | null,
  target: Hero = hero,
  skirmishStress = 2,
): ActionEffect[] {
  if (!action) return [];
  const heal = (base: number) => calculateHealing(target, healingAmount(hero, base)).restored;
  if (action.kind === "brace") {
    const purpose = !hero.encounterUses.includes("clear-purpose")
      ? (hero.conditions.blessings.find((b) => b.kind === "clear-purpose")?.rank ?? 0)
      : 0;
    return [
      { stat: "barrier", value: barrierAmount(hero, braceBarrier(hero)) },
      { stat: "stress", value: -Math.min(hero.stress, 1 + purpose) },
    ];
  }
  if (action.kind === "protect")
    return [{ stat: "barrier", value: barrierAmount(target, 3 * hero.power) }];
  if (action.kind === "mend")
    return [
      { stat: "healing", value: heal(2 * hero.power) },
      { stat: "bleed", value: -1 },
    ];
  if (action.kind === "ward")
    return [{ stat: "barrier", value: Math.min(hero.power, target.power) }];
  if (action.kind === "observe") return [];
  if (action.kind === "use-item") {
    const kind = ownsItem(hero.inventory, action.itemId)?.kind;
    return kind === "tonic"
      ? [{ stat: "stress", value: -Math.min(3, target.stress) }]
      : [
          { stat: "healing", value: heal((kind === "draught" ? 2 : 1) * target.power) },
          ...(kind === "bandage" ? [{ stat: "bleed" as const, value: -1 }] : []),
        ];
  }
  const multiplier = action.kind === "pilfer" || action.kind === "channel" ? 1 : 2;
  const effects: ActionEffect[] = [
    {
      stat: "damage",
      value: outgoingDamage(hero, multiplier * hero.power),
    },
  ];
  if (action.kind === "hex")
    effects.push({ stat: "mark", value: hero.power }, { stat: "stress", value: 2 });
  if (action.kind === "skirmish") {
    effects.push({ stat: "barrier", value: barrierAmount(hero, hero.power) });
    if (skirmishStress) effects.push({ stat: "stress", value: skirmishStress });
  }
  if (action.kind === "channel")
    effects.push(
      { stat: "healing", value: heal(hero.power) },
      { stat: "stress", value: -Math.min(1, hero.stress) },
    );
  if (action.kind === "pilfer") effects.push({ stat: "gold", value: hero.power });
  return effects;
}
export function actionPreview(
  hero: Hero,
  action: HeroAction | null,
  target: Hero = hero,
  skirmishStress = 2,
) {
  if (!action) return "Choose an action";
  if (action.kind === "observe") return "Observe";
  const text = actionEffects(hero, action, target, skirmishStress)
    .map(({ stat, value }) => {
      if (stat === "bleed") return "remove Bleed";
      if (stat === "stress") return `${value > 0 ? "+" : "−"}${Math.abs(value)} stress`;
      if (stat === "gold") return `+${value} gold once`;
      return `${value} ${action.kind === "ward" && stat === "barrier" ? "aid barrier" : stat}`;
    })
    .join(" · ");
  return text + (action.kind === "use-item" ? " · one action" : "");
}
