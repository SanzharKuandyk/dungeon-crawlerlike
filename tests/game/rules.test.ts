import { describe, expect, it } from "vitest";
import { assertInvariants } from "../../src/game/invariants.js";
import { grantEquipment, lockQuiz } from "../../src/game/learning.js";
import { projectRoom } from "../../src/game/projections.js";
import { resolveCamp } from "../../src/game/resolve-camp.js";
import { resolveCombat } from "../../src/game/resolve-combat.js";
import { extract, finishMatch } from "../../src/game/scoring.js";
import { fixture, next } from "../fixtures/match.js";

const options = {
  deadline: null,
  remaining: null,
  phaseStartedAt: 0,
  phaseDuration: 10000,
  serverNow: 0,
  speed: "manual" as const,
  storageError: null,
  testMode: false,
  readOnly: false,
};
describe("crew balance", () => {
  it.each([1, 2, 3, 4])("equal totals for %i members", (size) => {
    const s = fixture(1, [size]);
    expect(s.heroes.reduce((n, h) => n + h.maxHp, 0)).toBe(48);
    expect(s.heroes.reduce((n, h) => n + 2 * h.power, 0)).toBe(24);
    s.players[0].connected = false;
    expect(s.heroes[0].power).toBe(12 / size);
  });
});
it("resolves deterministically without mutating input", () => {
  const s = fixture();
  s.actions["p0-0"] = { kind: "attack", part: "body" };
  expect(resolveCombat(s)).toEqual(resolveCombat(s));
  expect(s.encounters[0].bodyHp).toBe(96);
});
it("weak point breaks before the heavy enemy attack", () => {
  const s = fixture(1);
  s.turn = 2;
  s.actions["p0-0"] = { kind: "attack", part: "weak-point" };
  const r = resolveCombat(s).state;
  expect(r.encounters[0].weakHp).toBe(0);
  expect(r.encounters[0].bodyHp).toBe(48);
  expect(r.heroes[0].hp).toBe(36);
});
it("simultaneous kill cancels enemy attack and awards qualified purse", () => {
  const s = fixture(2);
  s.encounters[0].bodyHp = 48;
  for (const p of s.players) s.actions[p.id] = { kind: "attack", part: "body" };
  const r = resolveCombat(s).state;
  expect(r.heroes.every((h) => h.hp === h.maxHp)).toBe(true);
  expect(r.crews.map((c) => c.carriedTreasure)).toEqual([7, 7]);
  expect(r.encounters[0].status).toBe("defeated");
});
it("only actual protection earns contribution; missing actions brace", () => {
  const s = fixture(1);
  const r = resolveCombat(s).state;
  expect(r.heroes[0].hp).toBe(48);
  expect(r.encounters[0].contribution.c0).toBe(12);
});
it("strong loot claims beat weak claims and only one bundle per crew", () => {
  const s = fixture(2, [4, 1]);
  for (const p of s.players) s.actions[p.id] = { kind: "loot" };
  s.actions["p0-0"] = { kind: "brace" };
  const r = resolveCombat(s).state;
  expect(r.crews.map((c) => c.carriedTreasure)).toEqual([0, 2]);
  expect(r.heroes.find((h) => h.playerId === "p1-0")?.equipment).toEqual({
    kind: "ward",
    charges: 1,
  });
});
it("tie priority rotates rather than favoring join order", () => {
  let s = fixture(2);
  for (const p of s.players) s.actions[p.id] = { kind: "loot" };
  s = resolveCombat(s).state;
  const winner = s.crews.find((c) => c.carriedTreasure > 0)?.id;
  next(s);
  for (const h of s.heroes) {
    h.hp = h.maxHp;
    h.equipment = null;
    s.actions[h.playerId] = { kind: "loot" };
  }
  s = resolveCombat(s).state;
  expect(s.crews.every((c) => c.carriedTreasure === 2)).toBe(true);
  expect(winner).toBeTruthy();
});
it("death preserves secured score and discards carried treasure on last death", () => {
  const s = fixture(1);
  s.heroes[0].hp = 12;
  s.actions["p0-0"] = { kind: "loot" };
  s.crews[0].securedTreasure = 8;
  s.crews[0].carriedTreasure = 9;
  const r = resolveCombat(s).state;
  expect(r.heroes[0].status).toBe("dead");
  expect(r.crews[0]).toMatchObject({
    status: "eliminated",
    carriedTreasure: 0,
    securedTreasure: 8,
  });
});
it("partial crew death keeps treasure and spirit wards never revive", () => {
  const s = fixture(2, [2, 1]);
  s.heroes[0].hp = 6;
  s.actions["p0-0"] = { kind: "loot" };
  s.crews[0].carriedTreasure = 9;
  let r = resolveCombat(s).state;
  expect(r.crews[0].status).toBe("active");
  expect(r.crews[0].carriedTreasure).toBeGreaterThanOrEqual(9);
  next(r);
  r.actions["p0-0"] = { kind: "ward", targetHeroId: r.heroes[2].id };
  r.actions["p1-0"] = { kind: "loot" };
  r = resolveCombat(r).state;
  expect(r.heroes[0].status).toBe("dead");
  expect(r.heroes[2].hp).toBe(30);
});
it("spirit wards are capped by recipient power", () => {
  const s = fixture(3);
  for (const h of s.heroes.slice(0, 2)) {
    h.hp = 0;
    h.status = "dead";
    const c = s.crews.find((c) => c.id === h.crewId);
    if (c) {
      c.status = "eliminated";
      c.location = { kind: "camp" };
    }
  }
  for (const h of s.heroes.slice(0, 2))
    s.actions[h.playerId] = { kind: "ward", targetHeroId: s.heroes[2].id };
  s.actions["p2-0"] = { kind: "loot" };
  const r = resolveCombat(s).state;
  expect(r.heroes[2].hp).toBe(48);
  expect(r.encounters[0].contribution.c0).toBeUndefined();
});
it("strict-majority withdrawal cancels attacks without resizing enemy", () => {
  const s = fixture(2, [2, 1]);
  s.withdrawVotes["p0-0"] = true;
  s.withdrawVotes["p0-1"] = true;
  s.actions["p0-0"] = { kind: "attack", part: "body" };
  const r = resolveCombat(s).state;
  expect(r.crews[0].location.kind).toBe("camp");
  expect(r.encounters[0].maxBodyHp).toBe(96);
  expect(r.encounters[0].bodyHp).toBe(96);
  expect(r.heroes[0].stress).toBe(1);
});
it("panic ignores barriers and lantern precedes panic", () => {
  const s = fixture(1);
  s.heroes[0].stress = 5;
  s.heroes[0].classId = "occultist";
  s.actions["p0-0"] = { kind: "hex", part: "body" };
  let r = resolveCombat(s).state;
  expect(r.heroes[0].stress).toBe(3);
  expect(r.heroes[0].hp).toBe(24);
  s.heroes[0].equipment = { kind: "lantern", charges: 2 };
  r = resolveCombat(s).state;
  expect(r.heroes[0].stress).toBe(5);
  expect(r.heroes[0].hp).toBe(36);
  expect(r.heroes[0].equipment?.charges).toBe(1);
});
it("ward is not consumed behind brace; salve cannot revive", () => {
  const s = fixture(1);
  s.heroes[0].equipment = { kind: "ward", charges: 2 };
  expect(resolveCombat(s).state.heroes[0].equipment?.charges).toBe(2);
  s.heroes[0].equipment = { kind: "salve", charges: 2 };
  s.heroes[0].hp = 12;
  s.actions["p0-0"] = { kind: "loot" };
  expect(resolveCombat(s).state.heroes[0].status).toBe("dead");
});
it("turn four times out without a purse", () => {
  const s = fixture(1);
  s.turn = 4;
  const r = resolveCombat(s).state;
  expect(r.encounters[0].status).toBe("timed-out");
  expect(r.crews[0].carriedTreasure).toBe(0);
});
it("camp secures treasure and bargain has a next-depth lifetime", () => {
  const s = fixture(2);
  s.phase = { kind: "camp" };
  s.phaseId++;
  s.crews[0].carriedTreasure = 10;
  s.campVotes["p0-0"] = "secure";
  s.campVotes["p1-0"] = "bargain";
  resolveCamp(s);
  expect(s.crews[0].securedTreasure).toBe(10);
  expect(s.heroes[1].bargainDepth).toBe(2);
  expect(() => resolveCamp(s)).toThrow("already");
});
it("final extraction banks survivors and tied crews share victory", () => {
  const s = fixture(2);
  for (const c of s.crews) c.carriedTreasure = 7;
  s.phaseId++;
  extract(s);
  finishMatch(s);
  expect(s.winners).toHaveLength(2);
});
it("missing/ghost answers count, rewards cap at two and grant once", () => {
  const s = fixture(2, [2, 1]);
  s.quizQuestionId = s.questionDeck[0];
  const q = s.content.questions.find((q) => q.id === s.quizQuestionId);
  if (!q) throw new Error("Missing fixture question");
  s.answers["p0-0"] = q.correctIndex;
  s.answers["p1-0"] = q.correctIndex;
  s.phaseId++;
  lockQuiz(s);
  expect(s.quizResults.map((r) => r.tier)).toEqual(["partial", "perfect"]);
  s.phaseId++;
  grantEquipment(s);
  expect(s.heroes.map((h) => h.equipment?.charges)).toEqual([1, 1, 2]);
  expect(() => grantEquipment(s)).toThrow("already");
});
it("solutions and private inputs never enter projector snapshots", () => {
  const s = fixture(2);
  s.quizQuestionId = s.questionDeck[0];
  s.phase = { kind: "question", questionId: s.quizQuestionId };
  s.actions["p0-0"] = { kind: "loot" };
  s.answers["p0-0"] = 1;
  const v = projectRoom(s, null, false, options);
  expect(JSON.stringify(v)).not.toContain("correctIndex");
  expect(JSON.stringify(v)).not.toContain("answers");
  expect(v.correctChoice).toBeNull();
});
it("learning disabled never schedules an encounter; full combat states obey invariants", () => {
  const s = fixture(2);
  s.learningEnabled = false;
  for (const p of s.players) s.actions[p.id] = { kind: "attack", part: "weak-point" };
  const r = resolveCombat(s).state;
  expect(r.quizQuestionId).toBeNull();
  assertInvariants(r);
  expect(() => resolveCombat(r)).toThrow("already");
});
