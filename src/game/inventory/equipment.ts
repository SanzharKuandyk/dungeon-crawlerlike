import type { Hero, MatchState } from "../../shared/game-types.js";
import type { InventoryCommand } from "../../shared/inventory-types.js";
import { itemDefinition } from "./catalog.js";
import { addItem, consumeItem } from "./inventory.js";

export function applyInventoryCommand(
  state: MatchState,
  hero: Hero,
  command: InventoryCommand,
  revision: number,
) {
  if (hero.inventory.revision !== revision) throw new Error("Your backpack changed. Choose again.");
  if (command.kind === "blessing") {
    if (command.offerId !== "decline") {
      const offer = hero.pendingBlessings.find((o) => o.id === command.offerId);
      if (!offer) throw new Error("This Blessing offer is closed.");
      const current = hero.conditions.blessings.find((b) => b.kind === offer.kind);
      if (current) current.rank = Math.max(current.rank, offer.rank) as 1 | 2;
      else {
        if (hero.conditions.blessings.length === 2) {
          const index = hero.conditions.blessings.findIndex((b) => b.kind === command.replace);
          if (index < 0) throw new Error("Choose a Blessing to replace.");
          hero.conditions.blessings.splice(index, 1);
        }
        hero.conditions.blessings.push({
          kind: offer.kind,
          rank: offer.rank,
          spent: hero.expeditionUses.includes(offer.kind),
        });
      }
    }
    hero.pendingBlessings = [];
    hero.inventory.revision++;
    return;
  }
  if (command.kind === "splint") {
    if (
      hero.status !== "alive" ||
      !hero.conditions.injuries.includes(command.injury) ||
      !hero.inventory.backpack.some((i) => i.id === command.itemId && i.kind === "splint")
    )
      throw new Error("Choose your splint and an existing injury.");
    hero.inventory = consumeItem(hero.inventory, command.itemId);
    hero.conditions.injuries = hero.conditions.injuries.filter((i) => i !== command.injury);
    return;
  }
  const next = structuredClone(hero.inventory);
  if (command.kind === "keep-overflow") {
    const item = next.overflow.find((i) => i.id === command.itemId);
    if (!item || next.backpack.length >= 6) throw new Error("Make backpack space first.");
    next.overflow = next.overflow.filter((i) => i.id !== item.id);
    next.backpack.push(item);
    next.revision++;
    hero.inventory = next;
    return;
  }
  if (command.kind === "unequip") {
    const equipped = next.equipment[command.slot];
    if (!equipped) throw new Error("That slot is empty.");
    if (next.backpack.length >= 6) throw new Error("Make space in the backpack first.");
    next.backpack.push(equipped);
    next.equipment[command.slot] = null;
  } else if (command.kind === "overflow") {
    const item = next.overflow.find((i) => i.id === command.itemId);
    if (!item) throw new Error("Reward already handled.");
    next.overflow = next.overflow.filter((i) => i.id !== item.id);
    if (command.replaceItemId !== null) {
      const old = next.backpack.find((i) => i.id === command.replaceItemId);
      if (!old) throw new Error("Choose a backpack item to replace.");
      next.backpack = next.backpack.filter((i) => i.id !== old.id);
      next.backpack.push(item);
    }
  } else {
    const item = next.backpack.find((i) => i.id === command.itemId);
    if (!item) throw new Error("Choose an owned item.");
    const definition = itemDefinition(item.kind);
    if (!definition) throw new Error("Unknown item.");
    next.backpack = next.backpack.filter((i) => i.id !== item.id);
    if (command.kind === "equip") {
      if (!definition.slot) throw new Error("Consumables belong in the backpack.");
      const previous = next.equipment[definition.slot];
      if (previous) next.backpack.push(previous);
      next.equipment[definition.slot] = item;
    } else if (command.kind === "sell") {
      const crew = state.crews.find((c) => c.id === hero.crewId);
      if (!crew?.shop) throw new Error("Sell at a merchant.");
      crew.economy.gold += Math.floor((definition.pricePower * hero.power * item.count) / 2);
    } else {
      const target = state.heroes.find(
        (h) => h.id === command.targetHeroId && h.crewId === hero.crewId && h.id !== hero.id,
      );
      if (!target || target.inventory.backpack.length >= 6)
        throw new Error("Choose a teammate with backpack space.");
      target.inventory = addItem(target.inventory, item);
    }
  }
  next.revision++;
  hero.inventory = next;
}
