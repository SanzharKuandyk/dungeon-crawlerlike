import type { Hero, MatchState } from "../../shared/game-types.js";
import type { EquipmentKind } from "../../shared/inventory-types.js";
import type { RewardClaim, RewardOffer, RewardOption } from "../../shared/reward-types.js";
import { equipmentItem, ITEMS, itemDefinition, makeItem } from "../inventory/catalog.js";
import { addItem } from "../inventory/inventory.js";
import { nextRandom } from "../random.js";

export function grantEquipmentOffers(
  state: MatchState,
  crewId: string,
  nodeId: string,
  heroId?: string,
) {
  for (const hero of state.heroes.filter(
    (h) => h.crewId === crewId && (!heroId || h.id === heroId),
  )) {
    const id = `${state.id}:reward:${nodeId}:${hero.id}`;
    if (state.rewardOffers.some((o) => o.id === id)) continue;
    const owned = [
      ...hero.inventory.backpack,
      ...hero.inventory.overflow,
      ...Object.values(hero.inventory.equipment),
    ].filter((i) => i !== null);
    const eligible = ITEMS.filter(
      (i) =>
        i.slot &&
        (i.kind !== "haste-charm" ||
          state.crewProgress[crewId].chapter > 1 ||
          state.crewProgress[crewId].depth >= 4),
    ).filter((i) => !owned.some((o) => o.kind === i.kind && "rank" in o && o.rank === 2));
    let rng =
      state.rewardRng[crewId] ??
      (state.rewardSeed ^ ((state.crews.findIndex((c) => c.id === crewId) + 1) * 0x9e3779b9)) >>> 0;
    const options: RewardOption[] = [];
    for (let n = 0; n < Math.min(2, eligible.length); n++) {
      const remaining = eligible.filter((i) => !options.some((s) => s.kind === i.kind));
      const missing = remaining.filter((i) => !owned.some((o) => o.kind === i.kind));
      const candidates = missing.length ? missing : remaining;
      const roll = nextRandom(rng);
      rng = roll.state;
      const selected = candidates[Math.floor(roll.value * candidates.length)];
      options.push({
        id: `${id}:${selected.kind}`,
        kind: selected.kind as EquipmentKind,
        type: "equipment",
        rank: 1,
        upgradeItemId:
          owned.find((o) => o.kind === selected.kind && "rank" in o && o.rank === 1)?.id ?? null,
      });
    }
    if (options.length < 2) {
      options.push({
        id: `${id}:healing`,
        kind: "draught",
        type: "supplies",
        items: [{ kind: "draught", count: 2 }],
      });
      if (options.length < 2)
        options.push({
          id: `${id}:care`,
          kind: "bandage",
          type: "supplies",
          items: [
            { kind: "bandage", count: 1 },
            { kind: "tonic", count: 1 },
          ],
        });
    }
    state.rewardRng[crewId] = rng;
    state.rewardOffers.push({
      id,
      sourceNodeId: nodeId,
      ownerHeroId: hero.id,
      options,
      status: "pending",
      deferred: false,
      selectedOptionId: null,
    });
  }
}
export function claimReward(hero: Hero, offer: RewardOffer, claim: RewardClaim, revision: number) {
  if (offer.ownerHeroId !== hero.id || offer.id !== claim.offerId || offer.status !== "pending")
    throw new Error("This reward is unavailable.");
  if (hero.inventory.revision !== revision) throw new Error("Your Bag changed. Choose again.");
  if (claim.disposition === "leave") {
    offer.status = "declined";
    return "Reward declined";
  }
  const option = offer.options.find((o) => o.id === claim.optionId);
  if (!option) throw new Error("Choose your offered reward.");
  let inventory = structuredClone(hero.inventory);
  const slot = itemDefinition(option.kind)?.slot;
  const replaced = slot && claim.disposition === "equip" ? inventory.equipment[slot] : null;
  if (option.type === "equipment" && option.upgradeItemId) {
    if (claim.disposition !== "upgrade")
      throw new Error("This offer upgrades the shown owned item.");
    const item = [
      ...inventory.backpack,
      ...inventory.overflow,
      ...Object.values(inventory.equipment),
    ].find((i) => i?.id === option.upgradeItemId);
    if (!item || !("rank" in item) || item.rank !== 1 || item.kind !== option.kind)
      throw new Error("The upgrade target changed. Choose another option or leave this offer.");
    item.rank = 2;
    inventory.revision++;
  } else {
    if (claim.disposition === "upgrade") throw new Error("No eligible upgrade target.");
    if (claim.replacementItemId) {
      if (inventory.backpack.length < 6) throw new Error("Replacement is not needed.");
      const index = inventory.backpack.findIndex((i) => i.id === claim.replacementItemId);
      if (index < 0) throw new Error("Choose an owned Bag item to replace.");
      inventory.backpack.splice(index, 1);
    }
    if (option.type === "supplies") {
      if (claim.disposition !== "keep") throw new Error("Store supplies in your Bag.");
      for (const [index, item] of option.items.entries())
        inventory = addItem(
          inventory,
          makeItem(`${offer.id}:supplies:${index}`, item.kind, item.count),
        );
      if (inventory.overflow.length > hero.inventory.overflow.length)
        throw new Error("Make Bag space, or leave this bundle.");
    } else {
      const slot = itemDefinition(option.kind)?.slot;
      if (!slot) throw new Error("Invalid equipment.");
      const previous = inventory.equipment[slot];
      const needsSpace = claim.disposition === "keep" || previous !== null;
      if (needsSpace && inventory.backpack.length >= 6)
        throw new Error("Bag full. Choose a replacement or leave this reward.");
      const item = equipmentItem(makeItem(`${offer.id}:claimed`, option.kind));
      if (claim.disposition === "equip") {
        inventory.equipment[slot] = item;
        if (previous) inventory.backpack.push(previous);
      } else inventory.backpack.push(item);
      inventory.revision++;
    }
  }
  hero.inventory = inventory;
  offer.status = "claimed";
  offer.selectedOptionId = option.id;
  return claim.disposition === "upgrade"
    ? "Upgraded to rank II · same item and slot"
    : claim.disposition === "equip"
      ? `Equipped${replaced ? ` · ${itemDefinition(replaced.kind)?.name} moved to Bag` : ""}`
      : "Added to Bag";
}
