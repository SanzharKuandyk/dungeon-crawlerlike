import { io, type Socket } from "socket.io-client";
import type {
  Ack,
  ActionResult,
  ClientEvents,
  Envelope,
  Receipt,
  ServerEvents,
} from "../shared/protocol.js";
import type { RoomView } from "../shared/view-types.js";
import { notifyError } from "./notify.js";
import type { ConnectionStatus } from "./room.svelte.js";
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
  const pending = new Map<
    string,
    { phaseId: number; finish: (result: ActionResult<Receipt>) => void }
  >();
  const storageKey = `siege-pending:${options.code}:${options.storageScope ?? options.role}`;
  function persisted(): string[] {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      return Array.isArray(value)
        ? value.filter((id): id is string => typeof id === "string").slice(-100)
        : [];
    } catch {
      return [];
    }
  }
  const uncertain = new Set(persisted());
  let syncTimer: ReturnType<typeof setTimeout> | undefined;
  function savePending() {
    localStorage.setItem(
      storageKey,
      JSON.stringify([...new Set([...uncertain, ...pending.keys()])].slice(-100)),
    );
    options.onPending?.(pending.size);
  }
  function accept(view: RoomView) {
    if (
      disposed ||
      view.code !== options.code ||
      (latest && (latest.id !== view.id || view.revision < latest.revision))
    )
      return;
    latest = view;
    options.onView(view);
    for (const [_id, request] of pending)
      if (request.phaseId !== view.phaseId)
        request.finish({
          ok: false,
          code: "STALE",
          message: "The phase ended. Your current choices are shown.",
        });
    if (authenticated) {
      ready = true;
      options.onStatus("ready");
    }
  }
  function sync() {
    if (!socket.connected || disposed) return;
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
    socket.emit("session:resume", { code: options.code, token: options.token }, (result) => {
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
          savePending();
        },
      );
    });
  }
  socket.on("connect", sync);
  socket.on("disconnect", () => {
    clearTimeout(syncTimer);
    socket.sendBuffer = [];
    ready = false;
    authenticated = false;
    generation++;
    if (!disposed) options.onStatus("reconnecting");
  });
  socket.on("connect_error", () => {
    if (!disposed) options.onStatus("reconnecting");
  });
  socket.on("room:snapshot", accept);
  function forgetPlayer() {
    options.token = undefined;
    localStorage.removeItem(`siege-session:${options.code}:${options.role}`);
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
      const result = await new Promise<ActionResult<Receipt>>((resolve) => {
        const timer = setTimeout(
          () =>
            resolve({
              ok: false,
              code: "OFFLINE",
              message: "Joining timed out. Retry with the same nickname.",
            }),
          12000,
        );
        socket.emit(
          "session:join",
          { code: options.code, name, bootstrapSecret: secret },
          (ack) => {
            clearTimeout(timer);
            resolve(ack);
          },
        );
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
      const env = { requestId: crypto.randomUUID(), matchId: latest.id, phaseId: latest.phaseId };
      return new Promise((resolve) => {
        let timer: ReturnType<typeof setTimeout> | undefined,
          attempt = 0,
          finished = false;
        const finish = (result: ActionResult<Receipt>) => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          pending.delete(env.requestId);
          if (!result.ok && result.code === "OFFLINE") uncertain.add(env.requestId);
          else uncertain.delete(env.requestId);
          savePending();
          if (!result.ok && result.code !== "STALE") notifyError(result.message, result.code);
          resolve(result.ok);
        };
        pending.set(env.requestId, { phaseId: env.phaseId, finish });
        savePending();
        const transmit = () => {
          if (disposed || latest?.id !== env.matchId || latest.phaseId !== env.phaseId) {
            finish({ ok: false, code: "STALE", message: "Phase changed." });
            return;
          }
          if (attempt++ >= 3) {
            finish({
              ok: false,
              code: "OFFLINE",
              message: "No confirmation received. Reconnect to check your accepted choice.",
            });
            return;
          }
          if (socket.connected && ready) send(env, finish);
          timer = setTimeout(transmit, 4000);
        };
        transmit();
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
