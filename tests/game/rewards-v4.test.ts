import { expect, it } from "vitest";
import { itemDefinition } from "../../src/game/inventory/catalog.js";
import { claimReward, grantEquipmentOffers } from "../../src/game/progression/equipment-rewards.js";
import { createCrewResult } from "../../src/game/progression/results.js";
import { awardEncounter } from "../../src/game/progression/rewards.js";
import { fixture } from "../fixtures/match.js";

it("offers are frozen, distinct, prefer unowned gear and retain equal crew value including spirits", () => {
  for (const size of [1, 2, 3, 4]) {
    const s = fixture(1, [size]);
    s.heroes[0].status = "dead";
    s.heroes[0].hp = 0;
    grantEquipmentOffers(s, "c0", "cache");
    const frozen = structuredClone(s.rewardOffers),
      rng = { ...s.rewardRng };
    grantEquipmentOffers(s, "c0", "cache");
    expect(s.rewardOffers).toEqual(frozen);
    expect(s.rewardRng).toEqual(rng);
    expect(s.rewardOffers).toHaveLength(size);
    expect(s.heroes.reduce((sum, h) => sum + 2 * h.power, 0)).toBe(24);
    for (const offer of s.rewardOffers)
      expect(new Set(offer.options.map((o) => o.kind)).size).toBe(2);
    const retry = fixture(1, [size]);
    retry.rewardSeed = s.rewardSeed;
    grantEquipmentOffers(retry, "c0", "cache");
    expect(retry.rewardOffers).toEqual(frozen);
  }
});
it("full-backpack equipment swaps are atomic and require explicit replacement", () => {
  const s = fixture(1),
    h = s.heroes[0];
  grantEquipmentOffers(s, "c0", "cache");
  const o = s.rewardOffers[0],
    option = o.options[0],
    slot = itemDefinition(option.kind)?.slot;
  if (!slot) throw new Error("Equipment required");
  h.inventory.equipment[slot] = { id: "old", kind: option.kind, count: 1 };
  h.inventory.backpack = Array.from({ length: 6 }, (_, i) => ({
    id: `bag-${i}`,
    kind: "body-blade",
    count: 1,
  }));
  const before = structuredClone(h.inventory);
  const claim = {
    offerId: o.id,
    optionId: option.id,
    disposition: "equip" as const,
    replacementItemId: null,
  };
  expect(() => claimReward(h, o, claim, h.inventory.revision)).toThrow("Backpack full");
  expect(h.inventory).toEqual(before);
  expect(o.status).toBe("pending");
  claimReward(h, o, { ...claim, replacementItemId: "bag-0" }, h.inventory.revision);
  expect(h.inventory.equipment[slot]?.id).toBe(`${o.id}:claimed`);
  expect(h.inventory.backpack).toContainEqual(before.equipment[slot]);
  expect(h.inventory.backpack).toHaveLength(6);
  expect(() => claimReward(h, o, claim, h.inventory.revision)).toThrow("unavailable");
});
it("ordinary and failed encounters never imply equipment; elite rewards do not farm", () => {
  const s = fixture(1);
  const e = s.encounters[0];
  e.bodyHp = 0;
  awardEncounter(s, "c0", e);
  expect(s.rewardOffers).toEqual([]);
  const elite = fixture(1);
  elite.encounters[0].kind = "elite";
  elite.encounters[0].bodyHp = 0;
  awardEncounter(elite, "c0", elite.encounters[0]);
  const gold = elite.crews[0].economy.gold;
  awardEncounter(elite, "c0", elite.encounters[0]);
  expect(elite.crews[0].economy.gold).toBe(gold);
  expect(elite.rewardOffers).toHaveLength(1);
  createCrewResult(elite, "c0", "victory", "encounter");
  expect(elite.crewProgress.c0.result?.rewardIds).toHaveLength(1);
});
it("defer retains an entitlement and leave explicitly declines without taking inventory space", () => {
  const s = fixture(1);
  grantEquipmentOffers(s, "c0", "cache");
  const h = s.heroes[0],
    o = s.rewardOffers[0];
  claimReward(
    h,
    o,
    { offerId: o.id, optionId: null, disposition: "defer", replacementItemId: null },
    h.inventory.revision,
  );
  expect(o.status).toBe("pending");
  expect(o.deferred).toBe(true);
  claimReward(
    h,
    o,
    { offerId: o.id, optionId: null, disposition: "leave", replacementItemId: null },
    h.inventory.revision,
  );
  expect(o.status).toBe("declined");
});
