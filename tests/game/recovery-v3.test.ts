import { expect, it } from "vitest";
import DEFAULT_BALANCE from "../../content/dungeon/balance.json" with { type: "json" };
import { applyHealing } from "../../src/game/combat/apply-support.js";
import { publishedIntent } from "../../src/game/combat/enemy-patterns.js";
import { preventDeath } from "../../src/game/combat/protection.js";
import { resolveCombat } from "../../src/game/combat/resolve-combat.js";
import { applyInventoryCommand } from "../../src/game/inventory/equipment.js";
import { createShop } from "../../src/game/inventory/shops.js";
import { spawnEncounter } from "../../src/game/progression/encounters.js";
import { applyTreatment } from "../../src/game/progression/recovery.js";
import { cloneRoom } from "../../src/server/clone-room.js";
import { startCrews } from "../../src/server/crew-clock.js";
import { advanceCrew } from "../../src/server/crew-transitions.js";
import { voteCamp } from "../../src/server/handlers/crew-decisions.js";
import { emptyRoom } from "../../src/server/room-manager.js";
import { fixture } from "../fixtures/match.js";

it("a paid solo revival restores crew authority and can retry the failed encounter", () => {
  const room = emptyRoom(fixture(1));
  startCrews(room, 0);
  const crew = room.state.crews[0],
    hero = room.state.heroes[0],
    run = room.runs[crew.id];
  const node = room.state.chapterMaps[0].nodes.find((n) => n.row === 1);
  if (!node) throw new Error("Missing battle");
  run.progress.nodeId = node.id;
  run.progress.encounterId = room.state.encounters[0].id;
  run.progress.phase = { kind: "camp" };
  run.progress.recovering = true;
  room.state.encounters[0].status = "abandoned";
  hero.hp = 0;
  hero.status = "dead";
  crew.status = "eliminated";
  crew.shop = createShop(room.state, crew.id, node.id);
  applyTreatment(room.state, hero, { kind: "revive" });
  expect(crew.status).toBe("active");
  expect(hero.hp).toBe(24);
  expect(crew.economy).toEqual({ gold: 0, rescueDebt: 0 });
  expect(() => applyTreatment(room.state, hero, { kind: "revive" })).toThrow();
  // Recover the same legal decision from records affected by the old revival bug.
  crew.status = "eliminated";
  voteCamp(room, hero.playerId, "continue", 0);
  expect(crew.status).toBe("active");
  advanceCrew(room, run, 1);
  advanceCrew(room, run, 2);
  advanceCrew(room, run, 3);
  expect(run.progress.phase.kind).toBe("combat");
  expect(room.state.encounters.find((e) => e.id === run.progress.encounterId)?.status).toBe(
    "active",
  );
  expect(crew.economy).toEqual({ gold: 0, rescueDebt: 0 });
});

it("a defeated boss stays credited when the last hero dies to Bleed", () => {
  const s = fixture(1);
  const hero = s.heroes[0],
    enemy = s.encounters[0];
  enemy.kind = "boss";
  enemy.bodyHp = 1;
  enemy.weakHp = 0;
  hero.hp = 1;
  hero.conditions.combatEffects = [{ kind: "bleed", turns: 1 }];
  s.crewProgress.c0.actions[hero.playerId] = { kind: "attack", part: "body" };
  const result = resolveCombat(s, { crewId: "c0" }).state;
  expect(result.heroes[0].status).toBe("dead");
  expect(result.encounters[0].status).toBe("defeated");
  expect(result.crews[0].bossesDefeated).toBe(1);
});

it("failed-boss recovery allows repeated rest and an explicit retry", () => {
  const room = emptyRoom(fixture(1));
  startCrews(room, 0);
  const run = room.runs.c0,
    p = run.progress;
  const boss = room.state.chapterMaps[0].nodes.find((n) => n.kind === "boss");
  if (!boss) throw new Error("Missing boss");
  p.nodeId = boss.id;
  p.encounterId = room.state.encounters[0].id;
  p.phase = { kind: "camp" };
  p.recovering = true;
  room.state.encounters[0].kind = "boss";
  room.state.encounters[0].status = "timed-out";
  room.state.heroes[0].hp = 1;
  room.state.heroes[0].stress = 8;
  p.campVotes[room.state.heroes[0].playerId] = "rest";
  advanceCrew(room, run, 1);
  advanceCrew(room, run, 2);
  expect(p.phase.kind).toBe("result");
  advanceCrew(room, run, 2.5);
  expect(p.phase.kind).toBe("camp");
  expect(room.state.heroes[0].hp).toBe(25);
  p.campVotes[room.state.heroes[0].playerId] = "continue";
  advanceCrew(room, run, 3);
  advanceCrew(room, run, 4);
  advanceCrew(room, run, 4.5);
  expect(p.phase.kind).toBe("combat");
  expect(p.recovering).toBe(false);
  expect(room.state.encounters.find((e) => e.id === p.encounterId)?.status).toBe("active");
});

it("Second Breath cannot reset by replacing and earning the Blessing again", () => {
  const s = fixture(1),
    hero = s.heroes[0];
  hero.conditions.blessings = [{ kind: "second-breath", rank: 1, spent: false }];
  hero.hp = 0;
  expect(preventDeath(hero)).toBe(true);
  hero.conditions.blessings = [];
  hero.pendingBlessings = [{ id: "again", kind: "second-breath", rank: 2 }];
  applyInventoryCommand(
    s,
    hero,
    { kind: "blessing", offerId: "again", replace: null },
    hero.inventory.revision,
  );
  hero.hp = 0;
  expect(preventDeath(hero)).toBe(false);
  expect(hero.conditions.blessings[0].spent).toBe(true);
});

it("defensive Seer turns do not secretly inflict stress; Regent alternates pressure", () => {
  const s = fixture(1),
    enemy = s.encounters[0];
  enemy.definition.family = "seer";
  expect(publishedIntent(enemy, s.heroes, 2).targets[0]).toMatchObject({ damage: 0, stress: 0 });
  enemy.kind = "boss";
  enemy.definition.family = "devourer";
  expect(publishedIntent(enemy, s.heroes, 2).targets[0]).toMatchObject({
    damage: 0,
    stress: 1,
    bleed: false,
  });
  expect(publishedIntent(enemy, s.heroes, 1).targets[0].damage).toBeGreaterThan(0);
});

it("every merchant reserves equivalent weapon, armor and charm stock", () => {
  const s = fixture(1, [4]);
  const shop = createShop(s, "c0", "merchant");
  for (const hero of s.heroes) {
    const offers = shop.offers[hero.id];
    expect(offers.filter((o) => ["body-blade", "seal-pick"].includes(o.kind))).toHaveLength(1);
    expect(offers.filter((o) => ["guard-coat", "ward-vest"].includes(o.kind))).toHaveLength(1);
    expect(offers.filter((o) => ["calm-charm", "healer-charm"].includes(o.kind))).toHaveLength(1);
    expect(offers.filter((o) => o.price === 2 * hero.power)).toHaveLength(4);
  }
});

it("healing bonuses wait for actual restored health", () => {
  const s = fixture(1),
    hero = s.heroes[0];
  hero.conditions.blessings = [{ kind: "field-medic", rank: 1, spent: false }];
  applyHealing(s, hero, hero, hero.power);
  expect(hero.encounterUses).not.toContain("field-medic");
  hero.hp -= hero.power * 2;
  applyHealing(s, hero, hero, hero.power);
  expect(hero.hp).toBe(hero.maxHp);
  expect(hero.encounterUses).toContain("field-medic");
});

it("encounters freeze authored pressure rather than reading edited content", () => {
  const s = fixture(1);
  s.content.balance = { ...DEFAULT_BALANCE };
  const node = s.chapterMaps[0].nodes.find((n) => n.kind === "battle");
  if (!node) throw new Error("Missing battle");
  spawnEncounter(s, "c0", node);
  const enemy = s.encounters.find((e) => e.id === s.crewProgress.c0.encounterId);
  if (!enemy) throw new Error("Missing enemy");
  const intent = publishedIntent(enemy, s.heroes, 1);
  s.content.balance.strikePower = 99;
  expect(publishedIntent(enemy, s.heroes, 1)).toEqual(intent);
});

it("mutable drafts isolate actions, health and event arrays from committed state", () => {
  const room = emptyRoom(fixture(1));
  startCrews(room, 0);
  const draft = cloneRoom(room);
  draft.state.heroes[0].hp = 1;
  draft.state.crewProgress.c0.actions.p0 = { kind: "brace" };
  draft.state.crewProgress.c0.events.push({
    kind: "story",
    id: "test",
    sequence: 1,
    phaseId: 1,
    depth: 1,
    turn: 1,
    roomId: null,
    at: 0,
    cause: "test",
    actor: null,
    message: "test",
  });
  expect(room.state.heroes[0].hp).toBe(48);
  expect(room.state.crewProgress.c0.actions).toEqual({});
  expect(room.state.crewProgress.c0.events).toHaveLength(0);
});

it("resolving a crew never changes another crew's build or encounter", () => {
  const s = fixture(2),
    before = structuredClone(s);
  const h = s.heroes[0];
  s.crewProgress.c0.actions[h.playerId] = { kind: "attack", part: "body" };
  const result = resolveCombat(s, { crewId: "c0" }).state;
  expect(result.heroes.filter((h) => h.crewId === "c1")).toEqual(
    before.heroes.filter((h) => h.crewId === "c1"),
  );
  expect(result.crews[1]).toEqual(before.crews[1]);
  expect(result.crewProgress.c1).toEqual(before.crewProgress.c1);
  expect(s.heroes).toEqual(before.heroes);
});

it("boss retry preserves damage, phase thresholds and once-only Pilfer markers", () => {
  const s = fixture(1),
    boss = s.chapterMaps[0].nodes.find((n) => n.kind === "boss");
  if (!boss) throw new Error("Missing boss");
  spawnEncounter(s, "c0", boss);
  const previous = s.encounters.find((e) => e.id === s.crewProgress.c0.encounterId);
  if (!previous) throw new Error("Missing encounter");
  previous.bodyHp = 24;
  previous.status = "timed-out";
  previous.bossPhase = 2;
  previous.pendingBossPhase = 3;
  previous.pilfered = [s.heroes[0].id];
  spawnEncounter(s, "c0", boss);
  const retry = s.encounters.find((e) => e.id === s.crewProgress.c0.encounterId);
  expect(retry).toMatchObject({
    bodyHp: 24,
    attempt: 2,
    bossPhase: 3,
    weakHp: 12,
    pilfered: [s.heroes[0].id],
  });
  expect(s.crews[0].bossesDefeated).toBe(0);
});
it("Skirmish has a disclosed authored stress cost and uses the lock-time damage band", () => {
  const s = fixture(1),
    h = s.heroes[0];
  s.content.balance = { ...DEFAULT_BALANCE, skirmishStress: 1 };
  h.classId = "wanderer";
  s.encounters[0].definition.family = "sentinel";
  h.stress = 3;
  s.crewProgress.c0.actions[h.playerId] = { kind: "skirmish", part: "body" };
  const r = resolveCombat(s, { crewId: "c0" }).state;
  expect(r.heroes[0].stress).toBe(4);
  expect(r.encounters[0].bodyHp).toBe(s.encounters[0].bodyHp - 24);
});
