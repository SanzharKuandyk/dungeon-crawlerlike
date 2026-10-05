import { itemDefinition, itemDescription } from "../game/inventory/catalog.js";
import type { Hero } from "../shared/game-types.js";
import { AFFLICTION_DETAILS, blessingDescription } from "../shared/trait-descriptions.js";
export type EffectBadge = {
  id: string;
  icon: string;
  label: string;
  value: string;
  detail: string;
  tone: "harm" | "benefit";
  used?: boolean;
};
export function heroEffects(hero: Hero): EffectBadge[] {
  const effects: EffectBadge[] = [];
  const add = (effect: EffectBadge) => effects.push(effect);
  if (hero.stress >= 4)
    add({
      id: "stress",
      icon: "stress",
      label: "Strained",
      value: `−${hero.stress >= 7 ? 20 : 10}%`,
      tone: "harm",
      detail: `${hero.stress >= 7 ? "20% less damage; risky odds reduced by 10 percentage points" : "10% less damage"}. Panic at 10 stress.`,
    });
  for (const injury of hero.conditions.injuries)
    add({
      id: injury,
      icon: injury,
      label: `${injury === "arm" ? "Arm" : "Leg"} injury`,
      value: "−25%",
      tone: "harm",
      detail: `25% less ${injury === "arm" ? "outgoing damage" : "Block barrier"}. Persists until treated at a recovery stop.`,
    });
  for (const effect of hero.conditions.combatEffects)
    add({
      id: effect.kind,
      icon: effect.kind,
      label: "Bleed",
      value: `−${hero.power}/turn · ${effect.turns}t`,
      tone: "harm",
      detail: `Up to ${hero.power} damage at the end of each turn; ${effect.turns} turn${effect.turns === 1 ? "" : "s"} remaining. Remaining barrier can absorb it. Heal or a Bandage removes Bleed.`,
    });
  for (const affliction of hero.conditions.afflictions)
    add({
      id: affliction.kind,
      icon: affliction.kind,
      label: affliction.kind[0].toUpperCase() + affliction.kind.slice(1),
      value: "",
      tone: "harm",
      detail: AFFLICTION_DETAILS[affliction.kind].replace("power", String(hero.power)),
    });
  for (const blessing of hero.conditions.blessings) {
    const used =
      blessing.spent ||
      (blessing.kind === "second-breath" ? hero.expeditionUses : hero.encounterUses).includes(
        blessing.kind,
      );
    add({
      id: blessing.kind,
      icon: blessing.kind,
      label: blessing.kind
        .split("-")
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(" "),
      value: used ? "Used" : `Rank ${"I".repeat(blessing.rank)}`,
      tone: "benefit",
      used,
      detail: `${blessingDescription(blessing.kind, blessing.rank, hero.power)} ${used ? (blessing.kind === "second-breath" ? "Already spent this expedition." : "Available again next encounter.") : "Ready to trigger."}`,
    });
  }
  for (const item of Object.values(hero.inventory.equipment)) {
    if (!item) continue;
    const used = hero.encounterUses.includes(item.kind === "haste-charm" ? "haste" : item.kind);
    add({
      id: item.id,
      icon: item.kind,
      label: itemDefinition(item.kind)?.name ?? item.kind,
      value: used ? "Used" : "",
      tone: "benefit",
      used,
      detail: `${itemDescription(item.kind, hero.power, item.rank)}. ${used ? "Available again next encounter." : "Equipped effect."}`,
    });
  }
  return effects;
}
