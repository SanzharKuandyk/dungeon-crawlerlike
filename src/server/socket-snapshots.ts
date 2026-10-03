import type { Server } from "socket.io";
import type { ClientEvents, ServerEvents } from "../shared/protocol.js";
import type { RoomManager } from "./room-manager.js";
import type { Binding } from "./room-types.js";
import type { GameSocket } from "./socket-types.js";
export function attachSnapshots(
  io: Server<ClientEvents, ServerEvents>,
  manager: RoomManager,
  bindings: Map<string, Binding>,
  clock: () => number,
) {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  function emitView(socket: GameSocket, reliable = true) {
    const b = bindings.get(socket.id);
    if (!b || !socket.connected || (!reliable && !socket.conn.transport.writable)) return;
    if (manager.rooms.get(b.code)?.lifecycle.kind === "closed") {
      socket.emit("room:closed", manager.snapshot(b));
      return;
    }
    if (b.tokenHash && !manager.rooms.get(b.code)?.sessions[b.tokenHash]) {
      b.session = null;
      b.tokenHash = null;
      b.readOnly = false;
      socket.emit("session:removed");
    }
    const channel = reliable ? socket : socket.volatile;
    channel.emit("room:snapshot", manager.snapshot(b));
  }
  const audiences = new Map<string, Set<string> | null>();
  function broadcast(code: string, reliable: boolean, crewIds?: Set<string> | null) {
    const room = manager.rooms.get(code);
    const positions = room
      ? {
          matchId: room.state.id,
          revision: room.state.revision,
          serverNow: clock(),
          crews: room.state.crews.map((crew) => {
            const run = room.runs[crew.id];
            const shown =
              run && ["arrival", "combat-reveal"].includes(run.progress.phase.kind)
                ? (run.progress.before?.crews.find((entry) => entry.id === crew.id) ?? crew)
                : crew;
            return { id: crew.id, mapPosition: shown.mapPosition, status: shown.status };
          }),
        }
      : null;
    for (const socket of io.sockets.sockets.values()) {
      const binding = bindings.get(socket.id);
      if (binding?.code !== code) continue;
      if (crewIds && binding.session?.role === "player") {
        const crewId = room?.state.players.find(
          (player) => player.id === binding.session?.playerId,
        )?.crewId;
        if (crewId && !crewIds.has(crewId)) {
          if (positions) socket.volatile.emit("room:positions", positions);
          continue;
        }
      }
      emitView(socket, reliable);
    }
  }
  manager.setPublisher((code, immediate, crewIds) => {
    if (immediate) {
      broadcast(code, true, crewIds ? new Set(crewIds) : null);
      return;
    }
    const previous = audiences.get(code);
    audiences.set(
      code,
      crewIds === undefined || previous === null
        ? null
        : new Set([...(previous ?? []), ...crewIds]),
    );
    if (!timers.has(code))
      timers.set(
        code,
        setTimeout(() => {
          timers.delete(code);
          const audience = audiences.get(code);
          audiences.delete(code);
          broadcast(code, false, audience);
        }, 50),
      );
  });
  io.on("close", () => {
    for (const timer of timers.values()) clearTimeout(timer);
  });
  return emitView;
}
