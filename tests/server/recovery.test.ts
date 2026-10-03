import { expect, it } from "vitest";
import { assertInvariants } from "../../src/game/invariants.js";
import { resolveCombat } from "../../src/game/resolve-combat.js";
import { offerRooms, resolveRoutes } from "../../src/game/routes.js";
import { cloneRoom } from "../../src/server/clone-room.js";
import { hostControl } from "../../src/server/handlers/host.js";
import { advancePhase, setDeadline } from "../../src/server/room-clock.js";
import { createRoomManager, emptyRoom } from "../../src/server/room-manager.js";
import type { StoredRoom } from "../../src/server/room-types.js";
import { fixture } from "../fixtures/match.js";
import { memoryStorage } from "../fixtures/server.js";

it("drafts isolate mutable inputs and resolution without recopying immutable archives", () => {
  for (const original of phaseFixtures().values()) {
    const baseline = structuredClone(original);
    const draft = cloneRoom(original);
    expect(draft.state.content).toBe(original.state.content);
    draft.processed["new-receipt"] = { fingerprint: "test", receipt: { revision: 1 } };
    advancePhase(draft, 100000);
    expect(original).toEqual(baseline);
    expect(draft.processed).not.toBe(original.processed);
  }
});

function phaseFixtures() {
  const room = emptyRoom(fixture(1));
  setDeadline(room, 1000);
  const phases = new Map<string, StoredRoom>();
  for (let guard = 0; room.state.status === "running" && guard < 180; guard++) {
    const s = room.state;
    if (!phases.has(s.phase.kind)) phases.set(s.phase.kind, structuredClone(room));
    if (s.phase.kind === "combat")
      for (const h of s.heroes)
        s.actions[h.playerId] = { kind: "attack", part: s.turn === 1 ? "weak-point" : "body" };
    if (s.phase.kind === "camp") for (const p of s.players) s.campVotes[p.id] = "rest";
    if (s.phase.kind === "question") {
      const q = s.content.questions.find((q) => q.id === s.quizQuestionId);
      if (!q) throw new Error("Missing question");
      for (const p of s.players) s.answers[p.id] = q.correctIndex;
    }
    assertInvariants(s);
    advancePhase(room, 1000 + guard * 60000);
  }
  expect(room.state.depth).toBe(5);
  expect(room.state.status).toBe("finished");
  return phases;
}
it("a complete expedition resumes every phase paused without replaying damage, treasure or rewards", async () => {
  const phases = phaseFixtures();
  expect(phases.size).toBe(14);
  for (const old of phases.values()) {
    const memory = memoryStorage();
    await memory.storage.save(old);
    const manager = createRoomManager(memory.storage, old.state.content, () => 100000);
    await manager.restore();
    const restored = manager.rooms.get(old.state.code);
    if (!restored) throw new Error("Restore missing");
    expect(restored.state.status).toBe("paused");
    expect(restored.state.resolvedPhaseIds).toEqual(old.state.resolvedPhaseIds);
    expect(restored.state.history).toEqual(old.state.history);
    expect(restored.state.quizContinuation).toEqual(old.state.quizContinuation);
    const env = { requestId: "resume-fixture", matchId: old.state.id, phaseId: old.state.phaseId };
    hostControl(restored, { ...env, command: { kind: "resume" } }, 100000);
    const expected = structuredClone(old);
    expected.state.history = structuredClone(restored.state.history);
    advancePhase(expected, 100000);
    advancePhase(restored, 100000);
    expect(restored.state).toEqual(expected.state);
    assertInvariants(restored.state);
  }
});
it("concurrent deadline ticks close a phase once inside the queue", async () => {
  const memory = memoryStorage();
  const state = fixture(1);
  state.actions["p0-0"] = { kind: "loot" };
  const room = emptyRoom(state);
  setDeadline(room, 0);
  const manager = createRoomManager(memory.storage, state.content);
  manager.rooms.set(state.code, room);
  await Promise.all([manager.tick(45000), manager.tick(45000), manager.tick(45000)]);
  const s = manager.rooms.get(state.code)?.state;
  expect(s?.phase.kind).toBe("combat-reveal");
  expect(s?.heroes[0].hp).toBe(36);
  expect(s?.crews[0].carriedTreasure).toBe(2);
  expect(s?.resolvedPhaseIds.filter((id) => id === state.phaseId)).toHaveLength(1);
});

it("rivalry results and pending mastery survive a paused restart without replaying rewards", async () => {
  const s = fixture(2);
  s.depth = 2;
  s.seed = 1;
  offerRooms(s);
  s.phaseId++;
  const high = s.offeredRooms.find((r) => r.risk === "high");
  if (!high) throw new Error("Missing door");
  for (const p of s.players) s.routeVotes[p.id] = high.id;
  resolveRoutes(s);
  s.phaseId++;
  s.heroes[1].hp = 12;
  s.actions[s.heroes[0].playerId] = { kind: "duel-attack", targetHeroId: s.heroes[1].id };
  s.actions[s.heroes[1].playerId] = { kind: "loot" };
  const room = emptyRoom(resolveCombat(s).state);
  room.state.phase = { kind: "combat-reveal" };
  room.state.phaseId++;
  setDeadline(room, 0);
  const memory = memoryStorage();
  await memory.storage.save(room);
  const manager = createRoomManager(memory.storage, s.content, () => 1000);
  await manager.restore();
  const restored = manager.rooms.get(s.code);
  if (!restored) throw new Error("Missing room");
  expect(restored.state.status).toBe("paused");
  expect(restored.state.encounters[0].rivalry?.winnerCrewId).toBe(s.crews[0].id);
  expect(restored.state.heroes[0].mastery).toEqual({ rank: 1, activeFromTurn: 2 });
  expect(restored.state.crews[0].carriedTreasure).toBe(12);
  const env = { requestId: "resume-rivalry", matchId: s.id, phaseId: restored.state.phaseId };
  hostControl(restored, { ...env, command: { kind: "resume" } }, 1000);
  advancePhase(restored, 1000);
  expect(restored.state.crews[0].carriedTreasure).toBe(12);
  expect(restored.state.heroes[1].status).toBe("dead");
  expect(restored.state.resolvedPhaseIds.filter((id) => id === s.phaseId)).toHaveLength(1);
});
