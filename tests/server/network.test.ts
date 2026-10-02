import { randomBytes } from "node:crypto";
import { afterEach, expect, it } from "vitest";
import type { ActionResult, Receipt } from "../../src/shared/protocol.js";
import { serverFixture } from "../fixtures/server.js";

const token = () => randomBytes(32).toString("hex");
const fixtures: Awaited<ReturnType<typeof serverFixture>>[] = [];
afterEach(async () => {
  for (const f of fixtures.splice(0)) await f.close();
});
async function setup() {
  const f = await serverFixture();
  fixtures.push(f);
  const secret = token(),
    created = await f.server.manager.create(secret);
  const host = await f.connect(),
    player = await f.connect();
  const ack = (send: (done: (r: ActionResult<Receipt>) => void) => void) =>
    new Promise<ActionResult<Receipt>>((resolve) => send(resolve));
  await ack((done) => host.emit("session:resume", { code: created.code, token: secret }, done));
  const playerSecret = token();
  const joined = await ack((done) =>
    player.emit(
      "session:join",
      { code: created.code, name: "Mira", bootstrapSecret: playerSecret },
      done,
    ),
  );
  if (!joined.ok || !joined.value.playerId) throw new Error("Join failed");
  const playerId = joined.value.playerId;
  const current = () => {
    const r = f.server.manager.rooms.get(created.code);
    if (!r) throw new Error("Missing room");
    return r;
  };
  const env = () => ({
    requestId: token(),
    matchId: current().state.id,
    phaseId: current().state.phaseId,
  });
  await ack((done) => player.emit("crew:create", { ...env(), name: "Seekers" }, done));
  return { ...f, created, host, player, playerId, playerSecret, current, env, ack };
}
it("host roster deletion is authorized, durable and returns crew members to selection", async () => {
  const f = await setup();
  const change = {
    ...f.env(),
    action: "delete-crew" as const,
    crewId: f.current().state.crews[0].id,
  };
  expect(await f.ack((done) => f.player.emit("host:roster", change, done))).toMatchObject({
    ok: false,
    code: "UNAUTHORIZED",
  });
  f.memory.setFail(true);
  expect(await f.ack((done) => f.host.emit("host:roster", change, done))).toMatchObject({
    ok: false,
    code: "SAVE_FAILED",
  });
  expect(f.current().state.crews).toHaveLength(1);
  expect(f.current().state.players[0].crewId).toBe(change.crewId);
  f.memory.setFail(false);
  const first = await f.ack((done) => f.host.emit("host:roster", change, done));
  expect(first.ok).toBe(true);
  expect(await f.ack((done) => f.host.emit("host:roster", change, done))).toEqual(first);
  expect(
    await f.ack((done) => f.host.emit("host:roster", { ...change, crewId: "different" }, done)),
  ).toMatchObject({ ok: false, code: "CONFLICT" });
  expect(f.current().state.crews).toHaveLength(0);
  expect(f.current().state.players[0].crewId).toBeNull();
  expect(f.memory.saved.get(f.created.code)?.state.players[0].crewId).toBeNull();
  expect(
    (await f.ack((done) => f.player.emit("crew:create", { ...f.env(), name: "Again" }, done))).ok,
  ).toBe(true);
  await f.ack((done) => f.host.emit("host:control", { ...f.env(), action: "start" }, done));
  expect(
    await f.ack((done) =>
      f.host.emit(
        "host:roster",
        { ...f.env(), action: "remove-player", playerId: f.playerId },
        done,
      ),
    ),
  ).toMatchObject({ ok: false, code: "CLOSED" });
});
it("removing a player revokes connected and offline sessions and cleans up empty crews", async () => {
  const f = await setup();
  const input = { ...f.env(), action: "remove-player" as const, playerId: f.playerId };
  const removed = new Promise<void>((resolve) => f.player.once("session:removed", resolve));
  expect((await f.ack((done) => f.host.emit("host:roster", input, done))).ok).toBe(true);
  expect((await f.ack((done) => f.host.emit("host:roster", input, done))).ok).toBe(true);
  await removed;
  expect(f.current().state.players).toHaveLength(0);
  expect(f.current().state.crews).toHaveLength(0);
  expect(
    await f.ack((done) => f.player.emit("crew:create", { ...f.env(), name: "Ghost" }, done)),
  ).toMatchObject({ ok: false, code: "UNAUTHORIZED" });
  const resumed = await f.connect();
  expect(
    await f.ack((done) =>
      resumed.emit("session:resume", { code: f.created.code, token: f.playerSecret }, done),
    ),
  ).toMatchObject({ ok: false, code: "UNAUTHORIZED" });
  expect(
    Object.values(f.memory.saved.get(f.created.code)?.sessions ?? {}).some(
      (s) => s.playerId === f.playerId,
    ),
  ).toBe(false);
});
it("joining and requests survive lost responses; reused IDs cannot change content", async () => {
  const f = await setup();
  const repeatedJoin = await f.ack((done) =>
    f.player.emit(
      "session:join",
      { code: f.created.code, name: "Mira", bootstrapSecret: f.playerSecret },
      done,
    ),
  );
  expect(repeatedJoin.ok).toBe(true);
  expect(f.current().state.players).toHaveLength(1);
  const input = { ...f.env(), classId: "physician" as const };
  const first = await f.ack((done) => f.player.emit("hero:class", input, done));
  expect(await f.ack((done) => f.player.emit("hero:class", input, done))).toEqual(first);
  const conflict = await f.ack((done) =>
    f.player.emit("hero:class", { ...input, classId: "knight" }, done),
  );
  expect(conflict).toMatchObject({ ok: false, code: "CONFLICT" });
  expect(f.current().state.players[0].classId).toBe("physician");
});
it("rejects stale, unauthorized, invalid targets and actions beyond deadlines", async () => {
  const f = await setup();
  expect(
    await f.ack((done) => f.player.emit("host:control", { ...f.env(), action: "start" }, done)),
  ).toMatchObject({ ok: false, code: "UNAUTHORIZED" });
  const old = f.env();
  await f.ack((done) => f.host.emit("host:control", { ...f.env(), action: "start" }, done));
  expect(
    await f.ack((done) => f.player.emit("route:vote", { ...old, roomId: "d1-0" }, done)),
  ).toMatchObject({ ok: false, code: "STALE" });
  await f.advance(f.current().deadline ?? 0);
  await f.advance(f.current().deadline ?? 0);
  expect(
    await f.ack((done) =>
      f.player.emit(
        "hero:action",
        { ...f.env(), action: { kind: "mend", targetHeroId: "someone-else" } },
        done,
      ),
    ),
  ).toMatchObject({ ok: false, code: "INVALID" });
  const accepted = { ...f.env(), action: { kind: "attack" as const, part: "body" as const } };
  expect((await f.ack((done) => f.player.emit("hero:action", accepted, done))).ok).toBe(true);
  await f.advance(f.current().deadline ?? 0);
  expect(await f.ack((done) => f.player.emit("hero:action", accepted, done))).toMatchObject({
    ok: true,
  });
  expect(
    await f.ack((done) => f.player.emit("hero:action", { ...accepted, requestId: token() }, done)),
  ).toMatchObject({ ok: false, code: "STALE" });
});
it("latest tab controls an identity; reconnect restores its submitted action", async () => {
  const f = await setup();
  const newer = await f.connect();
  await f.ack((done) =>
    newer.emit("session:resume", { code: f.created.code, token: f.playerSecret }, done),
  );
  expect(
    await f.ack((done) => f.player.emit("hero:class", { ...f.env(), classId: "occultist" }, done)),
  ).toMatchObject({ ok: false, code: "READ_ONLY" });
  expect(
    (await f.ack((done) => newer.emit("hero:class", { ...f.env(), classId: "occultist" }, done)))
      .ok,
  ).toBe(true);
  f.player.disconnect();
  newer.disconnect();
  const resumed = await f.connect();
  await f.ack((done) =>
    resumed.emit("session:resume", { code: f.created.code, token: f.playerSecret }, done),
  );
  const synced = await new Promise((done) => resumed.emit("session:sync", { pending: [] }, done));
  expect(synced).toMatchObject({
    ok: true,
    value: { view: { self: { id: f.playerId, classId: "occultist" } } },
  });
});
it("save failures roll back commands and pause only that room", async () => {
  const f = await setup();
  await f.ack((done) => f.host.emit("host:control", { ...f.env(), action: "start" }, done));
  f.memory.setFail(true);
  expect(
    await f.ack((done) => f.player.emit("route:vote", { ...f.env(), roomId: "d1-0" }, done)),
  ).toMatchObject({ ok: false, code: "SAVE_FAILED" });
  expect(f.current().state.status).toBe("paused");
  expect(f.current().state.routeVotes).toEqual({});
  expect(f.current().storageError).toContain("disk space");
  f.memory.setFail(false);
  expect(
    (await f.ack((done) => f.host.emit("host:control", { ...f.env(), action: "resume" }, done))).ok,
  ).toBe(true);
});
it("host disconnect does not interrupt automatic phases; normal rooms forbid debug controls", async () => {
  const f = await setup();
  expect(
    await f.ack((done) => f.host.emit("host:control", { ...f.env(), action: "advance" }, done)),
  ).toMatchObject({ ok: false, code: "UNAUTHORIZED" });
  await f.ack((done) => f.host.emit("host:control", { ...f.env(), action: "start" }, done));
  f.host.disconnect();
  await f.advance(f.current().deadline ?? 0);
  expect(f.current().state.phase.kind).toBe("arrival");
});
