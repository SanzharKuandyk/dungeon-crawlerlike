import type { Hero, MatchState } from "../../shared/game-types.js";
import type { RewardClaim, RewardOffer } from "../../shared/reward-types.js";
import { ITEMS, itemDefinition } from "../inventory/catalog.js";
import { nextRandom } from "../random.js";

export function grantEquipmentOffers(state: MatchState, crewId: string, nodeId: string) {
  for (const hero of state.heroes.filter((h) => h.crewId === crewId)) {
    const id = `${state.id}:reward:${nodeId}:${hero.id}`;
    if (state.rewardOffers.some((o) => o.id === id)) continue;
    const owned = [
      ...hero.inventory.backpack,
      ...hero.inventory.overflow,
      ...Object.values(hero.inventory.equipment),
    ]
      .filter((i) => i !== null)
      .map((i) => i.kind);
    const catalog = ITEMS.filter((i) => i.slot);
    let rng =
      state.rewardRng[crewId] ??
      (state.rewardSeed ^ ((state.crews.findIndex((c) => c.id === crewId) + 1) * 0x9e3779b9)) >>> 0;
    const selected: typeof catalog = [];
    for (let n = 0; n < 2; n++) {
      const remaining = catalog.filter((i) => !selected.some((s) => s.kind === i.kind));
      const preferred = remaining.filter((i) => !owned.includes(i.kind));
      const candidates = preferred.length ? preferred : remaining;
      const roll = nextRandom(rng);
      rng = roll.state;
      selected.push(candidates[Math.floor(roll.value * candidates.length)]);
    }
    state.rewardRng[crewId] = rng;
    state.rewardOffers.push({
      id,
      sourceNodeId: nodeId,
      ownerHeroId: hero.id,
      options: selected.map((i) => ({ id: `${id}:${i.kind}`, kind: i.kind })),
      status: "pending",
      deferred: false,
      selectedOptionId: null,
    });
  }
}

export function claimReward(hero: Hero, offer: RewardOffer, claim: RewardClaim, revision: number) {
  if (offer.ownerHeroId !== hero.id || offer.id !== claim.offerId || offer.status !== "pending")
    throw new Error("This reward is unavailable.");
  if (hero.inventory.revision !== revision) throw new Error("Your backpack changed. Choose again.");
  if (claim.disposition === "defer") {
    offer.deferred = true;
    return "Saved in Rewards";
  }
  if (claim.disposition === "leave") {
    offer.status = "declined";
    return "Reward declined";
  }
  const option = offer.options.find((o) => o.id === claim.optionId);
  const slot = option && itemDefinition(option.kind)?.slot;
  if (!option || !slot) throw new Error("Choose an offered equipment item.");
  const inventory = structuredClone(hero.inventory);
  const previous = inventory.equipment[slot];
  const needsSpace = claim.disposition === "keep" || previous !== null;
  if (claim.replacementItemId) {
    if (!needsSpace || inventory.backpack.length < 6) throw new Error("Replacement is not needed.");
    const index = inventory.backpack.findIndex((i) => i.id === claim.replacementItemId);
    if (index < 0) throw new Error("Choose a backpack item to replace.");
    inventory.backpack.splice(index, 1);
  }
  if (needsSpace && inventory.backpack.length >= 6)
    throw new Error("Backpack full. Choose an item to replace or defer this reward.");
  const item = { id: `${offer.id}:claimed`, kind: option.kind, count: 1 };
  if (claim.disposition === "equip") {
    inventory.equipment[slot] = item;
    if (previous) inventory.backpack.push(previous);
  } else inventory.backpack.push(item);
  inventory.revision++;
  hero.inventory = inventory;
  offer.status = "claimed";
  offer.selectedOptionId = option.id;
  return claim.disposition === "equip"
    ? `Equipped in ${slot}${previous ? " · previous item added to backpack" : ""}`
    : "Added to backpack";
}
