import { randomBytes, randomUUID } from "node:crypto";
import { createMatch } from "../game/create-match.js";
import { assertInvariants } from "../game/invariants.js";
import { projectRoom, type ViewOptions } from "../game/projections.js";
import type { DungeonContent } from "../shared/content-types.js";
import type { ActionResult, Envelope, Receipt } from "../shared/protocol.js";
import { cloneRoom } from "./clone-room.js";
import { reject } from "./errors.js";
import { advancePhase } from "./room-clock.js";
import type { Binding, StoredRoom } from "./room-types.js";
import { createSession, hashToken, newToken } from "./sessions.js";
import type { Storage } from "./storage.js";
export function emptyRoom(state: StoredRoom["state"], testMode = false): StoredRoom {
  return {
    schemaVersion: 4,
    state,
    sessions: {},
    deadline: null,
    remaining: null,
    phaseStartedAt: 0,
    phaseDuration: 0,
    speed: "normal",
    storageError: null,
    testMode,
    processed: {},
  };
}
export function createRoomManager(
  storage: Storage,
  content: DungeonContent,
  clock: () => number = Date.now,
) {
  const rooms = new Map<string, StoredRoom>();
  const publicViews = new WeakMap<
    StoredRoom["state"],
    { revision: number; view: import("../shared/view-types.js").PublicRoomView }
  >();
  const queues = new Map<string, Promise<unknown>>();
  let publish: (code: string, immediate: boolean) => void = () => {};
  let creating: Promise<unknown> = Promise.resolve();
  async function transaction<T>(
    code: string,
    edit: (room: StoredRoom) => T | Promise<T>,
    reuse?: (room: StoredRoom) => T | undefined,
  ) {
    const previous = queues.get(code) ?? Promise.resolve();
    const task = previous
      .catch(() => {})
      .then(async () => {
        const old = rooms.get(code);
        if (!old) reject("NOT_FOUND", "Room not found. Check the code.");
        const reused = reuse?.(old);
        if (reused !== undefined) return reused;
        const draft = cloneRoom(old);
        const result = await edit(draft);
        assertInvariants(draft.state);
        draft.state.revision = old.state.revision + 1;
        draft.storageError = null;
        try {
          await storage.save(draft);
        } catch {
          old.remaining = old.deadline === null ? null : Math.max(0, old.deadline - clock());
          if (old.state.status === "running") old.state.status = "paused";
          old.deadline = null;
          old.storageError =
            "Cannot save this room. Check disk space and save-folder permissions, then resume.";
          old.state.revision++;
          publish(code, true);
          reject("SAVE_FAILED", old.storageError);
        }
        rooms.set(code, draft);
        publish(
          code,
          old.state.phaseId !== draft.state.phaseId || old.state.status !== draft.state.status,
        );
        return result;
      });
    queues.set(code, task);
    try {
      return await task;
    } finally {
      if (queues.get(code) === task) queues.delete(code);
    }
  }
  return {
    rooms,
    transaction,
    async drain() {
      while (queues.size) await Promise.allSettled([...queues.values()]);
    },
    setPublisher(callback: typeof publish) {
      publish = callback;
    },
    async restore() {
      for (const room of await storage.load()) {
        assertInvariants(room.state);
        rooms.set(room.state.code, room);
      }
    },
    async create(secret = newToken(), testMode = false) {
      const task = creating
        .catch(() => {})
        .then(async () => {
          const tokenHash = hashToken(secret);
          const existing = [...rooms.values()].find((r) => r.sessions[tokenHash]?.role === "host");
          if (existing) return { code: existing.state.code, hostToken: secret };
          let code: string;
          do {
            code = randomBytes(3).toString("hex").toUpperCase();
          } while (rooms.has(code));
          const seed = randomBytes(4).readUInt32LE();
          const state = createMatch(randomUUID(), code, content, seed);
          const room = emptyRoom(state, testMode);
          createSession(room.sessions, { role: "host", playerId: null }, secret);
          await storage.save(room);
          rooms.set(code, room);
          return { code, hostToken: secret };
        });
      creating = task;
      return task;
    },
    snapshot(binding: Binding) {
      const room = rooms.get(binding.code);
      if (!room) reject("NOT_FOUND", "Room not found.");
      const options: ViewOptions = {
        deadline: room.deadline,
        remaining: room.remaining,
        phaseStartedAt: room.phaseStartedAt,
        phaseDuration: room.phaseDuration,
        serverNow: clock(),
        speed: room.speed,
        storageError: room.storageError,
        testMode: room.testMode,
        readOnly: binding.readOnly,
      };
      let cached = publicViews.get(room.state);
      if (!cached || cached.revision !== room.state.revision) {
        const view = projectRoom(room.state, null, false, options);
        if (view.role !== "projector") throw new Error("Invalid public projection");
        cached = { revision: room.state.revision, view };
        publicViews.set(room.state, cached);
      }
      return projectRoom(
        room.state,
        binding.session?.playerId ?? null,
        binding.session?.role === "host",
        options,
        cached.view,
      );
    },
    async command(
      binding: Binding,
      env: Envelope,
      payload: unknown,
      edit: (room: StoredRoom) => void,
    ) {
      if (!binding.tokenHash || !binding.session) reject("UNAUTHORIZED", "Join this room first.");
      if (binding.readOnly)
        reject("READ_ONLY", "A newer tab controls this identity. Reconnect here to take control.");
      const cacheKey = `${binding.tokenHash}:${env.requestId}`;
      const fingerprint = JSON.stringify(payload);
      const receipt = (room: StoredRoom): ActionResult<Receipt> | undefined => {
        if (!binding.tokenHash || !room.sessions[binding.tokenHash])
          reject("UNAUTHORIZED", "This player was removed. Join again.");
        if (binding.readOnly) reject("READ_ONLY", "A newer tab controls this identity.");
        if (room.state.id !== env.matchId) reject("STALE", "This match changed. Reconnect.");
        const cached = room.processed[cacheKey];
        if (!cached) return undefined;
        if (cached.fingerprint !== fingerprint)
          reject("CONFLICT", "A request ID was reused with different content.");
        return { ok: true, value: cached.receipt };
      };
      return transaction(
        binding.code,
        (room): ActionResult<Receipt> => {
          if (room.state.phaseId !== env.phaseId)
            reject("STALE", "That phase has ended. Choose for the current phase.");
          edit(room);
          const value = { revision: room.state.revision + 1 };
          room.processed[cacheKey] = { fingerprint, receipt: value };
          return { ok: true, value };
        },
        receipt,
      );
    },
    async tick(now: number) {
      await Promise.allSettled(
        [...rooms.values()]
          .filter((r) => r.state.status === "running" && r.deadline !== null && r.deadline <= now)
          .map((r) =>
            transaction(r.state.code, (room) => {
              if (room.state.status === "running" && room.deadline !== null && room.deadline <= now)
                advancePhase(room, now);
            }),
          ),
      );
    },
  };
}
export type RoomManager = ReturnType<typeof createRoomManager>;
