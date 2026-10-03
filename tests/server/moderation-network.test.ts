import { randomBytes } from "node:crypto";
import { afterEach, expect, it } from "vitest";
import { createTestRoom } from "../../src/server/test-mode/create-test-room.js";
import type { Ack, Envelope } from "../../src/shared/protocol.js";
import { serverFixture } from "../fixtures/server.js";

const secret = () => randomBytes(32).toString("hex");
const fixtures: Awaited<ReturnType<typeof serverFixture>>[] = [];
afterEach(async () => {
  for (const f of fixtures.splice(0)) await f.close();
});
const ack = (send: (done: Ack) => void) =>
  new Promise<Parameters<Ack>[0]>((resolve) => send(resolve));
async function setup() {
  const f = await serverFixture();
  fixtures.push(f);
  const input = {
    hostSecret: secret(),
    scenario: "fresh" as const,
    players: Array.from({ length: 10 }, (_, i) => ({
      clientId: String(i),
      bootstrapSecret: secret(),
    })),
  };
  const data = await createTestRoom(f.server.manager, input);
  const current = () => {
    const room = f.server.manager.rooms.get(data.code);
    if (!room) throw new Error("No room");
    return room;
  };
  const env = (): Envelope => ({
    requestId: secret(),
    matchId: current().state.id,
    phaseId: current().state.phaseId,
  });
  const host = await f.connect();
  await ack((done) =>
    host.emit("session:resume", { code: data.code, token: input.hostSecret }, done),
  );
  return { ...f, input, data, current, env, host };
}
it("host lost acknowledgments reuse durable interventions; unauthorized and changed IDs fail", async () => {
  const f = await setup();
  const player = await f.connect();
  await ack((done) =>
    player.emit(
      "session:resume",
      { code: f.data.code, token: f.input.players[0].bootstrapSecret },
      done,
    ),
  );
  const input = { ...f.env(), command: { kind: "pvp-policy" as const, enabled: false } };
  expect(await ack((done) => player.emit("host:control", input, done))).toMatchObject({
    ok: false,
    code: "UNAUTHORIZED",
  });
  const result = await ack((done) => f.host.emit("host:control", input, done));
  expect(await ack((done) => f.host.emit("host:control", input, done))).toEqual(result);
  expect(
    await ack((done) =>
      f.host.emit(
        "host:control",
        { ...input, command: { kind: "pvp-policy", enabled: true } },
        done,
      ),
    ),
  ).toMatchObject({ ok: false, code: "CONFLICT" });
  expect(
    f
      .current()
      .state.history.filter(
        (e) => e.kind === "host-intervention" && e.commandId === input.requestId,
      ),
  ).toHaveLength(1);
});
it("read-only viewers do not keep an identity present after its controlling tab disconnects", async () => {
  const f = await setup();
  const owner = await f.connect(),
    viewer = await f.connect();
  const input = { code: f.data.code, token: f.input.players[0].bootstrapSecret };
  await ack((done) => owner.emit("session:resume", input, done));
  await ack((done) => viewer.emit("session:resume", input, done));
  owner.disconnect();
  await new Promise((done) => setTimeout(done, 30));
  await f.server.manager.drain();
  expect(f.current().state.players[0].connected).toBe(false);
  await ack((done) => viewer.emit("session:resume", { ...input, takeover: true }, done));
  expect(f.current().state.players[0].connected).toBe(true);
});
it("player code redemption over real sockets revokes the old device and survives a lost ACK", async () => {
  const f = await setup();
  const old = await f.connect(),
    replacement = await f.connect();
  await ack((done) =>
    old.emit(
      "session:resume",
      { code: f.data.code, token: f.input.players[0].bootstrapSecret },
      done,
    ),
  );
  const code = "ABCDEFGHIJKL";
  await ack((done) =>
    f.host.emit(
      "host:recovery-issue",
      { ...f.env(), playerId: f.data.players[0].playerId, recoveryCode: code },
      done,
    ),
  );
  expect(JSON.stringify(f.current())).not.toContain(code);
  const input = { code: f.data.code, recoveryCode: code, bootstrapSecret: secret() };
  const result = await ack((done) => replacement.emit("session:recover", input, done));
  expect(result.ok).toBe(true);
  expect(await ack((done) => replacement.emit("session:recover", input, done))).toMatchObject({
    ok: true,
    value: { playerId: f.data.players[0].playerId },
  });
  expect(
    await ack((done) => old.emit("crew:create", { ...f.env(), name: "Hacked" }, done)),
  ).toMatchObject({ ok: false, code: "UNAUTHORIZED" });
});
it("successful request receipts bypass the exhausted gameplay limit", async () => {
  const f = await setup();
  let first: ReturnType<typeof f.env> | null = null;
  for (let i = 0; i < 20; i++) {
    const env = f.env();
    if (i === 0) first = env;
    expect(
      (
        await ack((done) =>
          f.host.emit(
            "host:control",
            { ...env, command: { kind: "pvp-policy", enabled: false } },
            done,
          ),
        )
      ).ok,
    ).toBe(true);
  }
  expect(
    await ack((done) =>
      f.host.emit(
        "host:control",
        { ...f.env(), command: { kind: "pvp-policy", enabled: false } },
        done,
      ),
    ),
  ).toMatchObject({ ok: false, code: "RATE_LIMITED" });
  if (!first) throw new Error("No receipt");
  const env = first;
  expect(
    (
      await ack((done) =>
        f.host.emit(
          "host:control",
          { ...env, command: { kind: "pvp-policy", enabled: false } },
          done,
        ),
      )
    ).ok,
  ).toBe(true);
});
it("one-click creation works through a tunnel and preserves idempotency without granting recovery", async () => {
  const f = await setup();
  const bootstrapSecret = secret();
  const create = () =>
    fetch(`${f.url}/api/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://class.trycloudflare.com",
        "CF-Connecting-IP": "203.0.113.1",
      },
      body: JSON.stringify({ bootstrapSecret }),
    });
  const response = await create();
  expect(response.status).toBe(201);
  const created = await response.json();
  expect(created.hostToken).toBe(bootstrapSecret);
  expect(await (await create()).json()).toEqual(created);
  const host = await f.connect();
  expect(
    (
      await ack((done) =>
        host.emit("session:resume", { code: created.code, token: bootstrapSecret }, done),
      )
    ).ok,
  ).toBe(true);
  const denied = await fetch(`${f.url}/api/host/recover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: created.code,
      installationKey: secret(),
      bootstrapSecret: secret(),
    }),
  });
  expect(denied.status).toBe(403);
});
it("room creation remains bounded and successful retries bypass the creation limit", async () => {
  const f = await setup();
  const first = secret();
  const create = (bootstrapSecret: string) =>
    fetch(`${f.url}/api/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bootstrapSecret }),
    });
  expect((await create(first)).status).toBe(201);
  for (let i = 0; i < 4; i++) expect((await create(secret())).status).toBe(201);
  expect((await create(secret())).status).toBe(429);
  expect((await create(first)).status).toBe(201);
});
