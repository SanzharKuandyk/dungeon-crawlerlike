import { expect, it } from "vitest";
import DEFAULT_BALANCE from "../../content/dungeon/balance.json" with { type: "json" };
import DEFAULT_PATTERNS from "../../content/dungeon/enemies.json" with { type: "json" };
import { applyHealing } from "../../src/game/combat/apply-support.js";
import { publishedIntent, publishIntents } from "../../src/game/combat/enemy-patterns.js";
import { preventDeath } from "../../src/game/combat/protection.js";
import { resolveCombat } from "../../src/game/combat/resolve-combat.js";
import { applyInventoryCommand } from "../../src/game/inventory/equipment.js";
import { createShop } from "../../src/game/inventory/shops.js";
import { spawnEncounter } from "../../src/game/progression/encounters.js";
import { applyRescue, reviveAlly } from "../../src/game/progression/recovery.js";
import { cloneRoom } from "../../src/server/clone-room.js";
import { startCrews } from "../../src/server/crew-clock.js";
import { voteCamp } from "../../src/server/handlers/crew-decisions.js";
import { emptyRoom } from "../../src/server/room-manager.js";
import { fixture, plan } from "../fixtures/match.js";

it("living allies revive and preserve build/authority; solo uses external rescue", () => {
  const s = fixture(1, [2]),
    [actor, target] = s.heroes;
  target.hp = 0;
  target.status = "dead";
  target.stress = 8;
  target.conditions.injuries = ["arm"];
  expect(() => reviveAlly(s, target, target.id, "gold")).toThrow();
  reviveAlly(s, actor, target.id, "gold");
  expect(target.hp).toBe(12);
  expect(target.stress).toBe(8);
  expect(target.conditions.injuries).toEqual(["arm"]);
  expect(s.crews[0].economy.gold).toBe(12);
  expect(() => reviveAlly(s, actor, target.id, "gold")).toThrow();
  const solo = fixture(1);
  solo.heroes[0].hp = 0;
  solo.heroes[0].status = "dead";
  applyRescue(solo, "c0");
  expect(solo.crews[0].economy).toEqual({ gold: 12, rescueDebt: 24 });
  expect(() => applyRescue(solo, "c0")).toThrow();
});
it("a defeated boss stays credited when the last hero dies to Bleed", () => {
  const s = fixture(1);
  const hero = s.heroes[0],
    enemy = s.encounters[0];
  enemy.kind = "boss";
  enemy.enemies[0].hp = 1;
  hero.hp = 1;
  hero.conditions.combatEffects = [{ kind: "bleed", turns: 1 }];
  plan(s, 0, { kind: "attack", enemyId: enemy.enemies[0].id });
  const result = resolveCombat(s, { crewId: "c0" }).state;
  expect(result.heroes[0].status).toBe("dead");
  expect(result.encounters[0].status).toBe("defeated");
  expect(result.crews[0].bossesDefeated).toBe(1);
});

it("failed-boss recovery rejects free repeated Rest and permits Retry", () => {
  const room = emptyRoom(fixture(1));
  startCrews(room, 0);
  const p = room.runs.c0.progress;
  p.phase = { kind: "camp" };
  p.recovering = true;
  p.nodeId = room.state.chapterMaps[0].nodes.find((n) => n.kind === "boss")?.id ?? null;
  expect(() => voteCamp(room, room.state.heroes[0].playerId, "rest", 0)).toThrow();
  voteCamp(room, room.state.heroes[0].playerId, "continue", 0);
  expect(p.campVotes[room.state.heroes[0].playerId]).toBe("continue");
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

it("every merchant reserves equivalent weapon, armor and charm stock", () => {
  const s = fixture(1, [4]);
  const shop = createShop(s, "c0", "merchant");
  for (const hero of s.heroes) {
    const offers = shop.offers[hero.id];
    expect(offers.filter((o) => ["blade", "piercing-blade"].includes(o.kind))).toHaveLength(1);
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
  s.content.enemyPatterns = structuredClone(
    DEFAULT_PATTERNS,
  ) as import("../../src/shared/enemy-content-types.js").EnemyPatterns;
  const node = s.chapterMaps[0].nodes.find((n) => n.kind === "battle");
  if (!node) throw new Error("Missing battle");
  spawnEncounter(s, "c0", node);
  const enemy = s.encounters.find((e) => e.id === s.crewProgress.c0.encounterId);
  if (!enemy) throw new Error("Missing enemy");
  const intent = publishedIntent(enemy, s.heroes, 1);
  s.content.enemyPatterns.raider.moves[0].damagePower = 99;
  publishIntents(enemy, s.heroes, 1);
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
  const _h = s.heroes[0];
  plan(s, 0, { kind: "attack", enemyId: s.encounters[0].enemies[0].id });
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
  previous.enemies[0].hp = 24;
  previous.status = "timed-out";
  previous.bossPhase = 2;
  previous.pendingBossPhase = 3;
  previous.pilfered = [s.heroes[0].id];
  spawnEncounter(s, "c0", boss);
  const retry = s.encounters.find((e) => e.id === s.crewProgress.c0.encounterId);
  expect(retry).toMatchObject({
    hp: 24,
    attempt: 2,
    bossPhase: 3,
    block: 0,
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
  plan(s, 0, { kind: "skirmish", enemyId: s.encounters[0].enemies[0].id });
  const r = resolveCombat(s, { crewId: "c0" }).state;
  expect(r.heroes[0].stress).toBe(4);
  expect(r.encounters[0].hp).toBe(s.encounters[0].hp - 24);
});
