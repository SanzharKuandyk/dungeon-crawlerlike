import { expect, it } from "vitest";
import { createMatch, startMatch } from "../../src/game/create-match.js";
import { applyLantern, applySalve } from "../../src/game/equipment.js";
import { beginEvents } from "../../src/game/events.js";
import { assertInvariants } from "../../src/game/invariants.js";
import {
  activeQuestion,
  chooseQuestion,
  grantEquipment,
  lockQuiz,
} from "../../src/game/learning.js";
import { resolveCamp } from "../../src/game/resolve-camp.js";
import { resolveCombat } from "../../src/game/resolve-combat.js";
import { offerRooms, resolveRoutes } from "../../src/game/routes.js";
import { finishMatch } from "../../src/game/scoring.js";
import { winningCamp, winningRoute } from "../../src/game/voting.js";
import {
  chooseClass,
  createCrew,
  crewSymbol,
  joinCrew,
  joinPlayer,
} from "../../src/server/handlers/lobby.js";
import { emptyRoom } from "../../src/server/room-manager.js";
import { fixture, next } from "../fixtures/match.js";

it("ties rotate through surviving members and abstentions use safe defaults", () => {
  const s = fixture(1, [2]);
  s.routeVotes = { "p0-0": "d1-1", "p0-1": "d1-2" };
  expect(winningRoute(s, "c0")).toBe("d1-1");
  s.depth = 2;
  expect(winningRoute(s, "c0")).toBe("d1-2");
  s.campVotes = {};
  expect(winningCamp(s, "c0")).toBe("rest");
  s.crews[0].carriedTreasure = 8;
  expect(winningCamp(s, "c0")).toBe("secure");
  s.heroes[0].hp = 0;
  s.heroes[0].status = "dead";
  s.routeVotes = { "p0-0": "bad", "p0-1": "d1-2" };
  expect(winningRoute(s, "c0")).toBe("d1-2");
});
it("joining a third member resets restricted classes with a clear notice", () => {
  const s = createMatch("lobby", "ABC123", fixture().content, 1),
    r = emptyRoom(s);
  const ids = [1, 2, 3].map((i) => joinPlayer(r, `P${i}`, String(i).repeat(64)).playerId);
  createCrew(r, ids[0], "Small crew");
  const crew = s.crews[0];
  chooseClass(r, ids[0], "wanderer");
  joinCrew(r, ids[1], crew.id);
  chooseClass(r, ids[1], "exorcist");
  joinCrew(r, ids[2], crew.id);
  expect(s.players.slice(0, 2).every((p) => p.classId === "knight" && p.classNotice)).toBe(true);
  expect(() => chooseClass(r, ids[0], "wanderer")).toThrow("one or two");
  s.players[0].classId = "wanderer";
  expect(() => startMatch(s)).toThrow("not available");
});
it("more than eight crews have unique symbols while palette colors safely cycle", () => {
  const r = emptyRoom(createMatch("many", "ABC123", fixture().content, 7));
  for (let i = 0; i < 32; i++) {
    const p = joinPlayer(r, `Player ${i}`, i.toString(16).padStart(64, "0"));
    createCrew(r, p.playerId, `Crew ${i}`);
  }
  expect(r.state.crews).toHaveLength(32);
  expect(crewSymbol(26)).toBe("AA");
  expect(crewSymbol(701)).toBe("ZZ");
  expect(new Set(r.state.crews.map((c) => c.symbol)).size).toBe(32);
  expect(new Set(r.state.crews.map((c) => c.colorId)).size).toBe(8);
  assertInvariants(r.state);
});
it("split encounters spawn only occupied rooms and finish independently", () => {
  const s = fixture(2);
  s.phaseId++;
  offerRooms(s);
  s.routeVotes = { "p0-0": "d1-0", "p1-0": "d1-2" };
  resolveRoutes(s);
  expect(s.encounters).toHaveLength(2);
  expect(s.encounters.map((e) => e.spawnPower)).toEqual([12, 12]);
  s.phaseId++;
  const low = s.encounters.find((e) => e.definition.risk === "low");
  if (!low) throw new Error("Missing low room");
  low.bodyHp = 24;
  s.actions = { "p0-0": { kind: "attack", part: "body" } };
  const r = resolveCombat(s).state;
  expect(r.encounters.find((e) => e.definition.risk === "low")?.status).toBe("defeated");
  expect(r.encounters.find((e) => e.definition.risk === "high")?.status).toBe("active");
  expect(r.crews[0].location.kind).toBe("camp");
});
it("Devourer loot danger stops immediately when its weak point breaks", () => {
  const s = fixture(2);
  const e = s.encounters[0];
  e.definition.family = "devourer";
  s.actions = { "p0-0": { kind: "loot" }, "p1-0": { kind: "attack", part: "weak-point" } };
  expect(resolveCombat(s).state.heroes[0].hp).toBe(36);
  s.actions["p1-0"] = { kind: "brace" };
  expect(resolveCombat(s).state.heroes[0].hp).toBe(24);
});
it("depth four turn four escalation is visible and not applied on other turns", () => {
  const s = fixture(1);
  s.depth = 4;
  s.turn = 4;
  s.encounters[0].weakHp = 0;
  s.actions["p0-0"] = { kind: "loot" };
  expect(resolveCombat(s).state.heroes[0].hp).toBe(24);
  s.turn = 3;
  expect(resolveCombat(s).state.heroes[0].hp).toBe(36);
});
it("healing and multi-effect skills count each actor only once", () => {
  const s = fixture(1);
  const h = s.heroes[0];
  h.classId = "exorcist";
  h.hp = 24;
  h.stress = 2;
  s.actions[h.playerId] = { kind: "channel", part: "body" };
  const r = resolveCombat(s).state;
  expect(r.encounters[0].contribution.c0).toBe(12);
  expect(r.heroes[0].stress).toBe(1);
  expect(r.heroes[0].hp).toBe(24);
});
it("a dead looter never wins a bundle or receives cache equipment", () => {
  const s = fixture(2);
  s.heroes[0].hp = 12;
  for (const p of s.players) s.actions[p.id] = { kind: "loot" };
  const r = resolveCombat(s).state;
  expect(r.crews[0].carriedTreasure).toBe(0);
  expect(r.crews[1].carriedTreasure).toBe(2);
  expect(r.heroes[0].equipment).toBeNull();
});
it("loot-only crews get no purse even if rivals kill the body", () => {
  const s = fixture(2);
  s.encounters[0].bodyHp = 24;
  s.actions = { "p0-0": { kind: "loot" }, "p1-0": { kind: "attack", part: "body" } };
  const r = resolveCombat(s).state;
  expect(r.crews[0].carriedTreasure).toBe(2);
  expect(r.crews[1].carriedTreasure).toBe(7);
});
it("Bargain adds damage but never healing, barriers or claim strength", () => {
  const s = fixture(1);
  s.heroes[0].bargainDepth = 1;
  s.actions["p0-0"] = { kind: "attack", part: "body" };
  expect(resolveCombat(s).state.encounters[0].bodyHp).toBe(12);
  s.actions["p0-0"] = { kind: "brace" };
  expect(resolveCombat(s).state.encounters[0].contribution.c0).toBe(12);
});
it("dangerous camp Bargain can kill a hero but cannot lose secured treasure", () => {
  const s = fixture(1);
  s.phaseId++;
  s.heroes[0].hp = 12;
  s.heroes[0].stress = 5;
  s.crews[0].securedTreasure = 11;
  s.campVotes["p0-0"] = "bargain";
  resolveCamp(s);
  expect(s.heroes[0].status).toBe("dead");
  finishMatch(s);
  expect(s.crews[0].securedTreasure).toBe(11);
  expect(s.winners).toEqual(["c0"]);
});
it("question rewards wait for the next combat turn, including across camp", () => {
  const s = fixture(1);
  s.quizQuestionId = s.questionDeck[0];
  s.phaseId++;
  const q = activeQuestion(s);
  if (!q) throw new Error("Missing question");
  s.answers["p0-0"] = q.correctIndex;
  lockQuiz(s);
  s.phaseId++;
  s.equipmentChoices["p0-0"] = "lantern";
  grantEquipment(s);
  s.heroes[0].stress = 5;
  applyLantern(s, s.heroes[0]);
  expect(s.heroes[0].stress).toBe(5);
  s.globalTurn++;
  applyLantern(s, s.heroes[0]);
  expect(s.heroes[0].stress).toBe(3);
});
it("Salve consumes a charge only when a surviving hero benefits", () => {
  const s = fixture(1),
    h = s.heroes[0];
  h.equipment = { kind: "salve", charges: 2 };
  applySalve(s, h);
  expect(h.equipment.charges).toBe(2);
  h.hp = 24;
  applySalve(s, h);
  expect(h.hp).toBe(36);
  expect(h.equipment?.charges).toBe(1);
});
it("missing spirit answers prevent a perfect reward and spirits receive no equipment", () => {
  const s = fixture(1, [2]);
  s.heroes[0].hp = 0;
  s.heroes[0].status = "dead";
  s.quizQuestionId = s.questionDeck[0];
  const q = activeQuestion(s);
  if (!q) throw new Error("Missing question");
  s.answers["p0-1"] = q.correctIndex;
  s.phaseId++;
  lockQuiz(s);
  s.phaseId++;
  grantEquipment(s);
  expect(s.quizResults[0].tier).toBe("partial");
  expect(s.heroes[0].equipment).toBeNull();
  expect(s.heroes[1].equipment?.charges).toBe(1);
});
it("question causes coalesce, no question repeats, exhausted and final-depth banks skip quizzes", () => {
  let s = fixture(1);
  s.actions["p0-0"] = { kind: "attack", part: "weak-point" };
  s = resolveCombat(s).state;
  expect(s.usedQuestions).toHaveLength(1);
  expect(s.quizCause).toContain("weak point");
  next(s);
  s.actions["p0-0"] = { kind: "loot" };
  s = resolveCombat(s).state;
  expect(s.usedQuestions).toHaveLength(1);
  s.depth = 2;
  s.usedQuestions = [...s.questionDeck];
  chooseQuestion(s);
  expect(s.quizQuestionId).toBeNull();
  s.depth = 5;
  s.usedQuestions = [];
  chooseQuestion(s);
  expect(s.quizQuestionId).toBeNull();
});
it("empty histories do not grow when no phase was resolved", () => {
  const s = fixture(1);
  const count = s.history.length;
  beginEvents(s);
  expect(s.history).toHaveLength(count);
});
