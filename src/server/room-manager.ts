import { randomBytes, randomUUID } from "node:crypto";
import { createMatch } from "../game/create-match.js";
import { assertInvariants } from "../game/invariants.js";
import type { DungeonContent } from "../shared/content-types.js";
import type { ActionResult, Envelope, Receipt } from "../shared/protocol.js";
import { newClock } from "./clocks.js";
import { playerRun } from "./crew-decisions.js";
import { reject } from "./errors.js";
import { expeditionDue, progressExpedition } from "./expedition-scheduler.js";
import { bindProgress } from "./progress-bindings.js";
import { questionActive } from "./question-coordinator.js";
import { createLimits } from "./request-limits.js";
import { advancePhase } from "./room-clock.js";
import { hostExpired, pauseRoom, requireLiveRoom } from "./room-lifecycle.js";
import { createRoomProjector } from "./room-projection.js";
import { createRoomQueue, type Publisher } from "./room-queue.js";
import type { Binding, StoredRoom } from "./room-types.js";
import { createSession, hashToken, newToken } from "./sessions.js";
import type { Storage } from "./storage.js";

export function emptyRoom(state: StoredRoom["state"], testMode = false): StoredRoom {
  return {
    schemaVersion: 9,
    savedAt: 0,
    absentSince: {},
    timer: newClock(0, 0, false),
    pauseReasons: [],
    pvpEnabled: true,
    recovery: [],
    duels: [],
    creationKeyHash: "",
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
    runs: {},
    decisionSerial: state.phaseId,
    inactivityFallback: false,
    discovery: null,
    lifecycle: { kind: "live", hostDisconnectedAt: null },
  };
}
export function createRoomManager(
  storage: Storage,
  content: DungeonContent,
  clock: () => number = Date.now,
) {
  const rooms = new Map<string, StoredRoom>();
  const limits = createLimits();
  const snapshot = createRoomProjector(rooms, clock);
  let publish: Publisher = () => {};
  let creating: Promise<unknown> = Promise.resolve();
  const { transaction, drain, metrics } = createRoomQueue(
    rooms,
    storage,
    clock,
    (code, immediate, crews) => publish(code, immediate, crews),
  );
  return {
    rooms,
    transaction,
    drain,
    queueMetrics: metrics,
    setPublisher(callback: typeof publish) {
      publish = callback;
    },
    async restore() {
      for (const room of await storage.load()) {
        bindProgress(room);
        assertInvariants(room.state);
        if (
          room.state.rulesVersion === "dungeon-v4" &&
          room.lifecycle.kind === "live" &&
          ["running", "paused"].includes(room.state.status)
        ) {
          pauseRoom(room, "server-restart", room.savedAt);
          for (const player of room.state.players) player.connected = false;
          if (room.lifecycle.kind === "live") room.lifecycle.hostDisconnectedAt = clock();
          room.savedAt = clock();
          try {
            await storage.save(room);
          } catch {
            pauseRoom(room, "save-failed", clock());
            room.storageError =
              "Cannot save restored room. Check disk space and save-folder permissions, then resume.";
          }
        }
        rooms.set(room.state.code, room);
      }
    },
    async create(secret = newToken(), testMode = false, rulesVersion: "dungeon-v4" = "dungeon-v4") {
      const task = creating
        .catch(() => {})
        .then(async () => {
          const tokenHash = hashToken(secret);
          const existing = [...rooms.values()].find((r) => r.creationKeyHash === tokenHash);
          if (existing) {
            requireLiveRoom(existing, clock());
            return { code: existing.state.code, hostToken: secret };
          }
          let code: string;
          do {
            code = randomBytes(3).toString("hex").toUpperCase();
          } while (rooms.has(code));
          const seed = randomBytes(4).readUInt32LE();
          const state = createMatch(randomUUID(), code, content, seed);
          state.rulesVersion = rulesVersion;
          state.outcomeSeed = randomBytes(4).readUInt32LE();
          state.trialRng = randomBytes(4).readUInt32LE();
          state.rewardSeed = randomBytes(4).readUInt32LE();
          const room = emptyRoom(state, testMode);
          state.learningEnabled = !!content.trialPack && (testMode || !content.trialPack.fixture);
          room.creationKeyHash = tokenHash;
          if (room.lifecycle.kind === "live") room.lifecycle.hostDisconnectedAt = clock();
          room.savedAt = clock();
          createSession(room.sessions, { role: "host", playerId: null }, secret);
          room.savedAt = clock();
          await storage.save(room);
          rooms.set(code, room);
          return { code, hostToken: secret };
        });
      creating = task;
      return task;
    },
    snapshot,
    async command(
      binding: Binding,
      env: Envelope,
      payload: unknown,
      edit: (room: StoredRoom) => void,
      decision?: "confirm" | "edit" | "withdraw" | "social",
    ) {
      if (!binding.tokenHash || !binding.session) reject("UNAUTHORIZED", "Join this room first.");
      if (binding.readOnly)
        reject("READ_ONLY", "A newer tab controls this identity. Reconnect here to take control.");
      const cacheKey = `${binding.tokenHash}:${env.requestId}`;
      const fingerprint = JSON.stringify(payload);
      const receipt = (room: StoredRoom): ActionResult<Receipt> | undefined => {
        requireLiveRoom(room, clock());
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
          limits.consume(`${binding.code}:${binding.tokenHash}`, 20, 0.01, clock());
          const run =
            decision && binding.session?.role === "player" && !questionActive(room)
              ? playerRun(room, binding.session.playerId)
              : undefined;
          if (decision && room.state.status === "paused")
            reject("PAUSED", "The expedition is paused.");
          if (decision && run?.pauseReasons.length) reject("PAUSED", "Your crew is paused.");
          if ((run?.progress.phaseId ?? room.state.phaseId) !== env.phaseId)
            reject("STALE", "That phase has ended. Choose for the current phase.");
          const deadline = run?.clock.deadline ?? room.deadline;
          if (decision && deadline !== null && clock() >= deadline)
            reject("CLOSED", "The decision deadline has passed.");
          if (decision === "social") edit(room);
          else if (run) {
            if (
              room.duels.some(
                (duel) => duel.status === "active" && duel.crewIds.includes(run.crewId),
              )
            )
              reject("CLOSED", "Choose a duel action instead.");
            if (run.finished) reject("CLOSED", "Your expedition has ended.");
            edit(room);
            const playerId = binding.session?.playerId ?? "";
            if (decision === "confirm" && !run.ready.includes(playerId)) run.ready.push(playerId);
            if (decision === "edit") run.ready = run.ready.filter((id) => id !== playerId);
          } else edit(room);
          if (room.state.rulesVersion === "dungeon-v4") progressExpedition(room, clock());
          const value = { revision: room.state.revision + 1 };
          room.processed[cacheKey] = { fingerprint, receipt: value };
          return { ok: true, value };
        },
        receipt,
        binding.session.playerId ?? undefined,
      );
    },
    async tick(now: number) {
      const results = await Promise.allSettled(
        [...rooms.values()]
          .filter((r) =>
            r.state.rulesVersion === "dungeon-v4"
              ? hostExpired(r, now) || expeditionDue(r, now)
              : r.state.status === "running" && r.deadline !== null && r.deadline <= now,
          )
          .map((r) =>
            transaction(r.state.code, (room) => {
              if (room.state.rulesVersion === "dungeon-v4") {
                if (hostExpired(room, now)) pauseRoom(room, "host-offline", now);
                else progressExpedition(room, now);
              } else if (
                room.state.status === "running" &&
                room.deadline !== null &&
                room.deadline <= now
              )
                advancePhase(room, now);
            }),
          ),
      );
      for (const result of results)
        if (result.status === "rejected")
          console.error(
            "Phase transition rejected:",
            result.reason instanceof Error ? result.reason.message : "Unknown failure",
          );
    },
  };
}
export type RoomManager = ReturnType<typeof createRoomManager>;
