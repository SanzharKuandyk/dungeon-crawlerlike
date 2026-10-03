import type { Server, Socket } from "socket.io";
import { ZodError } from "zod";
import { activeQuestion } from "../game/learning.js";
import { recoveryRedeemSchema } from "../shared/host-validation.js";
import type { Ack, ActionResult, ClientEvents, ServerEvents } from "../shared/protocol.js";
import { codeSchema, nameSchema, secretSchema } from "../shared/validation.js";
import { CommandError, reject } from "./errors.js";
import { progressExpedition } from "./expedition-scheduler.js";
import { joinPlayer } from "./handlers/lobby.js";
import { attachHostSockets } from "./host-sockets.js";
import { attachPlayerSockets } from "./player-sockets.js";
import { redeemRecovery } from "./recovery.js";
import { createLimits } from "./request-limits.js";
import { hostPresence, requireLiveRoom } from "./room-lifecycle.js";
import type { RoomManager } from "./room-manager.js";
import type { Binding } from "./room-types.js";
import { findSession, hashToken } from "./sessions.js";
import { attachSnapshots } from "./socket-snapshots.js";

type GameSocket = Socket<ClientEvents, ServerEvents>;
export function attachSockets(
  io: Server<ClientEvents, ServerEvents>,
  manager: RoomManager,
  clock: () => number = Date.now,
) {
  const limits = createLimits();
  const bindings = new Map<string, Binding>();
  const emitView = attachSnapshots(io, manager, bindings, clock);
  async function refreshPresence(code: string) {
    if (!manager.rooms.has(code)) return;
    await manager.transaction(code, (room) => {
      for (const p of room.state.players)
        p.connected = [...bindings.values()].some(
          (b) =>
            b.code === code &&
            b.session?.playerId === p.id &&
            !b.readOnly &&
            !!b.tokenHash &&
            !!room.sessions[b.tokenHash],
        );
      for (const player of room.state.players) {
        if (player.connected) delete room.absentSince[player.id];
        else room.absentSince[player.id] ??= clock();
      }
      hostPresence(
        room,
        [...bindings.values()].some(
          (b) =>
            b.code === code &&
            b.session?.role === "host" &&
            !b.readOnly &&
            !!b.tokenHash &&
            !!room.sessions[b.tokenHash],
        ),
        clock(),
      );
      if (room.state.rulesVersion === "dungeon-v2") progressExpedition(room, clock());
    });
  }
  async function bind(socket: GameSocket, code: string, token?: string, takeover = false) {
    const room = manager.rooms.get(code);
    if (!room) reject("NOT_FOUND", "Room not found. Check the code.");
    if (room.lifecycle.kind === "closed") {
      bindings.set(socket.id, { code, session: null, tokenHash: null, readOnly: false });
      emitView(socket);
      return;
    }
    requireLiveRoom(room, clock());
    const session = findSession(room.sessions, token);
    if (token && !session) reject("UNAUTHORIZED", "Session expired. Join again.");
    if (!socket.connected) return;
    const previous = bindings.get(socket.id);
    const tokenHash = token ? hashToken(token) : null;
    const binding: Binding = { code, session, tokenHash, readOnly: false };
    const owner = [...bindings.entries()].find(
      ([id, b]) => id !== socket.id && b.code === code && b.tokenHash === tokenHash && !b.readOnly,
    );
    if (tokenHash && owner && room.state.rulesVersion === "dungeon-v2" && !takeover)
      binding.readOnly = true;
    bindings.set(socket.id, binding);
    if (tokenHash && !binding.readOnly)
      for (const [id, b] of bindings)
        if (id !== socket.id && b.code === code && b.tokenHash === tokenHash) {
          b.readOnly = true;
          const other = io.sockets.sockets.get(id);
          if (other) emitView(other);
        }
    if (previous?.code && previous.code !== code) await refreshPresence(previous.code);
    try {
      if (session || previous?.session) await refreshPresence(code);
    } catch (error) {
      bindings.delete(socket.id);
      throw error;
    }
    emitView(socket);
  }
  io.on("connection", (socket) => {
    let authentication: Promise<unknown> = Promise.resolve();
    async function respond<T>(
      ack: (result: ActionResult<T>) => void,
      task: () => Promise<ActionResult<T>>,
    ) {
      if (typeof ack !== "function") return;
      try {
        ack(await task());
      } catch (error) {
        if (!(error instanceof CommandError) && !(error instanceof ZodError))
          console.error(
            "Socket command failed:",
            error instanceof Error ? error.name : "Unknown error",
          );
        ack({
          ok: false,
          code:
            error instanceof CommandError
              ? error.code
              : error instanceof ZodError
                ? "INVALID"
                : "INTERNAL",
          ...(error instanceof CommandError && error.retryAfterMs !== undefined
            ? { retryAfterMs: error.retryAfterMs }
            : {}),
          message:
            error instanceof CommandError
              ? error.message
              : error instanceof ZodError
                ? "Invalid request. Check your input."
                : "The request could not complete. Reconnect and try again.",
        });
      }
    }
    function binding(player = false) {
      const b = bindings.get(socket.id);
      if (!b) reject("UNAUTHORIZED", "Connect to a room first.");
      const room = manager.rooms.get(b.code);
      if (room && room.lifecycle.kind !== "closed") requireLiveRoom(room, clock());
      if (player && b.session?.role !== "player") reject("UNAUTHORIZED", "Join as a player.");
      return b;
    }
    function authenticate(
      task: () => Promise<ActionResult<import("../shared/protocol.js").Receipt>>,
      ack: Ack,
    ) {
      const next = authentication
        .catch(() => {})
        .then(() =>
          respond(ack, async () => {
            limits.window(`auth:${socket.id}`, 5, 10000, clock());
            return task();
          }),
        );
      authentication = next;
    }
    socket.on("session:resume", (input, ack) =>
      authenticate(async () => {
        const code = codeSchema.parse(input.code.toUpperCase());
        if (input.token !== undefined) secretSchema.parse(input.token);
        await bind(socket, code, input.token, input.takeover === true);
        return {
          ok: true,
          value: { revision: manager.rooms.get(code)?.state.revision ?? 0, code },
        };
      }, ack),
    );
    socket.on("session:join", (input, ack) =>
      authenticate(async () => {
        const code = codeSchema.parse(input.code.toUpperCase()),
          name = nameSchema.parse(input.name),
          secret = secretSchema.parse(input.bootstrapSecret);
        const receipt = await manager.transaction(code, (room) => {
          requireLiveRoom(room, clock());
          return joinPlayer(room, name, secret);
        });
        await bind(socket, code, secret);
        return {
          ok: true,
          value: { ...receipt, code, revision: manager.rooms.get(code)?.state.revision ?? 0 },
        };
      }, ack),
    );
    socket.on(
      "session:sync",
      (input, ack) =>
        void respond(ack, async () => {
          const b = binding();
          const room = manager.rooms.get(b.code);
          if (!room) reject("NOT_FOUND", "Room not found.");
          const receipts: Record<string, import("../shared/protocol.js").Receipt> = {};
          if (Array.isArray(input.pending))
            for (const id of input.pending.slice(0, 100)) {
              const cached = room.processed[`${b.tokenHash}:${id}`];
              if (cached) receipts[id] = cached.receipt;
            }
          return { ok: true, value: { view: manager.snapshot(b), receipts } };
        }),
    );
    socket.on(
      "history:read",
      (input, ack) =>
        void respond(ack, async () => {
          const b = binding(),
            room = manager.rooms.get(b.code);
          if (!room) reject("NOT_FOUND", "Room not found.");
          if (!Number.isInteger(input.before) || input.before < 1)
            reject("INVALID", "Invalid log cursor.");
          return {
            ok: true,
            value: room.state.history.filter((e) => e.sequence < input.before).slice(-50),
          };
        }),
    );
    attachPlayerSockets(socket, manager, binding, respond, clock);
    attachHostSockets(socket, manager, binding, respond, clock);
    socket.on("session:recover", (input, ack) =>
      authenticate(async () => {
        const parsed = recoveryRedeemSchema.parse(input);
        limits.window(`recover:${socket.id}`, 5, 60000, clock());
        limits.window(`recover-room:${parsed.code}`, 20, 60000, clock());
        const result = await manager.transaction(parsed.code, (room) =>
          redeemRecovery(room, parsed, clock()),
        );
        await bind(socket, parsed.code, parsed.bootstrapSecret);
        return {
          ok: true,
          value: {
            ...result,
            code: parsed.code,
            revision: manager.rooms.get(parsed.code)?.state.revision ?? 0,
          },
        };
      }, ack),
    );
    socket.on(
      "test:answer",
      (input, ack) =>
        void respond(ack, async () => {
          const b = binding();
          const room = manager.rooms.get(b.code);
          if (b.session?.role !== "host" || b.readOnly || !room?.testMode)
            reject("UNAUTHORIZED", "Test host access required.");
          if (input.matchId !== room.state.id || input.phaseId !== room.state.phaseId)
            reject("STALE", "Phase changed.");
          return { ok: true, value: { choice: activeQuestion(room.state)?.correctIndex ?? null } };
        }),
    );
    socket.on("disconnect", () => {
      const previous = bindings.get(socket.id);
      bindings.delete(socket.id);
      limits.remove(`auth:${socket.id}`);
      limits.remove(`recover:${socket.id}`);
      if (previous?.session) void refreshPresence(previous.code).catch(() => {});
    });
  });
}
