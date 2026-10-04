import { itemDefinition } from "../../game/inventory/catalog.js";
import { applyInventoryCommand } from "../../game/inventory/equipment.js";
import { applyPurchase, treatmentCost } from "../../game/inventory/shops.js";
import { applyRescue, applyTreatment } from "../../game/progression/recovery.js";
import type { InventoryCommand, Treatment } from "../../shared/inventory-types.js";
import { playerRun } from "../crew-decisions.js";
import { reject } from "../errors.js";
import type { StoredRoom } from "../room-types.js";
import { ownedHero } from "./hero-actions.js";

function editable(room: StoredRoom, id: string) {
  const hero = ownedHero(room, id),
    run = playerRun(room, id);
  if (
    room.state.status !== "running" ||
    room.state.trial ||
    !run ||
    run.ready.includes(id) ||
    !["camp", "route", "result", "floor-result"].includes(run.progress.phase.kind) ||
    room.duels.some((d) => d.status === "active" && d.crewIds.includes(hero.crewId))
  )
    reject("CLOSED", "Inventory operations are available at an open recovery or route decision.");
  return hero;
}
export function inventoryCommand(
  room: StoredRoom,
  id: string,
  command: InventoryCommand,
  revision: number,
  requestId = "",
) {
  const hero = editable(room, id);
  const item =
    "itemId" in command
      ? hero.inventory.backpack.find((i) => i.id === command.itemId)
      : "slot" in command
        ? hero.inventory.equipment[command.slot]
        : null;
  const previous =
    item && command.kind === "equip"
      ? hero.inventory.equipment[itemDefinition(item.kind)?.slot ?? "weapon"]
      : null;
  try {
    applyInventoryCommand(room.state, hero, command, revision);
  } catch (error) {
    reject("INVALID", error instanceof Error ? error.message : "Inventory operation unavailable.");
  }
  room.state.transactions[id] = {
    requestId,
    operation: command.kind === "equip" ? "equip" : "inventory",
    item: item?.kind ?? null,
    paid: 0,
    destination:
      command.kind === "equip"
        ? `Equipped${previous ? " · previous item added to backpack" : ""}`
        : command.kind === "unequip"
          ? "Added to backpack"
          : command.kind === "transfer"
            ? "Given to crew member"
            : command.kind === "sell"
              ? "Sold · gold returned to crew"
              : "Backpack updated",
  };
}
export function buy(
  room: StoredRoom,
  id: string,
  offerId: string,
  revision: number,
  requestId = "",
) {
  const hero = editable(room, id);
  if (playerRun(room, id)?.progress.phase.kind !== "camp")
    reject("CLOSED", "The merchant is closed.");
  const offer = room.state.crews
    .find((c) => c.id === hero.crewId)
    ?.shop?.offers[hero.id]?.find((o) => o.id === offerId);
  try {
    applyPurchase(room.state, hero, offerId, revision);
  } catch (error) {
    reject("INVALID", error instanceof Error ? error.message : "Purchase unavailable.");
  }
  room.state.transactions[id] = {
    requestId,
    operation: "buy",
    item: offer?.kind ?? null,
    paid: offer?.price ?? 0,
    destination: hero.inventory.overflow.length ? "Choose space in backpack" : "Added to backpack",
  };
}
export function treat(room: StoredRoom, id: string, treatment: Treatment, requestId = "") {
  const hero = editable(room, id);
  const paid = treatmentCost(hero, treatment);
  const hpBefore = hero.hp,
    stressBefore = hero.stress;
  try {
    applyTreatment(room.state, hero, treatment);
  } catch (error) {
    reject("INVALID", error instanceof Error ? error.message : "Treatment unavailable.");
  }
  room.state.transactions[id] = {
    requestId,
    operation: "treat",
    item: null,
    paid,
    destination:
      treatment.kind === "heal"
        ? `Health restored · +${hero.hp - hpBefore} HP`
        : treatment.kind === "calm"
          ? `Stress reduced · −${stressBefore - hero.stress}`
          : treatment.kind === "revive"
            ? `Revived · ${hero.hp} HP · ${hero.stress} stress`
            : "Condition treated",
  };
}
export function rescue(room: StoredRoom, id: string) {
  const hero = editable(room, id);
  if (hero.status !== "dead")
    reject("INVALID", "You are already revived. Choose Retry or Continue.");
  applyRescue(room.state, hero.crewId, hero.id);
}
