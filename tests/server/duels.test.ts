import { randomBytes } from "node:crypto";
import { afterEach, expect, it } from "vitest";
import { assertInvariants } from "../../src/game/invariants.js";
import { freezeCrewClocks, resumeCrewClocks } from "../../src/server/crew-clock.js";
import { challenge, queueArena, submitDuel, voteDuel } from "../../src/server/duel-commands.js";
import { cancelDuel, duelsDue, progressDuels } from "../../src/server/duel-coordinator.js";
import { beginQuestion } from "../../src/server/shared-event-coordinator.js";
import { createTestRoom } from "../../src/server/test-mode/create-test-room.js";
import type { Ack, Envelope } from "../../src/shared/protocol.js";
import { serverFixture } from "../fixtures/server.js";

const fixtures: Awaited<ReturnType<typeof serverFixture>>[] = [];
const secret = () => randomBytes(32).toString("hex");
afterEach(async () => {
  for (const fixture of fixtures.splice(0)) await fixture.close();
});
async function setup() {
  const f = await serverFixture();
  fixtures.push(f);
  const input = {
    hostSecret: secret(),
    scenario: "duel" as const,
    players: Array.from({ length: 10 }, (_, index) => ({
      clientId: String(index),
      bootstrapSecret: secret(),
    })),
  };
  const result = await createTestRoom(f.server.manager, input);
  const room = f.server.manager.rooms.get(result.code);
  if (!room) throw new Error("Missing room");
  return { ...f, input, result, room, duel: room.duels[0] };
}
it("three nonlethal exchanges award gold and restore both dungeon continuations once", async () => {
  const { room, duel } = await setup();
  const saved = structuredClone(duel.saved);
  const total =
    room.state.crews.reduce((sum, crew) => sum + crew.economy.gold, 0) +
    Object.values(duel.stakes).reduce((sum, n) => sum + n, 0);
  const unrelated = structuredClone(room.runs[room.state.crews[2].id]);
  for (let turn = 0; turn < 3; turn++) {
    const heroes = room.state.heroes.filter((hero) => duel.crewIds.includes(hero.crewId));
    for (const hero of heroes) {
      const target = heroes.find((other) => other.crewId !== hero.crewId);
      if (!target) throw new Error("Missing rival");
      submitDuel(room, hero.playerId, duel.id, { kind: "strike", targetHeroId: target.id }, 1);
    }
    progressDuels(room, 2, true);
    expect(duel.phase).toBe("reveal");
    expect(room.state.heroes.every((hero) => hero.hp > 0)).toBe(true);
    progressDuels(room, 3, true);
  }
  expect(duel.status).toBe("finished");
  for (const id of duel.crewIds)
    expect(room.runs[id].progress.phase).toEqual(saved[id].progress.phase);
  expect(room.runs[room.state.crews[2].id]).toEqual(unrelated);
  expect(room.state.crews.reduce((sum, crew) => sum + crew.economy.gold, 0)).toBe(
    total + (duel.winner ? 18 : 12),
  );
  const state = structuredClone(room.state);
  progressDuels(room, 100, true);
  expect(room.state).toEqual(state);
  assertInvariants(room.state);
});
it("challenges require consent, allow refusal, expire and cannot repeat a pair", async () => {
  const { room, duel } = await setup();
  for (const id of duel.crewIds) {
    room.runs[id].progress = duel.saved[id].progress;
    const crew = room.state.crews.find((crew) => crew.id === id);
    if (crew) crew.location = duel.saved[id].location;
  }
  room.duels = [];
  const [a, b] = room.state.crews;
  challenge(room, a.playerIds[0], b.id, 1000);
  const offer = room.duels[0];
  voteDuel(room, b.playerIds[0], offer.id, true, 1001);
  progressDuels(room, 1002);
  expect(offer.status).toBe("offered");
  voteDuel(room, b.playerIds[1], offer.id, false, 1003);
  expect(offer.status).toBe("declined");
  expect(() => challenge(room, a.playerIds[0], b.id, 1004)).not.toThrow();
  room.duels = [];
  challenge(room, a.playerIds[0], b.id, 1005);
  progressDuels(room, 31005);
  expect(room.duels[0].status).toBe("declined");
});
it("questions wait until active duels return to a safe boundary", async () => {
  const { room } = await setup();
  room.discovery = { cause: "A seal opens", depth: 1 };
  beginQuestion(room, 1000);
  expect(room.state.trial?.phase.kind).toBe("intro");
});
it("real duel commands validate ownership, deduplicate receipts and hide rival choices", async () => {
  const f = await setup();
  const socket = await f.connect();
  const ack = (send: (done: Ack) => void) =>
    new Promise<Parameters<Ack>[0]>((resolve) => send(resolve));
  await ack((done) =>
    socket.emit(
      "session:resume",
      { code: f.result.code, token: f.input.players[0].bootstrapSecret },
      done,
    ),
  );
  const current = () => f.server.manager.rooms.get(f.result.code) ?? f.room;
  const hero = f.room.state.heroes[0];
  const env: Envelope = {
    requestId: secret(),
    matchId: f.room.state.id,
    phaseId: f.room.runs[hero.crewId].progress.phaseId,
  };
  const input = { ...env, duelId: f.duel.id, action: { kind: "guard" as const } };
  expect(await ack((done) => socket.emit("pvp:action", input, done))).toMatchObject({ ok: true });
  const revision = current().state.revision;
  expect(await ack((done) => socket.emit("pvp:action", input, done))).toMatchObject({ ok: true });
  expect(current().state.revision).toBe(revision);
  expect(
    await ack((done) =>
      socket.emit(
        "pvp:action",
        { ...input, action: { kind: "strike", targetHeroId: hero.id } },
        done,
      ),
    ),
  ).toMatchObject({ ok: false, code: "CONFLICT" });
  expect(
    await ack((done) =>
      socket.emit(
        "pvp:action",
        { ...input, requestId: secret(), action: { kind: "strike", targetHeroId: hero.id } },
        done,
      ),
    ),
  ).toMatchObject({ ok: false, code: "INVALID" });
  const rival = await f.connect();
  await ack((done) =>
    rival.emit(
      "session:resume",
      { code: f.result.code, token: f.input.players[1].bootstrapSecret },
      done,
    ),
  );
  await new Promise<void>((resolve) =>
    rival.emit("session:sync", { pending: [] }, (result) => {
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.view.duels[0].ownAction).toBeNull();
      resolve();
    }),
  );
});

it("pausing preserves a challenge deadline and dead characters cannot initiate one", async () => {
  const { room, duel } = await setup();
  duel.status = "offered";
  duel.expiresAt = 31000;
  freezeCrewClocks(room, 11000);
  resumeCrewClocks(room, 100000);
  expect(duel.expiresAt).toBe(120000);
  const hero = room.state.heroes[0];
  hero.status = "dead";
  hero.hp = 0;
  expect(() => challenge(room, hero.playerId, room.state.crews[1].id, 100001)).toThrow("living");
});

it("a crew cannot farm wagers using invulnerable one-health fighters", async () => {
  const { room, duel } = await setup();
  for (const id of duel.crewIds) room.runs[id].progress = duel.saved[id].progress;
  room.duels = [];
  room.state.heroes[0].hp = 1;
  expect(() => challenge(room, room.state.heroes[0].playerId, room.state.crews[1].id, 100)).toThrow(
    "half health",
  );
});

it("arena waiting offers a consensual NPC after twenty seconds and settles once", async () => {
  const { room, duel: original } = await setup();
  cancelDuel(room, original, 100);
  room.duels = [];
  const crew = room.state.crews[0];
  queueArena(room, crew.playerIds[0], 1000);
  const duel = room.duels[0];
  expect(duel.npc).toBeDefined();
  progressDuels(room, 20999);
  expect(duel.status).toBe("offered");
  progressDuels(room, 21000);
  expect(duel.status).toBe("champion-offer");
  voteDuel(room, crew.playerIds[0], duel.id, true, 21001);
  expect(duelsDue(room, 21001)).toBe(true);
  progressDuels(room, 21001);
  expect(duel.status).toBe("active");
  for (let i = 0; i < 3; i++) {
    submitDuel(
      room,
      crew.playerIds[0],
      duel.id,
      { kind: "strike", targetHeroId: "champion" },
      21002 + i * 2,
    );
    progressDuels(room, 21002 + i * 2, true);
    progressDuels(room, 21003 + i * 2, true);
  }
  expect(duel.status).toBe("finished");
  const state = structuredClone(room.state);
  progressDuels(room, 99999, true);
  expect(room.state).toEqual(state);
  expect(room.state.heroes.every((h) => h.hp >= 1)).toBe(true);
});
