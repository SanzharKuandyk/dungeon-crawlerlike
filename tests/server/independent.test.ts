import { randomBytes } from "node:crypto";
import { afterEach, expect, it } from "vitest";
import { loadContent } from "../../src/server/content.js";
import { progressExpedition } from "../../src/server/expedition-scheduler.js";
import { createRoomManager } from "../../src/server/room-manager.js";
import type { Ack, Envelope } from "../../src/shared/protocol.js";
import type { RoomView } from "../../src/shared/view-types.js";
import { serverFixture } from "../fixtures/server.js";

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("Missing fixture value");
  return value;
}

const fixtures: Awaited<ReturnType<typeof serverFixture>>[] = [];
const secret = () => randomBytes(32).toString("hex");
const ack = (send: (done: Ack) => void) =>
  new Promise<Parameters<Ack>[0]>((resolve) => send(resolve));
afterEach(async () => {
  for (const fixture of fixtures.splice(0)) await fixture.close();
});

async function setup() {
  const f = await serverFixture();
  fixtures.push(f);
  const hostSecret = secret();
  const created = await f.server.manager.create(hostSecret);
  const host = await f.connect();
  await ack((done) => host.emit("session:resume", { code: created.code, token: hostSecret }, done));
  const current = () => required(f.server.manager.rooms.get(created.code));
  const env = (phaseId = current().state.phaseId): Envelope => ({
    requestId: secret(),
    matchId: current().state.id,
    phaseId,
  });
  const players = [];
  for (let i = 0; i < 2; i++) {
    const socket = await f.connect();
    const token = secret();
    const joined = await ack((done) =>
      socket.emit(
        "session:join",
        { code: created.code, name: `Player ${i}`, bootstrapSecret: token },
        done,
      ),
    );
    if (!joined.ok) throw new Error(joined.message);
    await ack((done) => socket.emit("crew:create", { ...env(), name: `Crew ${i}` }, done));
    players.push({ socket, token, playerId: required(joined.value.playerId) });
  }
  const sync = (socket: typeof host) =>
    new Promise<RoomView>((resolve, reject) =>
      socket.emit("session:sync", { pending: [] }, (result) =>
        result.ok ? resolve(result.value.view) : reject(new Error(result.message)),
      ),
    );
  await ack((done) =>
    host.emit("host:control", { ...env(), command: { kind: "learning", enabled: false } }, done),
  );
  await ack((done) => host.emit("host:control", { ...env(), command: { kind: "start" } }, done));
  return { ...f, current, env, host, hostSecret, created, players, sync };
}

it("a crew resolves immediately without advancing another crew; retries do not resolve twice", async () => {
  const f = await setup();
  const player = f.players[0].socket;
  const view = await f.sync(player);
  if (view.role !== "player") throw new Error("Wrong projection");
  const input = { ...f.env(view.phaseId), roomId: view.reachableNodeIds[0] };
  const result = await ack((done) => player.emit("route:vote", input, done));
  expect(result.ok).toBe(true);
  expect((await f.sync(player)).phase.kind).toBe("arrival");
  expect((await f.sync(f.players[1].socket)).phase.kind).toBe("route");
  const history = f.current().state.history.length;
  expect(await ack((done) => player.emit("route:vote", input, done))).toEqual(result);
  expect(f.current().state.history).toHaveLength(history);
  const run = Object.values(f.current().runs)[0];
  await f.advance(required(run.clock.deadline));
  const combat = await f.sync(player);
  expect(combat.phase.kind).toBe("combat");
  expect(
    await ack((done) =>
      player.emit(
        "hero:action",
        { ...f.env(combat.phaseId), action: { kind: "attack", part: "body" } },
        done,
      ),
    ),
  ).toMatchObject({ ok: true });
  expect((await f.sync(player)).phase.kind).toBe("combat-reveal");
  expect((await f.sync(f.players[1].socket)).phase.kind).toBe("route");
});

it("ending revokes tokens and the creation intent cannot resurrect a room", async () => {
  const f = await setup();
  expect(
    await ack((done) =>
      f.host.emit("host:control", { ...f.env(), command: { kind: "end" } }, done),
    ),
  ).toMatchObject({ ok: true });
  expect(f.current().lifecycle.kind).toBe("closed");
  expect(f.current().sessions).toEqual({});
  await expect(f.server.manager.create(f.hostSecret)).rejects.toMatchObject({
    code: "ROOM_CLOSED",
  });
  const tab = await f.connect();
  expect(
    await ack((done) =>
      tab.emit("session:resume", { code: f.created.code, token: f.hostSecret }, done),
    ),
  ).toMatchObject({ ok: true });
});

it("new tabs remain read-only until explicit takeover; host expiry pauses the session", async () => {
  const f = await setup();
  const tab = await f.connect();
  const input = { code: f.created.code, token: f.hostSecret };
  await ack((done) => tab.emit("session:resume", input, done));
  expect(await f.sync(tab)).toMatchObject({ readOnly: true });
  await ack((done) => tab.emit("session:resume", { ...input, takeover: true }, done));
  expect(await f.sync(f.host)).toMatchObject({ readOnly: true });
  tab.disconnect();
  await new Promise((done) => setTimeout(done, 30));
  await f.server.manager.drain();
  const life = f.current().lifecycle;
  if (life.kind !== "live" || life.hostDisconnectedAt === null)
    throw new Error("Missing disconnect time");
  await f.advance(life.hostDisconnectedAt + 90000);
  expect(f.current().state.status).toBe("paused");
  expect(f.current().pauseReasons).toContain("host-offline");
});

it("server restart preserves live authority paused", async () => {
  const f = await setup();
  const manager = createRoomManager(f.memory.storage, await loadContent());
  await manager.restore();
  expect(manager.rooms.get(f.created.code)?.lifecycle).toMatchObject({
    kind: "live",
  });
  expect(manager.rooms.get(f.created.code)?.pauseReasons).toContain("server-restart");
  expect(manager.rooms.get(f.created.code)?.sessions).toEqual(f.current().sessions);
});

it("shared questions freeze decisions at a safe boundary and resume the same choices", async () => {
  const f = await setup();
  await f.server.manager.transaction(f.created.code, (room) => {
    room.state.learningEnabled = true;
    room.discovery = { cause: "The seal breaks.", depth: 1 };
    progressExpedition(room, Date.now());
  });
  const phases = Object.values(f.current().runs).map((run) => run.progress.phaseId);
  expect(f.current().state.phase.kind).toBe("question-intro");
  await f.advance(required(f.current().deadline));
  const question = required(
    f
      .current()
      .state.content.questions.find((entry) => entry.id === f.current().state.quizQuestionId),
  );
  const first = await f.sync(f.players[0].socket);
  expect(first.correctChoice).toBeNull();
  expect(
    await ack((done) =>
      f.players[0].socket.emit(
        "learning:answer",
        { ...f.env(), questionId: question.id, choice: question.correctIndex },
        done,
      ),
    ),
  ).toMatchObject({ ok: true });
  expect((await f.sync(f.players[1].socket)).correctChoice).toBeNull();
  await f.advance(required(f.current().deadline));
  expect((await f.sync(f.players[0].socket)).correctChoice).toBe(question.correctIndex);
  expect(f.current().state.quizResults.map((result) => result.tier)).toEqual(["perfect", "none"]);
  await f.advance(required(f.current().deadline));
  expect(
    await ack((done) =>
      f.players[1].socket.emit("equipment:choose", { ...f.env(), item: "ward" }, done),
    ),
  ).toMatchObject({ ok: false });
  await ack((done) =>
    f.players[0].socket.emit("equipment:choose", { ...f.env(), item: "salve" }, done),
  );
  expect(f.current().state.heroes[0].equipment).toEqual({ kind: "salve", charges: 1 });
  await f.advance(required(f.current().deadline));
  expect(f.current().state.quizQuestionId).toBeNull();
  expect(Object.values(f.current().runs).map((run) => run.progress.phaseId)).toEqual(phases);
});

it("all-offline crews suspend and resume their own decision", async () => {
  const f = await setup();
  const view = await f.sync(f.players[0].socket);
  const crewId = required(
    f.current().state.players.find((player) => player.id === f.players[0].playerId)?.crewId,
  );
  f.players[0].socket.disconnect();
  await new Promise((done) => setTimeout(done, 30));
  await f.server.manager.drain();
  expect(f.current().runs[crewId].suspended).toBe(true);
  expect(f.current().runs[crewId].clock.deadline).toBeNull();
  const replacement = await f.connect();
  await ack((done) =>
    replacement.emit("session:resume", { code: f.created.code, token: f.players[0].token }, done),
  );
  expect((await f.sync(replacement)).phaseId).toBe(view.phaseId);
  expect(f.current().runs[crewId].suspended).toBe(false);
});

it("a failed save pauses crew clocks without accepting or resolving the submitted decision", async () => {
  const f = await setup();
  const player = f.players[0].socket;
  const view = await f.sync(player);
  if (view.role !== "player") throw new Error("Wrong view");
  const input = { ...f.env(view.phaseId), roomId: view.reachableNodeIds[0] };
  const oldEvents = f.current().state.history.length;
  f.memory.setFail(true);
  expect(await ack((done) => player.emit("route:vote", input, done))).toMatchObject({
    ok: false,
    code: "SAVE_FAILED",
  });
  expect(f.current().state.status).toBe("paused");
  expect(Object.values(f.current().runs).every((run) => run.clock.deadline === null)).toBe(true);
  expect(f.current().state.history).toHaveLength(oldEvents);
  f.memory.setFail(false);
  await ack((done) =>
    f.host.emit("host:control", { ...f.env(), command: { kind: "resume" } }, done),
  );
  expect(await ack((done) => player.emit("route:vote", input, done))).toMatchObject({ ok: true });
  expect((await f.sync(player)).phase.kind).toBe("arrival");
});
