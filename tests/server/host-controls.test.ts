import { randomBytes } from "node:crypto";
import { afterEach, expect, it } from "vitest";
import { extendClock, freezeClock, newClock, resumeClock } from "../../src/server/clocks.js";
import { progressDuels } from "../../src/server/duel-coordinator.js";
import { hostControl } from "../../src/server/handlers/host.js";
import { requireHostAccess } from "../../src/server/host-access.js";
import { beginQuestion, skipQuestion } from "../../src/server/question-coordinator.js";
import { issueRecovery, recoverHost, redeemRecovery } from "../../src/server/recovery.js";
import { createLimits } from "../../src/server/request-limits.js";
import { pauseRoom, resumeRoom } from "../../src/server/room-lifecycle.js";
import { createRoomManager } from "../../src/server/room-manager.js";
import { hashToken } from "../../src/server/sessions.js";
import { createTestRoom } from "../../src/server/test-mode/create-test-room.js";
import type { HostCommand } from "../../src/shared/host-types.js";
import { memoryStorage, serverFixture } from "../fixtures/server.js";

const secret = () => randomBytes(32).toString("hex");
const fixtures: Awaited<ReturnType<typeof serverFixture>>[] = [];
afterEach(async () => {
  for (const f of fixtures.splice(0)) await f.close();
});
async function setup(scenario: "split" | "duel" = "split") {
  const f = await serverFixture();
  fixtures.push(f);
  const input = {
    hostSecret: secret(),
    scenario,
    players: Array.from({ length: 10 }, (_, i) => ({
      clientId: String(i),
      bootstrapSecret: secret(),
    })),
  };
  const data = await createTestRoom(f.server.manager, input);
  const room = f.server.manager.rooms.get(data.code);
  if (!room) throw new Error("Missing room");
  room.speed = "normal";
  for (const p of room.state.players) p.connected = true;
  for (const run of Object.values(room.runs)) run.clock = newClock(45000, 1000, true);
  const env = () => ({ requestId: secret(), matchId: room.state.id, phaseId: room.state.phaseId });
  const command = (command: HostCommand) => hostControl(room, { ...env(), command }, 2000);
  return { ...f, input, data, room, env, command };
}
it("clocks freeze once, preserve elapsed reveal, and extend without changing elapsed", () => {
  const c = newClock(10000, 1000, true);
  freezeClock(c, 4000);
  freezeClock(c, 9000);
  expect(c.remainingMs).toBe(7000);
  expect(c.elapsedMs).toBe(3000);
  extendClock(c, 30000, 9000);
  resumeClock(c, 20000);
  expect(c.deadline).toBe(57000);
  expect(c.startedAt).toBe(17000);
});
it("global pause and shared question cannot accidentally resume crew clocks", async () => {
  const { room, command } = await setup();
  room.discovery = { cause: "Seal breaks", depth: 1 };
  beginQuestion(room, 2000);
  expect(room.state.quizQuestionId).toBeTruthy();
  command({ kind: "pause" });
  command({ kind: "resume" });
  expect(Object.values(room.runs).every((r) => r.clock.deadline === null)).toBe(true);
  command({ kind: "pause" });
  skipQuestion(room, 3000);
  expect(room.state.status).toBe("paused");
  expect(Object.values(room.runs).every((r) => r.clock.deadline === null)).toBe(true);
  command({ kind: "resume" });
  expect(Object.values(room.runs).every((r) => r.clock.deadline !== null)).toBe(true);
});
it("crew pause blocks readiness and global resume preserves crew blockers", async () => {
  const { room, command } = await setup();
  const [run, other] = Object.values(room.runs);
  command({ kind: "crew-pause", crewId: run.crewId, expectedCrewPhaseId: run.progress.phaseId });
  pauseRoom(room, "host", 3000);
  resumeRoom(room, 9000);
  expect(run.clock.deadline).toBeNull();
  expect(other.clock.deadline).not.toBeNull();
  expect(() =>
    command({ kind: "crew-extend", crewId: run.crewId, expectedCrewPhaseId: 0 }),
  ).toThrow("another phase");
});
it("forced defaults preserve accepted actions, and extension adds exactly 30 seconds", async () => {
  const { room, command } = await setup();
  const run = Object.values(room.runs)[3];
  const hero = room.state.heroes.find((h) => h.crewId === run.crewId);
  if (!hero) throw new Error("No hero");
  run.progress.actions[hero.playerId] = { kind: "loot" };
  const original = run.clock.deadline;
  command({ kind: "crew-extend", crewId: run.crewId, expectedCrewPhaseId: run.progress.phaseId });
  expect(run.clock.deadline).toBe((original ?? 0) + 30000);
  command({ kind: "crew-resolve", crewId: run.crewId, expectedCrewPhaseId: run.progress.phaseId });
  expect(run.progress.resolvedActions[hero.playerId]).toEqual({ kind: "loot" });
  expect(run.progress.phase.kind).toBe("combat-reveal");
});
it("unlocked question skip consumes its entry without Blood costs or rewards", async () => {
  const { room, command } = await setup();
  room.discovery = { cause: "Inscription", depth: 1 };
  beginQuestion(room, 2000);
  const id = room.state.quizQuestionId;
  if (!id) throw new Error("No quiz");
  const hero = room.state.heroes[0],
    hp = hero.hp;
  room.state.answers[hero.playerId] = 0;
  room.state.answerPacts[hero.playerId] = "blood";
  command({ kind: "question-skip", questionId: id });
  expect(hero.hp).toBe(hp);
  expect(hero.equipment).toBeNull();
  expect(room.state.usedQuestions).toContain(id);
  expect(room.state.quizQuestionId).toBeNull();
});
it("cancelled duel refunds once, retains damage, restores both phases, and refuses settled cancellation", async () => {
  const { room, command } = await setup("duel");
  const duel = room.duels[0];
  const total =
    room.state.crews.reduce((s, c) => s + c.carriedTreasure, 0) +
    Object.values(duel.stakes).reduce((s, n) => s + n, 0);
  const actor = room.state.heroes.find((h) => h.crewId === duel.crewIds[0]);
  const rival = room.state.heroes.find((h) => h.crewId === duel.crewIds[1]);
  if (!actor || !rival) throw new Error("Missing rival");
  duel.actions[actor.playerId] = { kind: "strike", targetHeroId: rival.id };
  progressDuels(room, 3000, true);
  const hp = rival.hp;
  command({ kind: "duel-cancel", duelId: duel.id, expectedTurn: 1, expectedDuelPhase: "reveal" });
  expect(rival.hp).toBe(hp);
  expect(duel.status).toBe("finished");
  expect(room.state.crews.reduce((s, c) => s + c.carriedTreasure, 0)).toBe(total);
  expect(() =>
    command({ kind: "duel-cancel", duelId: duel.id, expectedTurn: 1, expectedDuelPhase: "reveal" }),
  ).toThrow("settled");
});
it("replacement redemption preserves hero and inputs, rotates tokens, and survives lost response", async () => {
  const { room, input, env } = await setup();
  const player = room.state.players[0];
  const original = structuredClone(room.state.heroes);
  const code = "ABCDEFGHIJKL";
  issueRecovery(room, { ...env(), playerId: player.id, recoveryCode: code }, 1000);
  const request = { code: room.state.code, recoveryCode: code, bootstrapSecret: secret() };
  expect(redeemRecovery(room, request, 2000).playerId).toBe(player.id);
  expect(redeemRecovery(room, request, 999999).playerId).toBe(player.id);
  expect(room.sessions[hashToken(input.players[0].bootstrapSecret)]).toBeUndefined();
  expect(room.state.heroes).toEqual(original);
  expect(() => redeemRecovery(room, { ...request, bootstrapSecret: secret() }, 2000)).toThrow(
    "already used",
  );
  expect(
    room.state.history.filter(
      (e) => e.kind === "host-intervention" && e.intervention === "player-recovery",
    ),
  ).toHaveLength(1);
});
it("expired recovery and invalid host recovery keys leave identities unchanged", async () => {
  const { room, env } = await setup();
  const code = "ABCDEFGHIJKL";
  issueRecovery(room, { ...env(), playerId: room.state.players[0].id, recoveryCode: code }, 1000);
  const sessions = structuredClone(room.sessions);
  expect(() =>
    redeemRecovery(
      room,
      { code: room.state.code, recoveryCode: code, bootstrapSecret: secret() },
      301000,
    ),
  ).toThrow("expired");
  expect(room.sessions).toEqual(sessions);
  expect(() => requireHostAccess(secret(), secret())).toThrow("host recovery key");
});
it("restart uses last save time and preserves tokens, receipts, duel stakes and continuation", async () => {
  const { room } = await setup("duel");
  room.testMode = false;
  room.savedAt = 3000;
  const memory = memoryStorage();
  await memory.storage.save(room);
  const manager = createRoomManager(memory.storage, room.state.content, () => 900000);
  await manager.restore();
  const restored = manager.rooms.get(room.state.code);
  expect(restored?.pauseReasons).toContain("server-restart");
  expect(restored?.sessions).toEqual(room.sessions);
  expect(restored?.duels).toEqual(room.duels);
  const first = Object.values(restored?.runs ?? {})[0];
  expect(first.clock.elapsedMs).toBe(2000);
  expect(first.clock.remainingMs).toBe(43000);
  if (restored) resumeRoom(restored, 900000);
  expect(first.clock.deadline).toBe(943000);
});
it("host recovery rotates authority and does not resume gameplay", async () => {
  const { room, input } = await setup();
  const key = secret();
  recoverHost(
    room,
    { code: room.state.code, installationKey: secret(), bootstrapSecret: key },
    3000,
  );
  expect(room.sessions[hashToken(input.hostSecret)]).toBeUndefined();
  expect(room.state.status).toBe("paused");
  const history = room.state.history.length;
  recoverHost(
    room,
    { code: room.state.code, installationKey: secret(), bootstrapSecret: key },
    4000,
  );
  expect(room.state.history).toHaveLength(history);
});

it("restore save failure preserves a paused room with an actionable error", async () => {
  const { room } = await setup();
  room.testMode = false;
  room.savedAt = 2000;
  const memory = memoryStorage();
  await memory.storage.save(room);
  memory.setFail(true);
  const manager = createRoomManager(memory.storage, room.state.content, () => 900000);
  await manager.restore();
  const restored = manager.rooms.get(room.state.code);
  expect(restored?.state.status).toBe("paused");
  expect(restored?.pauseReasons).toContain("save-failed");
  expect(restored?.storageError).toContain("disk space");
  expect(restored?.state.heroes).toEqual(room.state.heroes);
});
it("limits reject floods but admit independent identities and refill", () => {
  const limits = createLimits();
  for (let i = 0; i < 20; i++) limits.consume("a", 20, 0.01, 1000);
  expect(() => limits.consume("a", 20, 0.01, 1000)).toThrow("Too many");
  expect(() => limits.consume("b", 20, 0.01, 1000)).not.toThrow();
  expect(() => limits.consume("a", 20, 0.01, 1100)).not.toThrow();
  for (let i = 0; i < 5; i++) limits.window("auth", 5, 10000, 1000);
  expect(() => limits.window("auth", 5, 10000, 9999)).toThrow("Too many");
  expect(() => limits.window("auth", 5, 10000, 11000)).not.toThrow();
});

it.each([
  "route",
  "arrival",
  "combat",
  "combat-reveal",
  "combat-recap",
  "floor-result",
  "question-intro",
  "question",
  "explanation",
  "equipment",
  "return",
  "camp",
  "camp-reveal",
  "extraction",
] as const)("restart in %s preserves phase, inputs, markers and elapsed time", async (kind) => {
  const { room } = await setup();
  room.testMode = false;
  room.savedAt = 3000;
  const run = Object.values(room.runs)[0];
  const questionId = room.state.questionDeck[0];
  const phase =
    kind === "question-intro" ||
    kind === "question" ||
    kind === "explanation" ||
    kind === "equipment"
      ? { kind, questionId }
      : { kind };
  run.progress.phase = phase;
  run.clock = newClock(10000, 1000, true);
  room.state.phase = phase;
  room.timer = newClock(10000, 1000, true);
  room.processed.saved = { fingerprint: "accepted", receipt: { revision: 7 } };
  run.progress.actions[room.state.heroes[0].playerId] = { kind: "loot" };
  const markers = structuredClone(run.progress.resolvedPhaseIds);
  const memory = memoryStorage();
  await memory.storage.save(room);
  const manager = createRoomManager(memory.storage, room.state.content, () => 900000);
  await manager.restore();
  const recovered = manager.rooms.get(room.state.code);
  expect(recovered?.state.phase).toEqual(phase);
  expect(recovered?.runs[run.crewId].progress.actions).toEqual(run.progress.actions);
  expect(recovered?.runs[run.crewId].progress.resolvedPhaseIds).toEqual(markers);
  expect(recovered?.timer.remainingMs).toBe(8000);
  expect(recovered?.runs[run.crewId].clock.elapsedMs).toBe(2000);
  expect(recovered?.processed).toEqual(room.processed);
  expect(recovered?.state.heroes).toEqual(room.state.heroes);
  expect(recovered?.state.history).toEqual(room.state.history);
});
