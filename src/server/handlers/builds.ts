import { itemDefinition } from "../../game/inventory/catalog.js";
import { applyInventoryCommand } from "../../game/inventory/equipment.js";
import { applyPurchase, applyUpgrade, treatmentCost } from "../../game/inventory/shops.js";
import { expeditionEvent } from "../../game/progression/events.js";
import { applyTreatment, reviveAlly } from "../../game/progression/recovery.js";
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
    room.state.siege ||
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
  if (command.kind === "sell") {
    const progress = room.state.crewProgress[hero.crewId];
    const node = room.state.chapterMaps[progress.chapter - 1].nodes.find(
      (n) => n.id === progress.nodeId,
    );
    if (progress.phase.kind !== "camp" || node?.kind !== "merchant")
      reject("CLOSED", "Sell items at a merchant.");
  }
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
        ? `Equipped${previous ? ` · ${itemDefinition(previous.kind)?.name} replaced; previous item added to backpack` : ""}`
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
  const progress = room.state.crewProgress[hero.crewId];
  if (
    room.state.chapterMaps[progress.chapter - 1].nodes.find((n) => n.id === progress.nodeId)
      ?.kind !== "merchant"
  )
    reject("CLOSED", "Equipment is sold at merchants only.");
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
          : "Condition treated",
  };
}
export function upgrade(
  room: StoredRoom,
  id: string,
  offerId: string,
  targetItemId: string,
  revision: number,
  requestId: string,
) {
  const hero = editable(room, id),
    p = room.state.crewProgress[hero.crewId];
  if (
    p.phase.kind !== "camp" ||
    room.state.chapterMaps[p.chapter - 1].nodes.find((n) => n.id === p.nodeId)?.kind !== "merchant"
  )
    reject("CLOSED", "Upgrade at a merchant.");
  try {
    const result = applyUpgrade(room.state, hero, offerId, targetItemId, revision);
    room.state.transactions[id] = {
      requestId,
      operation: "inventory",
      ...result,
      destination: "Upgraded to rank II · same slot",
    };
  } catch (error) {
    reject("INVALID", error instanceof Error ? error.message : "Upgrade unavailable.");
  }
}
export function rescue(room: StoredRoom, id: string) {
  recoverCrew(room, id, { kind: "request-help" });
}
export function recoverCrew(
  room: StoredRoom,
  id: string,
  command: import("../../shared/crew-recovery-types.js").CrewRecoveryCommand,
) {
  const actor = editable(room, id),
    run = playerRun(room, id);
  if (!run || !["camp", "result", "floor-result"].includes(run.progress.phase.kind))
    reject("CLOSED", "Revival is available at safe recovery decisions.");
  const node = room.state.chapterMaps[run.progress.chapter - 1].nodes.find(
    (n) => n.id === run.progress.nodeId,
  );
  if (
    run.progress.phase.kind === "camp" &&
    !run.progress.recovering &&
    !["camp", "merchant", "shrine"].includes(node?.kind ?? "")
  )
    reject("CLOSED", "Recover at a camp, merchant, shrine or postfight result.");
  if (run?.pauseReasons.length || room.state.siege)
    reject("PAUSED", "Finish the current event before recovery.");
  if (command.kind === "request-help") {
    if (actor.status !== "dead") reject("INVALID", "Only fallen students need revival help.");
    const p = room.state.crewProgress[actor.crewId];
    if (!p.helpRequests.includes(actor.id)) p.helpRequests.push(actor.id);
    return;
  }
  try {
    reviveAlly(room.state, actor, command.targetHeroId, command.payment);
  } catch (error) {
    reject("INVALID", error instanceof Error ? error.message : "Revival unavailable.");
  }
  const target = room.state.heroes.find((h) => h.id === command.targetHeroId);
  if (!target) reject("INVALID", "Revival target missing.");
  expeditionEvent(
    room.state,
    actor.crewId,
    { kind: "hero", actor: actor.id, hero: target },
    `${room.state.players.find((p) => p.id === actor.playerId)?.name} revived ${room.state.players.find((p) => p.id === target.playerId)?.name} · ${target.hp} HP · ${target.stress} stress.`,
    0,
    "ally-revival",
  );
  if (run) run.ready = run.ready.filter((p) => p !== target.playerId);
}
