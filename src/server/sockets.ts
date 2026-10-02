import type { Server, Socket } from "socket.io";
import { activeQuestion } from "../game/learning.js";
import type { Ack, ActionResult, ClientEvents, ServerEvents } from "../shared/protocol.js";
import {
  codeSchema,
  hostSchema,
  nameSchema,
  rosterSchema,
  secretSchema,
} from "../shared/validation.js";
import { CommandError, reject } from "./errors.js";
import { hostControl } from "./handlers/host.js";
import { changeRoster, joinPlayer } from "./handlers/lobby.js";
import { attachPlayerSockets } from "./player-sockets.js";
import type { RoomManager } from "./room-manager.js";
import type { Binding } from "./room-types.js";
import { findSession, hashToken } from "./sessions.js";

type GameSocket = Socket<ClientEvents, ServerEvents>;
export function attachSockets(
  io: Server<ClientEvents, ServerEvents>,
  manager: RoomManager,
  clock: () => number = Date.now,
) {
  const bindings = new Map<string, Binding>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  function emitView(socket: GameSocket, reliable = true) {
    const b = bindings.get(socket.id);
    if (!b || !socket.connected || (!reliable && !socket.conn.transport.writable)) return;
    if (b.tokenHash && !manager.rooms.get(b.code)?.sessions[b.tokenHash]) {
      b.session = null;
      b.tokenHash = null;
      b.readOnly = false;
      socket.emit("session:removed");
    }
    const channel = reliable ? socket : socket.volatile;
    channel.emit("room:snapshot", manager.snapshot(b));
  }
  function broadcast(code: string, reliable: boolean) {
    for (const socket of io.sockets.sockets.values())
      if (bindings.get(socket.id)?.code === code) emitView(socket, reliable);
  }
  manager.setPublisher((code, immediate) => {
    if (immediate) {
      clearTimeout(timers.get(code));
      timers.delete(code);
      broadcast(code, true);
    } else if (!timers.has(code))
      timers.set(
        code,
        setTimeout(() => {
          timers.delete(code);
          broadcast(code, false);
        }, 50),
      );
  });
  async function refreshPresence(code: string) {
    if (!manager.rooms.has(code)) return;
    await manager.transaction(code, (room) => {
      for (const p of room.state.players)
        p.connected = [...bindings.values()].some(
          (b) => b.code === code && b.session?.playerId === p.id,
        );
    });
  }
  async function bind(socket: GameSocket, code: string, token?: string) {
    const room = manager.rooms.get(code);
    if (!room) reject("NOT_FOUND", "Room not found. Check the code.");
    const session = findSession(room.sessions, token);
    if (token && !session) reject("UNAUTHORIZED", "Session expired. Join again.");
    if (!socket.connected) return;
    const previous = bindings.get(socket.id);
    const tokenHash = token ? hashToken(token) : null;
    const binding: Binding = { code, session, tokenHash, readOnly: false };
    bindings.set(socket.id, binding);
    if (tokenHash)
      for (const [id, b] of bindings)
        if (id !== socket.id && b.code === code && b.tokenHash === tokenHash) {
          b.readOnly = true;
          const other = io.sockets.sockets.get(id);
          if (other) emitView(other);
        }
    if (previous?.code && previous.code !== code) await refreshPresence(previous.code);
    try {
      if (session?.role === "player" || previous?.session?.role === "player")
        await refreshPresence(code);
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
        ack({
          ok: false,
          code: error instanceof CommandError ? error.code : "INVALID",
          message:
            error instanceof CommandError ? error.message : "Invalid request. Check your input.",
        });
      }
    }
    function binding(player = false) {
      const b = bindings.get(socket.id);
      if (!b) reject("UNAUTHORIZED", "Connect to a room first.");
      if (player && b.session?.role !== "player") reject("UNAUTHORIZED", "Join as a player.");
      return b;
    }
    function authenticate(
      task: () => Promise<ActionResult<import("../shared/protocol.js").Receipt>>,
      ack: Ack,
    ) {
      const next = authentication.catch(() => {}).then(() => respond(ack, task));
      authentication = next;
    }
    socket.on("session:resume", (input, ack) =>
      authenticate(async () => {
        const code = codeSchema.parse(input.code.toUpperCase());
        if (input.token !== undefined) secretSchema.parse(input.token);
        await bind(socket, code, input.token);
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
        const receipt = await manager.transaction(code, (room) => joinPlayer(room, name, secret));
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
    socket.on(
      "host:roster",
      (input, ack) =>
        void respond(ack, async () => {
          const parsed = rosterSchema.parse(input),
            b = binding();
          if (b.session?.role !== "host") reject("UNAUTHORIZED", "Host access required.");
          return manager.command(b, parsed, parsed, (r) => changeRoster(r, parsed));
        }),
    );
    socket.on(
      "host:control",
      (input, ack) =>
        void respond(ack, async () => {
          const parsed = hostSchema.parse(input),
            b = binding();
          if (b.session?.role !== "host") reject("UNAUTHORIZED", "Host access required.");
          return manager.command(b, parsed, parsed, (r) => hostControl(r, parsed, clock()));
        }),
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
      if (previous?.session?.role === "player") void refreshPresence(previous.code).catch(() => {});
    });
  });
  io.on("close", () => {
    for (const timer of timers.values()) clearTimeout(timer);
  });
}
