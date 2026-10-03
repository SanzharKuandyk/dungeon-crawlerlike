import { io, type Socket } from "socket.io-client";
import type { Ack, ClientEvents, Envelope, ServerEvents } from "../shared/protocol.js";
import type { RoomView } from "../shared/view-types.js";
import { notifyError } from "./notify.js";
import type { ConnectionStatus } from "./room.svelte.js";
import { submitIdentity } from "./session-identity.js";
import { createSessionRequests } from "./session-requests.js";
import { browserStorage } from "./storage.js";

export type SessionOptions = {
  code: string;
  token?: string;
  role: string;
  storageScope?: string;
  onView: (view: RoomView) => void;
  onStatus: (status: ConnectionStatus) => void;
  onPending?: (count: number) => void;
};
export function createClientSession(options: SessionOptions) {
  const socket: Socket<ServerEvents, ClientEvents> = io({ autoConnect: false });
  let disposed = false,
    ready = false,
    authenticated = false,
    latest: RoomView | null = null,
    generation = 0;
  const requests = createSessionRequests(
    `siege-pending:${options.code}:${options.storageScope ?? options.role}`,
    options.onPending,
  );
  const { pending, uncertain, persisted, savePending } = requests;
  let syncTimer: ReturnType<typeof setTimeout> | undefined;
  function accept(view: RoomView) {
    if (
      disposed ||
      view.code !== options.code ||
      (latest && (latest.id !== view.id || view.revision < latest.revision))
    )
      return;
    latest = view;
    options.onView(view);
    if (authenticated) {
      ready = true;
      options.onStatus("ready");
    }
  }
  function sync(takeover = false) {
    if (!socket.connected || disposed || latest?.closed) return;
    ready = false;
    authenticated = false;
    options.onStatus("resuming");
    const epoch = ++generation;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      if (disposed || epoch !== generation) return;
      socket.disconnect();
      socket.connect();
    }, 12000);
    socket.emit(
      "session:resume",
      { code: options.code, token: options.token, takeover },
      (result) => {
        if (disposed || epoch !== generation) return;
        if (!result.ok) {
          clearTimeout(syncTimer);
          authenticated = false;
          if (result.code === "UNAUTHORIZED" && options.role === "player" && options.token) {
            forgetPlayer();
            notifyError("Your previous player session ended. Join the room again.");
            sync();
            return;
          }
          options.onStatus("invalid");
          notifyError(result.message, result.code);
          return;
        }
        socket.emit(
          "session:sync",
          { pending: [...new Set([...persisted(), ...pending.keys()])] },
          (response) => {
            if (disposed || epoch !== generation) return;
            clearTimeout(syncTimer);
            if (!response.ok) {
              options.onStatus("invalid");
              notifyError(response.message, response.code);
              return;
            }
            authenticated = true;
            for (const [id, receipt] of Object.entries(response.value.receipts))
              pending.get(id)?.finish({ ok: true, value: receipt });
            uncertain.clear();
            accept(response.value.view);
            for (const [id, request] of pending) {
              if (!response.value.receipts[id] && request.phaseId !== response.value.view.phaseId)
                request.finish({ ok: false, code: "STALE", message: "That decision has ended." });
            }
            savePending();
          },
        );
      },
    );
  }
  socket.on("connect", () => sync());
  socket.on("disconnect", () => {
    clearTimeout(syncTimer);
    socket.sendBuffer = [];
    ready = false;
    authenticated = false;
    generation++;
    if (!disposed) options.onStatus(latest?.closed ? "invalid" : "reconnecting");
  });
  socket.on("connect_error", () => {
    if (!disposed) options.onStatus(latest?.closed ? "invalid" : "reconnecting");
  });
  let positionRevision = -1;
  socket.on("room:positions", (update) => {
    if (
      !latest ||
      !ready ||
      disposed ||
      update.matchId !== latest.id ||
      update.revision < Math.max(latest.revision, positionRevision)
    )
      return;
    positionRevision = update.revision;
    latest = {
      ...latest,
      serverNow: update.serverNow,
      crews: latest.crews.map((crew) => {
        const position = update.crews.find((entry) => entry.id === crew.id);
        return position ? { ...crew, ...position } : crew;
      }),
    };
    options.onView(latest);
  });
  socket.on("room:snapshot", accept);
  socket.on("room:closed", (view) => {
    accept(view);
    ready = false;
    authenticated = false;
    browserStorage.removeItem(`siege-session:${options.code}:${options.role}`);
    options.onStatus("invalid");
    socket.disconnect();
  });
  function forgetPlayer() {
    options.token = undefined;
    browserStorage.removeItem(`siege-session:${options.code}:${options.role}`);
    for (const request of pending.values())
      request.finish({
        ok: false,
        code: "UNAUTHORIZED",
        message: "The teacher removed this player.",
      });
    uncertain.clear();
    savePending();
  }
  socket.on("session:removed", () => {
    forgetPlayer();
    notifyError("The teacher removed you from the lobby. You can join again.");
    sync();
  });
  socket.on("session:error", (error) => notifyError(error.message, error.code));
  function foreground() {
    if (document.visibilityState === "visible") sync();
  }
  document.addEventListener("visibilitychange", foreground);
  socket.connect();
  return {
    socket,
    get view() {
      return latest;
    },
    get ready() {
      return ready;
    },
    async join(name: string, secret: string) {
      if (!socket.connected) {
        notifyError("Reconnect before joining.", "OFFLINE");
        return false;
      }
      ready = false;
      const epoch = generation;
      options.onStatus("resuming");
      const result = await submitIdentity(socket, {
        kind: "join",
        code: options.code,
        name,
        bootstrapSecret: secret,
      });
      if (disposed || epoch !== generation) return false;
      if (!result.ok) {
        options.onStatus("invalid");
        notifyError(result.message, result.code);
        return false;
      }
      options.token = secret;
      authenticated = true;
      sync();
      return true;
    },
    async recover(recoveryCode: string, secret: string) {
      if (!socket.connected || disposed) return false;
      const epoch = generation;
      const result = await submitIdentity(socket, {
        kind: "recover",
        code: options.code,
        recoveryCode,
        bootstrapSecret: secret,
      });
      if (disposed || epoch !== generation) return false;
      if (!result.ok) {
        notifyError(result.message, result.code);
        return false;
      }
      options.token = secret;
      sync();
      return true;
    },
    command(send: (env: Envelope, ack: Ack) => void): Promise<boolean> {
      if (!ready || !socket.connected || !latest) {
        notifyError("Wait for your session to reconnect.", "OFFLINE");
        return Promise.resolve(false);
      }
      if ("readOnly" in latest && latest.readOnly) {
        notifyError(
          "A newer tab controls this identity. Reconnect here to take control.",
          "READ_ONLY",
        );
        return Promise.resolve(false);
      }
      return requests.send(send, {
        view: () => latest,
        available: () => socket.connected && ready,
        disposed: () => disposed,
        sync,
      });
    },
    reconnect: sync,
    dispose() {
      disposed = true;
      clearTimeout(syncTimer);
      generation++;
      for (const request of pending.values())
        request.finish({ ok: false, code: "STALE", message: "Room changed." });
      socket.disconnect();
      document.removeEventListener("visibilitychange", foreground);
    },
  };
}
export type ClientSession = ReturnType<typeof createClientSession>;
