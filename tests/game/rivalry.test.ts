import { expect, it } from "vitest";
import { legalActions } from "../../src/game/action-options.js";
import { assertInvariants } from "../../src/game/invariants.js";
import { masteryBonus } from "../../src/game/mastery.js";
import { projectRoom } from "../../src/game/projections.js";
import { resolveCombat } from "../../src/game/resolve-combat.js";
import { rivalryDoor } from "../../src/game/rivalry.js";
import { offerRooms, resolveRoutes } from "../../src/game/routes.js";
import { submitAction } from "../../src/server/handlers/hero-actions.js";
import { emptyRoom } from "../../src/server/room-manager.js";
import { fixture, next } from "../fixtures/match.js";

function rivalry(sizes = [1, 1], splitLast = false) {
  const s = fixture(sizes.length, sizes);
  s.depth = 2;
  s.seed = 1;
  offerRooms(s);
  s.phaseId++;
  const door = s.offeredRooms.find((r) => r.risk === "high");
  if (!door) throw new Error("Missing room");
  for (const p of s.players)
    s.routeVotes[p.id] =
      splitLast && p.crewId === s.crews.at(-1)?.id
        ? (s.offeredRooms.find((r) => r.risk === "low")?.id ?? door.id)
        : door.id;
  resolveRoutes(s);
  s.phaseId++;
  s.actions = {};
  return s;
}

it("rivalry doors are deterministic, announced before voting, and require exactly two crews", () => {
  const s = rivalry();
  expect(s.encounters[0].rivalry).toEqual({ winnerCrewId: null });
  expect(s.offeredRooms.filter((r) => rivalryDoor(s, r))).toHaveLength(1);
  expect(rivalry([1, 1, 1]).encounters[0].rivalry).toBeUndefined();
  expect(rivalry([1]).encounters[0].rivalry).toBeUndefined();
  const view = projectRoom(s, null, false, {
    deadline: 10,
    remaining: null,
    phaseStartedAt: 0,
    phaseDuration: 10,
    serverNow: 0,
    speed: "normal",
    storageError: null,
    testMode: false,
    readOnly: false,
  });
  expect(view.rivalryRoomIds).toEqual([s.encounters[0].id]);
  expect("actions" in view).toBe(false);
});

it("rival attacks kill simultaneously, keep banked scores and leave permanent spirits", () => {
  const s = rivalry();
  s.heroes.forEach((h) => {
    h.hp = 24;
  });
  s.crews.forEach((c) => {
    c.securedTreasure = 7;
    c.carriedTreasure = 5;
  });
  s.actions[s.heroes[0].playerId] = { kind: "duel-attack", targetHeroId: s.heroes[1].id };
  s.actions[s.heroes[1].playerId] = { kind: "duel-attack", targetHeroId: s.heroes[0].id };
  const original = structuredClone(s);
  const result = resolveCombat(s).state;
  expect(s).toEqual(original);
  expect(resolveCombat(s).state).toEqual(result);
  expect(result.heroes.map((h) => h.status)).toEqual(["dead", "dead"]);
  expect(result.crews.map((c) => c.securedTreasure)).toEqual([7, 7]);
  expect(result.crews.map((c) => c.carriedTreasure)).toEqual([0, 0]);
  expect(result.encounters[0].rivalry?.winnerCrewId).toBeNull();
  expect(result.heroes.every((h) => !h.mastery)).toBe(true);
  assertInvariants(result);
});

it("a surviving winner earns carried treasure and mastery without receiving an enemy attack", () => {
  const s = rivalry();
  const [winner, loser] = s.heroes;
  loser.hp = 12;
  s.actions[winner.playerId] = { kind: "duel-attack", targetHeroId: loser.id };
  s.actions[loser.playerId] = { kind: "loot" };
  const result = resolveCombat(s).state;
  expect(result.heroes[0].hp).toBe(winner.maxHp);
  expect(result.heroes[1].status).toBe("dead");
  expect(result.encounters[0].status).toBe("defeated");
  expect(result.encounters[0].rivalry?.winnerCrewId).toBe(winner.crewId);
  expect(result.crews[0].carriedTreasure).toBe(12);
  expect(result.crews[0].securedTreasure).toBe(0);
  expect(result.heroes[0].mastery).toEqual({ rank: 1, activeFromTurn: 2 });
  expect(masteryBonus(result.heroes[0], 1)).toBe(0);
  expect(masteryBonus(result.heroes[0], 2)).toBe(4);
  expect(result.quizQuestionId).not.toBeNull();
  assertInvariants(result);
});

it("rivalry targets enforce room, crew and class ownership on the server", () => {
  const s = rivalry([2, 1]);
  const room = emptyRoom(s);
  const [hero, ally, rival] = s.heroes;
  expect(() =>
    submitAction(room, hero.playerId, { kind: "duel-attack", targetHeroId: ally.id }, 0),
  ).toThrow();
  expect(() =>
    submitAction(room, hero.playerId, { kind: "duel-hex", targetHeroId: rival.id }, 0),
  ).toThrow();
  expect(() => submitAction(room, hero.playerId, { kind: "attack", part: "body" }, 0)).toThrow();
  expect(() =>
    submitAction(room, hero.playerId, { kind: "protect", targetHeroId: rival.id }, 0),
  ).toThrow();
  expect(() =>
    submitAction(room, hero.playerId, { kind: "duel-attack", targetHeroId: rival.id }, 0),
  ).not.toThrow();
  s.heroes[2].status = "dead";
  s.heroes[2].hp = 0;
  expect(legalActions(s, hero).some((a) => a.kind === "duel-attack")).toBe(false);
});

it("barriers and equipment work in rivalries and fully blocked attacks earn no damage credit", () => {
  const s = rivalry();
  const [attacker, defender] = s.heroes;
  defender.equipment = { kind: "ward", charges: 1 };
  s.actions[attacker.playerId] = { kind: "duel-attack", targetHeroId: defender.id };
  s.actions[defender.playerId] = { kind: "brace" };
  const result = resolveCombat(s).state;
  expect(result.heroes[1].hp).toBe(defender.maxHp);
  expect(result.heroes[1].equipment?.charges).toBe(1);
  expect(result.encounters[0].contribution[attacker.crewId] ?? 0).toBe(0);
  expect(result.encounters[0].contribution[defender.crewId]).toBe(defender.power);
});

it("withdrawal cancels rival attacks without granting a victory purse or mastery", () => {
  const s = rivalry();
  const [first, second] = s.heroes;
  s.actions[first.playerId] = { kind: "duel-attack", targetHeroId: second.id };
  s.actions[second.playerId] = { kind: "duel-attack", targetHeroId: first.id };
  s.withdrawVotes[first.playerId] = true;
  s.crews[0].carriedTreasure = 5;
  const result = resolveCombat(s).state;
  expect(result.heroes.map((h) => h.hp)).toEqual([48, 48]);
  expect(result.encounters[0].status).toBe("abandoned");
  expect(result.crews.map((c) => c.carriedTreasure)).toEqual([5, 0]);
  expect(result.heroes.every((h) => !h.mastery)).toBe(true);
  assertInvariants(result);
});

it("missing rival actions brace and four turns time out without a winner", () => {
  let s = rivalry();
  for (let turn = 1; turn <= 4; turn++) {
    s = resolveCombat(s).state;
    if (turn < 4) next(s);
  }
  expect(s.encounters[0].status).toBe("timed-out");
  expect(s.encounters[0].rivalry?.winnerCrewId).toBeNull();
  expect(s.heroes.every((h) => h.status === "alive" && !h.mastery)).toBe(true);
  expect(s.crews.every((c) => c.carriedTreasure === 0)).toBe(true);
});

it("old saves keep their original combat and progression rules", () => {
  const s = fixture(1);
  delete s.expeditionFeatures;
  s.encounters[0].bodyHp = 24;
  s.actions[s.heroes[0].playerId] = { kind: "attack", part: "body" };
  const result = resolveCombat(s).state;
  expect(result.heroes[0].mastery).toBeUndefined();
  expect(result.expeditionFeatures).toBeUndefined();
  result.depth = 2;
  result.seed = 1;
  expect(result.content.rooms.some((r) => rivalryDoor(result, r))).toBe(false);
});

it("mastery improves skills, keeps frozen power and cannot exceed two ranks", () => {
  const s = fixture(1);
  const hero = s.heroes[0];
  hero.classId = "occultist";
  hero.mastery = { rank: 2, activeFromTurn: 1 };
  s.actions[hero.playerId] = { kind: "hex", part: "body" };
  const before = s.encounters[0].bodyHp;
  const result = resolveCombat(s).state;
  expect(result.encounters[0].bodyHp).toBe(before - 44);
  expect(result.heroes[0].power).toBe(hero.power);
  expect(result.heroes[0].maxHp).toBe(hero.maxHp);
  expect(result.heroes[0].mastery?.rank).toBe(2);
  assertInvariants(result);
});

it("rival attacks reject heroes in other rooms while spirit aid can cross rooms", () => {
  const s = rivalry([1, 1, 1], true);
  const [hero, rival, outsider] = s.heroes;
  const room = emptyRoom(s);
  expect(() =>
    submitAction(room, hero.playerId, { kind: "duel-attack", targetHeroId: outsider.id }, 0),
  ).toThrow();
  expect(() =>
    submitAction(room, hero.playerId, { kind: "duel-attack", targetHeroId: rival.id }, 0),
  ).not.toThrow();
  outsider.status = "dead";
  outsider.hp = 0;
  expect(legalActions(s, outsider)).toContainEqual({ kind: "ward", targetHeroId: hero.id });
});

it("mastery strengthens living protection and healing while a new rank waits for next combat", () => {
  const s = rivalry();
  const [attacker, defender] = s.heroes;
  attacker.classId = "occultist";
  defender.mastery = { rank: 2, activeFromTurn: 1 };
  s.actions[attacker.playerId] = { kind: "duel-hex", targetHeroId: defender.id };
  s.actions[defender.playerId] = { kind: "brace" };
  expect(resolveCombat(s).state.heroes[1].hp).toBe(44);
  defender.classId = "physician";
  defender.hp = 12;
  s.actions[attacker.playerId] = { kind: "brace" };
  s.actions[defender.playerId] = { kind: "mend", targetHeroId: defender.id };
  expect(resolveCombat(s).state.heroes[1].hp).toBe(44);

  const victory = fixture(1);
  const hero = victory.heroes[0];
  hero.mastery = { rank: 1, activeFromTurn: 1 };
  victory.encounters[0].bodyHp = 28;
  victory.actions[hero.playerId] = { kind: "attack", part: "body" };
  const result = resolveCombat(victory).state;
  expect(result.heroes[0].mastery).toEqual({ rank: 2, activeFromTurn: 2 });
  expect(masteryBonus(result.heroes[0], 2)).toBe(8);
});
