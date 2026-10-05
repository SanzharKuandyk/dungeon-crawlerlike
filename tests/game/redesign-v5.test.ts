import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { resolveCombat } from "../../src/game/combat/resolve-combat.js";
import { validateTurnPlan } from "../../src/game/combat/turn-plans.js";
import { assertInvariants } from "../../src/game/invariants.js";
import { equipmentItem, ITEMS, makeItem } from "../../src/game/inventory/catalog.js";
import { applyUpgrade, createShop } from "../../src/game/inventory/shops.js";
import {
  enterNode,
  nextCombatTurn,
  refreshEncounter,
} from "../../src/game/progression/encounters.js";
import { claimReward, grantEquipmentOffers } from "../../src/game/progression/equipment-rewards.js";
import {
  chooseExploration,
  createExploration,
  resolveExploration,
} from "../../src/game/progression/exploration.js";
import { reviveAlly } from "../../src/game/progression/recovery.js";
import { createSiege, resolveSiegeRound } from "../../src/game/siege.js";
import { loadContent } from "../../src/server/content.js";
import { enterCrew, freezeCrewClocks } from "../../src/server/crew-clock.js";
import { updateCrewPresence } from "../../src/server/crew-decisions.js";
import { createRoomManager } from "../../src/server/room-manager.js";
import { beginQuestion, skipQuestion } from "../../src/server/shared-event-coordinator.js";
import { createTestRoom } from "../../src/server/test-mode/create-test-room.js";
import { fixture, plan } from "../fixtures/match.js";
import { memoryStorage } from "../fixtures/server.js";

const secret = () => randomBytes(32).toString("hex");

it("blocked damage names its actual gear source and Ward vest absorbs only once", () => {
  const s = fixture(1, [2]);
  const [coat, vest] = s.heroes;
  coat.inventory.equipment.armor = equipmentItem(makeItem("coat", "guard-coat"));
  vest.inventory.equipment.armor = equipmentItem(makeItem("vest", "ward-vest"));
  const mob = s.encounters[0].enemies[0];
  mob.hp = mob.maxHp = 1000;
  mob.intent = {
    moveId: "test",
    name: "Double strike",
    blockGain: 0,
    recipientEnemyId: null,
    targets: [
      [coat.id, 25],
      [vest.id, 10],
      [vest.id, 4],
    ].map(([heroId, damage]) => ({
      heroId: String(heroId),
      damage: Number(damage),
      stress: 0,
      bleed: false,
      injury: null,
      injuryChance: 0,
    })),
  };
  refreshEncounter(s.encounters[0]);
  plan(s, 0, { kind: "brace" });
  plan(s, 1, { kind: "attack", enemyId: mob.id });
  const result = resolveCombat(s, { crewId: "c0" }).state;
  const hits = result.crewProgress.c0.events.filter(
    (e) => e.kind === "effect" && e.effect.type === "hit" && e.effect.part === "hero",
  );
  expect(
    hits.map((e) => (e.kind === "effect" && e.effect.type === "hit" ? e.effect.sources : null)),
  ).toEqual([
    [
      { label: "Block", amount: 12 },
      { label: "Guard coat", amount: 6 },
    ],
    [{ label: "Ward vest", amount: 6 }],
    [],
  ]);
  expect(result.heroes.map((h) => h.hp)).toEqual([17, 16]);
  expect(
    result.crewProgress.c0.lastTurn?.entries.some((e) => e.message.includes("Ward vest 6")),
  ).toBe(true);
  expect(s.heroes[0].hp).toBe(24);
});

it("Haste locks two legal actions once, Mark improves the follow-up, and temporary Block expires", () => {
  let s = fixture(1);
  const h = s.heroes[0];
  h.classId = "occultist";
  h.inventory.equipment.charm = equipmentItem(makeItem("haste", "haste-charm", 1, 2));
  const e = s.encounters[0],
    mob = e.enemies[0];
  mob.hp = mob.maxHp = 150;
  mob.block = 5;
  refreshEncounter(e);
  const chosen: Extract<import("../../src/shared/turn-plans.js").TurnPlan, { kind: "hero" }> = {
    kind: "hero" as const,
    actions: [
      { kind: "hex" as const, enemyId: mob.id },
      { kind: "attack" as const, enemyId: mob.id },
    ],
    activation: { kind: "haste", itemId: "haste" },
    inventoryRevision: h.inventory.revision,
  };
  validateTurnPlan(s, h, chosen);
  expect(h.encounterUses).not.toContain("haste");
  expect(() =>
    validateTurnPlan(s, h, { ...chosen, actions: [chosen.actions[0], chosen.actions[0]] }),
  ).toThrow(/signature/);
  s.crewProgress.c0.plans[h.playerId] = chosen;
  const original = structuredClone(s);
  const result = resolveCombat(s, { crewId: "c0" });
  expect(s).toEqual(original);
  expect(resolveCombat(s, { crewId: "c0" })).toEqual(result);
  s = result.state;
  const hits = s.crewProgress.c0.events.filter(
    (v) => v.kind === "effect" && v.effect.type === "hit" && v.effect.part === "body",
  );
  expect(
    hits.map((v) => (v.kind === "effect" && v.effect.type === "hit" ? v.effect.attempted : 0)),
  ).toEqual([24, 36]);
  expect(s.heroes[0].encounterUses).toContain("haste");
  expect(s.encounters[0].enemies[0].effects).toHaveLength(0);
  nextCombatTurn(s, "c0");
  s.crewProgress.c0.phaseId++;
  expect(s.heroes[0].block).toBe(0);
  expect(() => validateTurnPlan(s, s.heroes[0], chosen)).toThrow(/Haste/);
  plan(s, 0, { kind: "brace" });
  s.encounters[0].enemies[0].block = 50;
  refreshEncounter(s.encounters[0]);
  s = resolveCombat(s, { crewId: "c0" }).state;
  expect(s.encounters[0].enemies[0].block).toBe(0);
  assertInvariants(s);
});

it("ranked rewards upgrade owned gear atomically, while only a living ally can pay for revival", () => {
  const s = fixture(1, [2]),
    [actor, fallen] = s.heroes,
    crew = s.crews[0];
  const gear = ITEMS.filter((i) => i.slot);
  actor.inventory.backpack = gear
    .slice(0, 6)
    .map((i, n) => makeItem(`gear-${n}`, i.kind, 1, i.kind === "blade" ? 1 : 2));
  actor.inventory.equipment.charm = equipmentItem(makeItem("haste", "haste-charm", 1, 2));
  s.crewProgress.c0.depth = 8;
  grantEquipmentOffers(s, "c0", "once");
  const offer = s.rewardOffers.find((o) => o.ownerHeroId === actor.id);
  if (!offer) throw new Error("Reward fixture missing");
  expect(offer.options.some((o) => o.type === "equipment" && o.upgradeItemId)).toBe(true);
  const option = offer.options.find((o) => o.type === "equipment" && o.upgradeItemId);
  if (!option) throw new Error("Upgrade fixture missing");
  const claim = {
    offerId: offer.id,
    optionId: option.id,
    disposition: "upgrade" as const,
    replacementItemId: null,
  };
  claimReward(actor, offer, claim, actor.inventory.revision);
  expect(actor.inventory.backpack).toHaveLength(6);
  expect(actor.inventory.backpack.find((i) => i.kind === "blade")).toMatchObject({ rank: 2 });
  expect(() => claimReward(actor, offer, claim, actor.inventory.revision)).toThrow(/unavailable/);
  grantEquipmentOffers(s, "c0", "once");
  expect(s.rewardOffers).toHaveLength(2);
  fallen.status = "dead";
  fallen.hp = 0;
  fallen.stress = 8;
  fallen.conditions.injuries = ["arm"];
  fallen.expeditionUses = ["second-breath"];
  crew.shop = createShop(s, "c0", "recovery");
  expect(() => reviveAlly(s, fallen, fallen.id, "gold")).toThrow(/living teammate/);
  reviveAlly(s, actor, fallen.id, "gold");
  expect(fallen).toMatchObject({
    status: "alive",
    hp: 12,
    stress: 8,
    expeditionUses: ["second-breath"],
  });
  expect(crew.economy.gold).toBe(12);
  expect(Object.values(crew.shop.allowances).reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(12);
  const before = structuredClone(crew.economy);
  expect(() => reviveAlly(s, actor, fallen.id, "gold")).toThrow();
  expect(crew.economy).toEqual(before);
  const upgrade = crew.shop.upgrades[actor.id][0];
  if (upgrade) {
    applyUpgrade(s, actor, upgrade.id, upgrade.targetItemId, actor.inventory.revision);
    expect(() =>
      applyUpgrade(s, actor, upgrade.id, upgrade.targetItemId, actor.inventory.revision),
    ).toThrow();
  }
});

it("personal coin choices reserve fair budgets and replay the same frozen outcomes without charging twice", () => {
  const s = fixture(1, [2]),
    p = s.crewProgress.c0;
  const node = s.chapterMaps[0].nodes.find((n) => n.kind === "event");
  if (!node) throw new Error("Event fixture missing");
  node.eventId = "coin-fountain";
  p.phaseId++;
  enterNode(s, "c0", node.id);
  p.phaseId++;
  p.exploration = createExploration(s, "c0", node.id);
  const frozen = structuredClone(s);
  for (const h of s.heroes) chooseExploration(s, h, { kind: "coin", side: "heads", prize: "gold" });
  expect(s.crews[0].economy.gold).toBe(12);
  expect(() =>
    chooseExploration(s, s.heroes[0], { kind: "coin", side: "tails", prize: "gold" }),
  ).toThrow(/committed/);
  const same = structuredClone(frozen);
  for (const h of [...same.heroes].reverse())
    chooseExploration(same, h, { kind: "coin", side: "heads", prize: "gold" });
  resolveExploration(s, "c0");
  resolveExploration(same, "c0");
  expect(s.crewProgress.c0.exploration?.outcomes).toEqual(
    same.crewProgress.c0.exploration?.outcomes,
  );
  expect(s.crews[0].economy).toEqual(same.crews[0].economy);
  const committed = structuredClone(s);
  expect(() => resolveExploration(s, "c0")).toThrow(/already/);
  expect(s).toEqual(committed);
});

it("the siege rewards coordinated rounds once and includes spirits without direct injury", () => {
  const s = fixture(3, [1, 2, 4]);
  const spirit = s.heroes.at(-1);
  if (!spirit) throw new Error("Spirit fixture missing");
  spirit.hp = 0;
  spirit.status = "dead";
  s.siege = createSiege(s);
  const siege = s.siege;
  for (let round = 1; round <= 3; round++) {
    siege.round = round;
    siege.phase = "choice";
    siege.choices = Object.fromEntries(
      s.heroes.map((h) => [
        h.playerId,
        h.status === "dead"
          ? "supply"
          : round === 1 && [s.heroes[0].id, s.heroes[1].id].includes(h.id)
            ? "protect"
            : round > 1 && h.id === s.heroes[2].id
              ? "supply"
              : "attack",
      ]),
    );
    resolveSiegeRound(s);
    const after = structuredClone(s);
    resolveSiegeRound(s);
    expect(s).toEqual(after);
  }
  expect(siege.success).toBe(true);
  expect(s.crews.every((c) => c.economy.gold === 36)).toBe(true);
  expect(spirit.status).toBe("dead");
  expect(
    s.heroes.every(
      (h) =>
        h.inventory.backpack.reduce((n, i) => n + (i.kind === "draught" ? i.count : 0), 0) === 2,
    ),
  ).toBe(true);
});

it("a paused duel reveal joins a shared event without deadlock and keeps its elapsed time on return", async () => {
  const manager = createRoomManager(memoryStorage().storage, await loadContent(), () => 0);
  const result = await createTestRoom(manager, {
    hostSecret: secret(),
    scenario: "duel",
    players: Array.from({ length: 10 }, (_, i) => ({
      clientId: String(i),
      bootstrapSecret: secret(),
    })),
  });
  const room = manager.rooms.get(result.code);
  if (!room) throw new Error("Room fixture missing");
  room.speed = "normal";
  const duel = room.duels[0],
    run = room.runs[duel.crewIds[0]];
  duel.phase = "reveal";
  enterCrew(room, run, { kind: "combat-reveal" }, 0);
  run.pauseReasons = ["host"];
  freezeCrewClocks(room, 400);
  const clock = structuredClone(run.clock),
    inputs = structuredClone(run.progress.plans);
  room.discovery = { eventId: "siege-1", cause: "Crew awakened the siege", depth: 2 };
  beginQuestion(room, 500);
  expect(room.state.siege?.phase).toBe("intro");
  room.pauseReasons = ["host"];
  skipQuestion(room, 600, true);
  expect(run.clock).toEqual(clock);
  expect(run.progress.plans).toEqual(inputs);
  expect(run.clock.deadline).toBeNull();
  run.suspended = true;
  run.pauseReasons = ["all-offline"];
  room.pauseReasons = [];
  for (const p of room.state.players) p.connected = true;
  updateCrewPresence(room, run, 700);
  expect(run.clock.deadline).not.toBeNull();
  expect(run.clock.elapsedMs).toBe(clock.elapsedMs);
});
