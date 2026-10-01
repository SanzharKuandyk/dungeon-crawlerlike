import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createClientSession } from "../../src/client/session.js";
import { projectRoom } from "../../src/game/projections.js";
import { fixture } from "../fixtures/match.js";

const transport = vi.hoisted(() => {
  const listeners = new Map<string, unknown>(),
    sent: { event: string; payload: unknown; ack: unknown }[] = [];
  const socket = {
    connected: false,
    sendBuffer: [] as unknown[],
    on: (event: string, callback: unknown) => {
      listeners.set(event, callback);
    },
    emit: (event: string, payload: unknown, ack: unknown) => {
      sent.push({ event, payload, ack });
    },
    connect: () => {
      socket.connected = true;
      const callback = listeners.get("connect");
      if (typeof callback === "function") callback();
    },
    disconnect: () => {
      socket.connected = false;
      const callback = listeners.get("disconnect");
      if (typeof callback === "function") callback();
    },
  };
  return { socket, listeners, sent };
});
vi.mock("socket.io-client", () => ({ io: () => transport.socket }));
vi.mock("../../src/client/notify.js", () => ({ notifyError: vi.fn() }));
const options = {
  deadline: null,
  remaining: null,
  phaseStartedAt: 0,
  phaseDuration: 30000,
  serverNow: 0,
  speed: "normal" as const,
  storageError: null,
  testMode: false,
  readOnly: false,
};
function respond(event: string, result: unknown) {
  const sent = transport.sent.filter((s) => s.event === event).at(-1);
  if (!sent || typeof sent.ack !== "function") throw new Error("Missing callback");
  sent.ack(result);
}
function snapshot(view: unknown) {
  const listener = transport.listeners.get("room:snapshot");
  if (typeof listener === "function") listener(view);
}
beforeEach(() => {
  vi.useFakeTimers();
  transport.listeners.clear();
  transport.sent.length = 0;
  transport.socket.connected = false;
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  vi.stubGlobal("document", {
    visibilityState: "visible",
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("enables controls only after authentication and fresh sync; rejects older snapshots", () => {
  const statuses: string[] = [],
    views: number[] = [];
  const session = createClientSession({
    code: "ABC123",
    role: "player",
    onStatus: (s) => statuses.push(s),
    onView: (v) => views.push(v.revision),
  });
  const view = projectRoom(fixture(1), "p0-0", false, options);
  snapshot(view);
  expect(session.ready).toBe(false);
  respond("session:resume", { ok: true, value: { revision: 0 } });
  expect(session.ready).toBe(false);
  respond("session:sync", { ok: true, value: { view, receipts: {} } });
  expect(session.ready).toBe(true);
  snapshot({ ...view, revision: 2 });
  snapshot({ ...view, revision: 1 });
  expect(views.at(-1)).toBe(2);
  expect(statuses.at(-1)).toBe("ready");
  session.dispose();
});
it("retries the same ID, never sends offline, and cancels old-phase retries", async () => {
  const session = createClientSession({
    code: "ABC123",
    role: "player",
    onStatus: () => {},
    onView: () => {},
  });
  const view = projectRoom(fixture(1), "p0-0", false, options);
  respond("session:resume", { ok: true, value: { revision: 0 } });
  respond("session:sync", { ok: true, value: { view, receipts: {} } });
  const sent: string[] = [];
  const pending = session.command((env) => {
    sent.push(env.requestId);
  });
  vi.advanceTimersByTime(4000);
  expect(sent).toHaveLength(2);
  expect(sent[0]).toBe(sent[1]);
  transport.socket.disconnect();
  vi.advanceTimersByTime(4000);
  expect(sent).toHaveLength(2);
  transport.socket.connect();
  respond("session:resume", { ok: true, value: { revision: 1 } });
  respond("session:sync", {
    ok: true,
    value: { view: { ...view, phaseId: 1, revision: 1 }, receipts: {} },
  });
  expect(await pending).toBe(false);
  vi.advanceTimersByTime(10000);
  expect(sent).toHaveLength(2);
  session.dispose();
});
it("recovers a lost acknowledgment from durable sync receipts", async () => {
  const session = createClientSession({
    code: "ABC123",
    role: "player",
    onStatus: () => {},
    onView: () => {},
  });
  const view = projectRoom(fixture(1), "p0-0", false, options);
  respond("session:resume", { ok: true, value: { revision: 0 } });
  respond("session:sync", { ok: true, value: { view, receipts: {} } });
  let requestId = "";
  const pending = session.command((env) => {
    requestId = env.requestId;
  });
  transport.socket.disconnect();
  transport.socket.connect();
  respond("session:resume", { ok: true, value: { revision: 1 } });
  respond("session:sync", {
    ok: true,
    value: { view: { ...view, revision: 1 }, receipts: { [requestId]: { revision: 1 } } },
  });
  expect(await pending).toBe(true);
  expect(localStorage.getItem("siege-pending:ABC123:player")).toBe("[]");
  session.dispose();
});
it("expired acknowledgments remain available for recovery after refresh", async () => {
  const session = createClientSession({
    code: "ABC123",
    role: "player",
    onStatus: () => {},
    onView: () => {},
  });
  const view = projectRoom(fixture(1), "p0-0", false, options);
  respond("session:resume", { ok: true, value: { revision: 0 } });
  respond("session:sync", { ok: true, value: { view, receipts: {} } });
  let requestId = "";
  const pending = session.command((env) => {
    requestId = env.requestId;
  });
  vi.advanceTimersByTime(12000);
  expect(await pending).toBe(false);
  expect(localStorage.getItem("siege-pending:ABC123:player")).toContain(requestId);
  session.dispose();
});
it("disposed room callbacks cannot alter the new screen", () => {
  const views: number[] = [];
  const session = createClientSession({
    code: "ABC123",
    role: "player",
    onStatus: () => {},
    onView: (v) => views.push(v.revision),
  });
  const view = projectRoom(fixture(1), "p0-0", false, options);
  session.dispose();
  snapshot(view);
  respond("session:resume", { ok: true, value: { revision: 0 } });
  expect(views).toEqual([]);
});

it("a delayed join acknowledgment cannot authenticate a disposed room", async () => {
  const statuses: string[] = [];
  const session = createClientSession({
    code: "ABC123",
    role: "player",
    onStatus: (s) => statuses.push(s),
    onView: () => {},
  });
  const joining = session.join("Mira", "bootstrap-secret");
  session.dispose();
  const before = [...statuses];
  respond("session:join", { ok: true, value: { revision: 1 } });
  expect(await joining).toBe(false);
  expect(statuses).toEqual(before);
  expect(session.ready).toBe(false);
});
