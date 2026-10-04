import { describe, expect, it } from "vitest";
import {
  applyAffliction,
  applyInjury,
  resolvePanic,
  rollInjury,
} from "../../src/game/combat/conditions.js";
import { outgoingDamage } from "../../src/game/combat/damage.js";
import { legalHeroActions } from "../../src/game/combat/hero-actions.js";
import { preventDeath } from "../../src/game/combat/protection.js";
import { resolveCombat } from "../../src/game/combat/resolve-combat.js";
import { assertInvariants } from "../../src/game/invariants.js";
import { applyInventoryCommand } from "../../src/game/inventory/equipment.js";
import { addItem } from "../../src/game/inventory/inventory.js";
import { applyPurchase, createShop } from "../../src/game/inventory/shops.js";
import { goldReward } from "../../src/game/progression/economy.js";
import { nextCombatTurn } from "../../src/game/progression/encounters.js";
import { chapterMap, validateMap } from "../../src/game/progression/maps.js";
import { applyRescue, applyTreatment } from "../../src/game/progression/recovery.js";
import { awardEncounter } from "../../src/game/progression/rewards.js";
import { finishExpedition } from "../../src/game/progression/scoring.js";
import { projectRoom } from "../../src/game/projections.js";
import { createBlessingOffers, grantBlessings } from "../../src/game/trials/blessings.js";
import {
  chooseTile,
  createTrial,
  trialQuestion,
  validateTrialPack,
} from "../../src/game/trials/board.js";
import { projectTrial } from "../../src/game/trials/projections.js";
import { lockTrialQuestion } from "../../src/game/trials/scoring.js";
import { content, fixture, next } from "../fixtures/match.js";

const fight = (s: ReturnType<typeof fixture>, kind: "body" | "weak-point" = "body") => {
  for (const h of s.heroes)
    s.crewProgress[h.crewId].actions[h.playerId] = { kind: "attack", part: kind };
  return resolveCombat(s, { crewId: s.crews[0].id }).state;
};
describe("chapter routes and normalization", () => {
  it.each([1, 2, 3, 4])("size %i has equal budgets, all classes, normalized allowances", (size) => {
    const s = fixture(1, [size]);
    expect(s.heroes.reduce((n, h) => n + h.hp, 0)).toBe(48);
    expect(s.heroes.reduce((n, h) => n + 2 * h.power, 0)).toBe(24);
    const shop = createShop(s, "c0", "visit");
    expect(Object.values(shop.allowances).reduce((a, b) => a + b, 0)).toBe(24);
    const h = s.heroes[0],
      power = h.power;
    h.hp = 0;
    h.status = "dead";
    applyRescue(s, "c0", h.id);
    expect(h.power).toBe(power);
    for (const classId of [
      "knight",
      "physician",
      "occultist",
      "scavenger",
      "wanderer",
      "exorcist",
    ] as const) {
      h.classId = classId;
      expect(legalHeroActions(s, h).length).toBeGreaterThan(2);
    }
  });
  it("three persisted maps meet every authored route guarantee", () => {
    for (let seed = 1; seed < 30; seed++)
      for (const c of [1, 2, 3] as const) {
        const map = chapterMap(content, seed, c);
        validateMap(map);
        expect(map.rows).toBe(7);
        expect(map.nodes.filter((n) => n.kind === "boss")).toHaveLength(1);
        expect(map.nodes.some((n) => n.kind === "altar")).toBe(c !== 3);
      }
    const map = chapterMap(content, 1, 1);
    map.nodes[0].nextIds = [];
    expect(() => validateMap(map)).toThrow("Dead-end");
  });
});
describe("deterministic combat", () => {
  it("seal overflow reaches body; killed enemies do not attack; input is immutable", () => {
    const s = fixture(1);
    const before = structuredClone(s);
    s.encounters[0].bodyHp = 10;
    const hp = s.heroes[0].hp;
    const result = fight(s, "weak-point");
    expect(result.encounters[0].weakHp).toBe(0);
    expect(result.encounters[0].bodyHp).toBe(0);
    expect(result.heroes[0].hp).toBe(hp);
    expect(s.encounters[0].weakHp).toBe(before.encounters[0].weakHp);
    expect(() => resolveCombat(result, { crewId: "c0" })).toThrow();
  });
  it("shield absorbs separately from seal and body", () => {
    const s = fixture(1);
    s.encounters[0].shield = 20;
    const result = fight(s, "weak-point");
    expect(result.encounters[0].shield).toBe(0);
    expect(result.encounters[0].weakHp).toBe(8);
    expect(result.encounters[0].bodyHp).toBe(48);
  });
  it("cooldown lasts two turns and supports all solo classes", () => {
    let s = fixture(1);
    s.heroes[0].classId = "wanderer";
    s.crewProgress.c0.actions[s.heroes[0].playerId] = { kind: "skirmish", part: "body" };
    s = resolveCombat(s, { crewId: "c0" }).state;
    next(s);
    expect(legalHeroActions(s, s.heroes[0]).some((a) => a.kind === "skirmish")).toBe(false);
    next(s);
    expect(legalHeroActions(s, s.heroes[0]).some((a) => a.kind === "skirmish")).toBe(true);
  });
  it("simultaneous attacks retain every declared hit", () => {
    const s = fixture(1, [4]);
    s.encounters[0].bodyHp = 24;
    const result = fight(s);
    expect(result.encounters[0].bodyHp).toBe(0);
    expect(
      result.crewProgress.c0.events.filter((e) => e.kind === "effect" && e.effect.type === "hit"),
    ).toHaveLength(4);
    expect(result.heroes.every((h) => h.hp === h.maxHp)).toBe(true);
  });
  it("boss seals regenerate only at the next turn boundary", () => {
    let s = fixture(1);
    s.encounters[0].kind = "boss";
    s.encounters[0].bodyHp = 32;
    s = fight(s, "weak-point");
    expect(s.encounters[0].weakHp).toBe(0);
    expect(s.encounters[0].bossPhase).toBe(1);
    nextCombatTurn(s, "c0");
    expect(s.encounters[0].bossPhase).toBe(2);
    expect(s.encounters[0].weakHp).toBe(12);
  });
  it("stress uses locked bands and arm penalties cannot erase damage", () => {
    const h = fixture(1).heroes[0];
    expect(outgoingDamage(h, 24, "body", 0)).toBe(24);
    expect(outgoingDamage(h, 24, "body", 4)).toBe(21);
    expect(outgoingDamage(h, 24, "body", 7)).toBe(19);
    h.conditions.injuries = ["arm"];
    expect(outgoingDamage(h, 1, "body", 9)).toBe(1);
  });
  it("fully blocked moves cannot injure; seeded rolls repeat and follow odds", () => {
    let s = fixture(1);
    s.crewProgress.c0.turn = 2;
    s.encounters[0].definition.family = "sentinel";
    s.crewProgress.c0.actions[s.heroes[0].playerId] = { kind: "brace" };
    s = resolveCombat(s, { crewId: "c0" }).state;
    expect(s.heroes[0].conditions.injuries).toEqual([]);
    expect(rollInjury(22, 25)).toEqual(rollInjury(22, 25));
    let hits = 0,
      rng = 42;
    for (let i = 0; i < 10000; i++) {
      const roll = rollInjury(rng, 25);
      rng = roll.nextRng;
      if (roll.outcome) hits++;
    }
    expect(hits / 10000).toBeGreaterThan(0.23);
    expect(hits / 10000).toBeLessThan(0.27);
  });
  it("panic adds a capped Affliction and Second Breath cannot reset on revival", () => {
    const s = fixture(1),
      h = s.heroes[0];
    h.hp = 3;
    h.stress = 10;
    h.conditions.blessings = [{ kind: "second-breath", rank: 2, spent: false }];
    expect(resolvePanic(h)).toBe(true);
    expect(resolvePanic(h)).toBe(false);
    expect(h.stress).toBe(6);
    expect(preventDeath(h)).toBe(true);
    h.status = "dead";
    h.hp = 0;
    applyRescue(s, "c0", h.id);
    h.hp = 0;
    expect(preventDeath(h)).toBe(false);
    applyAffliction(h, "shaken");
    expect(h.conditions.afflictions.length).toBe(1);
    applyInjury(h, "arm");
    applyInjury(h, "arm");
    expect(h.conditions.injuries).toEqual(["arm"]);
  });
});
describe("inventory, recovery and once-only economy", () => {
  it("purchases reserve member budgets and reject a duplicate stock item", () => {
    const s = fixture(1, [4]),
      c = s.crews[0],
      h = s.heroes[0];
    c.shop = createShop(s, c.id, "visit");
    const offer =
      c.shop.offers[h.id].find((o) => o.kind === "body-blade") ??
      c.shop.offers[h.id].find((o) => o.price === 6);
    if (!offer) throw new Error("Missing shop offer");
    applyPurchase(s, h, offer.id, h.inventory.revision);
    expect(c.economy.gold).toBe(18);
    expect(c.shop.allowances[h.id]).toBe(0);
    expect(() => applyPurchase(s, h, offer.id, h.inventory.revision)).toThrow();
    expect(c.shop.allowances[s.heroes[1].id]).toBe(6);
  });
  it("overflow requires an explicit choice and transfer preserves owned IDs", () => {
    const s = fixture(1, [2]),
      h = s.heroes[0];
    for (let i = 0; i < 6; i++)
      h.inventory = addItem(h.inventory, { id: `gear-${i}`, kind: "body-blade", count: 1 });
    expect(h.inventory.overflow).toHaveLength(1);
    const item = h.inventory.overflow[0];
    applyInventoryCommand(
      s,
      h,
      { kind: "overflow", itemId: item.id, replaceItemId: h.inventory.backpack[0].id },
      h.inventory.revision,
    );
    expect(h.inventory.overflow).toHaveLength(0);
    expect(h.inventory.backpack).toHaveLength(6);
    applyInventoryCommand(
      s,
      h,
      { kind: "transfer", itemId: item.id, targetHeroId: s.heroes[1].id },
      h.inventory.revision,
    );
    expect(s.heroes[1].inventory.backpack.some((i) => i.id === item.id)).toBe(true);
  });
  it("rescue keeps builds, consumes half gold and future rewards repay debt", () => {
    const s = fixture(1),
      h = s.heroes[0],
      c = s.crews[0];
    h.hp = 0;
    h.status = "dead";
    h.conditions.injuries = ["leg"];
    applyRescue(s, c.id);
    expect(c.economy).toEqual({ gold: 12, rescueDebt: 24 });
    expect(h.hp).toBe(24);
    expect(h.stress).toBe(3);
    expect(h.conditions.injuries).toEqual(["leg"]);
    c.economy = goldReward(c, 36);
    expect(c.economy).toEqual({ gold: 24, rescueDebt: 0 });
  });
  it("node victory and boss credit cannot be farmed", () => {
    const s = fixture(1),
      e = s.encounters[0];
    e.bodyHp = 0;
    e.kind = "boss";
    awardEncounter(s, "c0", e);
    awardEncounter(s, "c0", e);
    expect(s.crews[0].bossesDefeated).toBe(1);
    expect(s.crews[0].economy.gold).toBe(60);
  });
  it("paid treatment removes only the chosen injury", () => {
    const s = fixture(1),
      h = s.heroes[0];
    h.conditions.injuries = ["arm", "leg"];
    s.crews[0].shop = createShop(s, "c0", "visit");
    applyTreatment(s, h, { kind: "injury", injury: "arm" });
    expect(h.conditions.injuries).toEqual(["leg"]);
  });
});
describe("competitive trials and privacy", () => {
  it("one crew vote outweighs no extra members; used value bands and questions cannot repeat", () => {
    const s = fixture(2, [1, 4]);
    s.trial = createTrial(s, 1, "altar");
    const t = s.trial;
    for (const id of s.crews[1].playerIds) t.votes[id] = "tile:1:300";
    t.votes[s.crews[0].playerIds[0]] = "tile:0:100";
    const id = chooseTile(s, t);
    expect([100, 300]).toContain(s.trialPack.questions.find((q) => q.id === id)?.value);
    const used = t.usedValues[0];
    for (const p of s.players) t.votes[p.id] = `tile:0:${used}`;
    chooseTile(s, t);
    expect(new Set(t.usedValues).size).toBe(2);
    expect(new Set(s.usedTrialQuestions).size).toBe(2);
  });
  it("fractional scores are exact and missing/spirits count in the frozen roster", () => {
    const s = fixture(3, [1, 3, 4]);
    s.trial = createTrial(s, 1, "altar");
    const id = chooseTile(s, s.trial);
    s.trial.phase = { kind: "answer", questionId: id };
    const q = trialQuestion(s);
    if (!q) throw new Error("Missing trial question");
    for (const c of s.crews) {
      s.trial.answers[c.playerIds[0]] = q.correctIndex;
      s.trial.wagers[c.playerIds[0]] = "bold";
    }
    s.heroes[0].status = "dead";
    s.heroes[0].hp = 0;
    lockTrialQuestion(s);
    expect(s.trial.totals.c0).toBe(q.value * 24);
    expect(s.trial.totals.c1).toBe(q.value * 8);
    expect(s.trial.totals.c2).toBe(q.value * 6);
    const scores = structuredClone(s.trial.totals);
    expect(() => lockTrialQuestion(s)).toThrow();
    expect(s.trial.totals).toEqual(scores);
    expect(s.heroes.find((h) => h.playerId === s.crews[1].playerIds[1])?.stress).toBe(1);
  });
  it("solutions and private offers stay hidden until lock", () => {
    const s = fixture(1);
    s.trial = createTrial(s, 1, "altar");
    const id = chooseTile(s, s.trial);
    s.trial.phase = { kind: "wager", questionId: id };
    expect(projectTrial(s)?.question).toBeNull();
    s.trial.phase = { kind: "answer", questionId: id };
    expect(projectTrial(s)?.correctIndex).toBeNull();
    const publicView = projectRoom(s, null, false, {
      deadline: null,
      remaining: null,
      phaseStartedAt: 0,
      phaseDuration: 0,
      serverNow: 0,
      speed: "manual",
      storageError: null,
      testMode: false,
      readOnly: false,
    });
    expect(JSON.stringify(publicView)).not.toContain('correctIndex":0');
    expect(publicView.heroes[0].inventory.backpack).toEqual([]);
    expect(() => validateTrialPack(s.trialPack, true)).toThrow();
  });
  it("Blessing rewards upgrade, require replacement and grant once including spirits", () => {
    const s = fixture(1);
    s.trial = createTrial(s, 1, "altar");
    const h = s.heroes[0];
    s.trial.favour[h.playerId] = 4;
    s.trial.totals.c0 = 1200;
    createBlessingOffers(s);
    expect(s.trial.offers[h.playerId]).toHaveLength(3);
    const offer = s.trial.offers[h.playerId][0];
    s.trial.choices[h.playerId] = offer.id;
    grantBlessings(s);
    grantBlessings(s);
    expect(h.conditions.blessings).toEqual([{ kind: offer.kind, rank: 2, spent: false }]);
  });
  it("ranking prioritizes bosses then completed progress then exact points and shares ties", () => {
    const s = fixture(3);
    s.crews[0].economy.gold = 999;
    s.crews[1].bossesDefeated = 1;
    s.crews[2].bossesDefeated = 1;
    s.crews[1].trialScoreUnits = s.crews[2].trialScoreUnits = 1;
    finishExpedition(s);
    expect(s.winners).toEqual(["c1", "c2"]);
    assertInvariants(s);
  });
});
