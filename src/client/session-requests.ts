import type { Ack, ActionResult, Envelope, Receipt } from "../shared/protocol.js";
import type { RoomView } from "../shared/view-types.js";
import { notifyError } from "./notify.js";
import { browserStorage } from "./storage.js";

type RequestContext = {
  view: () => RoomView | null;
  available: () => boolean;
  disposed: () => boolean;
  sync: () => void;
};

export function createSessionRequests(storageKey: string, onPending?: (count: number) => void) {
  const pending = new Map<
    string,
    { phaseId: number; finish: (result: ActionResult<Receipt>) => void }
  >();
  function persisted(): string[] {
    try {
      const value: unknown = JSON.parse(browserStorage.getItem(storageKey) ?? "[]");
      return Array.isArray(value)
        ? value.filter((id): id is string => typeof id === "string").slice(-100)
        : [];
    } catch {
      return [];
    }
  }
  const uncertain = new Set(persisted());
  function savePending() {
    browserStorage.setItem(
      storageKey,
      JSON.stringify([...new Set([...uncertain, ...pending.keys()])].slice(-100)),
    );
    onPending?.(pending.size);
  }
  function send(
    send: (envelope: Envelope, ack: Ack) => void,
    context: RequestContext,
  ): Promise<boolean> {
    const view = context.view();
    if (!view) return Promise.resolve(false);
    const env = { requestId: crypto.randomUUID(), matchId: view.id, phaseId: view.phaseId };
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
        if (
          !context.disposed() &&
          context.view()?.id === env.matchId &&
          context.view()?.phaseId !== env.phaseId &&
          attempt < 3
        ) {
          attempt++;
          context.sync();
          timer = setTimeout(transmit, 4000);
          return;
        }
        if (
          context.disposed() ||
          context.view()?.id !== env.matchId ||
          context.view()?.phaseId !== env.phaseId
        ) {
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
        if (context.available()) send(env, finish);
        timer = setTimeout(transmit, 4000);
      };
      transmit();
    });
  }
  return { pending, uncertain, persisted, savePending, send };
}
