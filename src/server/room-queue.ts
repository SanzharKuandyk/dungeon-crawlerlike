import { assertInvariants } from "../game/invariants.js";
import { cloneRoom } from "./clone-room.js";
import { CommandError } from "./errors.js";
import { pauseRoom } from "./room-lifecycle.js";
import type { StoredRoom } from "./room-types.js";
import type { Storage } from "./storage.js";

export type Publisher = (code: string, immediate: boolean, crewIds?: string[]) => void;
type Mutation = {
  edit: (room: StoredRoom) => unknown | Promise<unknown>;
  reuse?: (room: StoredRoom) => unknown;
  playerId?: string;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
};
type Queue = { pending: Mutation[]; running: boolean };

export function createRoomQueue(
  rooms: Map<string, StoredRoom>,
  storage: Storage,
  clock: () => number,
  publish: Publisher,
) {
  const queues = new Map<string, Queue>();
  const idle: (() => void)[] = [];
  let maximumDepth = 0;

  function deliver(code: string, immediate: boolean, crewIds?: string[]) {
    try {
      publish(code, immediate, crewIds);
    } catch {
      console.error("Snapshot delivery failed; committed state remains available through sync.");
    }
  }

  async function flush(code: string, queue: Queue) {
    queue.running = true;
    while (queue.pending.length) {
      const batch = queue.pending.splice(0, 128);
      const old = rooms.get(code);
      if (!old) {
        for (const task of batch) task.reject(new CommandError("NOT_FOUND", "Room not found."));
        continue;
      }
      let draft = old;
      const accepted: { task: Mutation; value: unknown }[] = [];
      for (const task of batch) {
        try {
          const reused = task.reuse?.(draft);
          if (reused !== undefined) {
            if (task.reuse?.(old) !== undefined) task.resolve(reused);
            else accepted.push({ task, value: reused });
            continue;
          }
          const next = cloneRoom(draft);
          const value = await task.edit(next);
          assertInvariants(next.state);
          const fightingCrews = next.duels
            .filter((duel) => duel.status === "active")
            .flatMap((duel) =>
              duel.crewIds.filter((id) => next.state.crews.some((c) => c.id === id)),
            );
          if (new Set(fightingCrews).size !== fightingCrews.length)
            throw new Error("Crew entered two duels");
          if (
            next.duels.some(
              (duel) =>
                duel.turn < 1 ||
                duel.turn > 3 ||
                duel.crewIds[0] === duel.crewIds[1] ||
                Object.values(duel.stakes).some(
                  (stake) => !Number.isInteger(stake) || stake < 0 || stake > 3,
                ),
            )
          )
            throw new Error("Invalid duel state");
          for (const run of Object.values(next.runs)) {
            if (
              new Set(run.progress.resolvedPhaseIds).size !== run.progress.resolvedPhaseIds.length
            )
              throw new Error("Crew phase resolved twice");
            if (run.progress.depth > 12 || run.progress.turn > 8)
              throw new Error("Invalid crew progress");
          }
          next.state.revision = draft.state.revision + 1;
          next.storageError = null;
          draft = next;
          accepted.push({ task, value });
        } catch (error) {
          task.reject(error);
        }
      }
      if (draft !== old) {
        try {
          draft.savedAt = clock();
          await storage.save(draft);
        } catch {
          pauseRoom(old, "save-failed", clock());
          old.storageError =
            "Cannot save this room. Check disk space and save-folder permissions, then resume.";
          old.state.revision++;
          deliver(code, true);
          for (const { task } of accepted)
            task.reject(new CommandError("SAVE_FAILED", old.storageError));
          continue;
        }
        rooms.set(code, draft);
        const changed = Object.keys(draft.runs).filter(
          (id) => old.runs[id]?.progress.phaseId !== draft.runs[id].progress.phaseId,
        );
        const globalChange =
          old.state.phaseId !== draft.state.phaseId ||
          old.state.status !== draft.state.status ||
          old.pvpEnabled !== draft.pvpEnabled ||
          draft.state.history
            .slice(old.state.history.length)
            .some((event) => event.kind === "host-intervention") ||
          JSON.stringify(old.lifecycle) !== JSON.stringify(draft.lifecycle);
        const presenceCrews = draft.state.players.flatMap((player) =>
          player.crewId &&
          old.state.players.find((previous) => previous.id === player.id)?.connected !==
            player.connected
            ? [player.crewId]
            : [],
        );
        const ownCrews = accepted.flatMap(({ task }) => {
          const crewId = draft.state.players.find((player) => player.id === task.playerId)?.crewId;
          return crewId ? [crewId] : [];
        });
        const audience =
          !globalChange &&
          draft.state.rulesVersion === "dungeon-v5" &&
          draft.state.status !== "lobby"
            ? [
                ...new Set([
                  ...changed,
                  ...ownCrews,
                  ...presenceCrews,
                  ...draft.duels
                    .filter(
                      (duel) =>
                        ["offered", "active", "champion-offer"].includes(duel.status) ||
                        old.duels.some(
                          (previous) => previous.id === duel.id && previous.status !== duel.status,
                        ),
                    )
                    .flatMap((duel) => duel.crewIds),
                ]),
              ]
            : undefined;
        deliver(code, globalChange || changed.length > 0, audience);
      }
      // A batch publishes only after every accepted receipt is on disk.
      for (const { task, value } of accepted) task.resolve(value);
    }
    queues.delete(code);
    if (!queues.size) for (const resolve of idle.splice(0)) resolve();
  }

  function transaction<T>(
    code: string,
    edit: (room: StoredRoom) => T | Promise<T>,
    reuse?: (room: StoredRoom) => T | undefined,
    playerId?: string,
  ): Promise<T> {
    let queue = queues.get(code);
    if (!queue) {
      queue = { pending: [], running: false };
      queues.set(code, queue);
    }
    const active = queue;
    return new Promise<T>((resolve, reject) => {
      if (active.pending.length >= 512) {
        reject(new CommandError("BUSY", "This room is busy. Retry shortly.", 1000));
        return;
      }
      active.pending.push({
        edit,
        reuse,
        playerId,
        resolve: (value) => resolve(value as T),
        reject,
      });
      maximumDepth = Math.max(maximumDepth, active.pending.length);
      if (!active.running) {
        active.running = true;
        setTimeout(() => void flush(code, active), 5);
      }
    });
  }
  return {
    transaction,
    metrics: () => ({
      maximumDepth,
      pending: [...queues.values()].reduce((n, q) => n + q.pending.length, 0),
    }),
    drain: () =>
      queues.size ? new Promise<void>((resolve) => idle.push(resolve)) : Promise.resolve(),
  };
}
