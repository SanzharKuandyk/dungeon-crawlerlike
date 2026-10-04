import { expect, it, vi } from "vitest";
import { startCrews } from "../../src/server/crew-clock.js";
import { updateCrewPresence } from "../../src/server/crew-decisions.js";
import { emptyRoom } from "../../src/server/room-manager.js";
import { createRoomQueue } from "../../src/server/room-queue.js";
import type { StoredRoom } from "../../src/server/room-types.js";
import { fixture } from "../fixtures/match.js";

function setup(save: (room: StoredRoom) => Promise<void>, publish = () => {}) {
  const room = emptyRoom(fixture(1));
  const rooms = new Map([[room.state.code, room]]);
  const queue = createRoomQueue(rooms, { save, load: async () => [] }, () => 1000, publish);
  return { ...queue, room, rooms, code: room.state.code };
}

it("groups concurrent mutations into one save and acknowledges only after durability", async () => {
  let release: () => void = () => {};
  let saved: StoredRoom | undefined;
  const storageGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const save = vi.fn(async (room: StoredRoom) => {
    saved = room;
    await storageGate;
  });
  const f = setup(save);
  let acknowledged = 0;
  const requests = Array.from({ length: 20 }, (_, index) =>
    f
      .transaction(f.code, (room) => {
        room.state.crews[0].trialScoreUnits++;
        room.processed[String(index)] = {
          fingerprint: String(index),
          receipt: { revision: room.state.revision + 1 },
        };
      })
      .then(() => {
        acknowledged++;
      }),
  );
  await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(acknowledged).toBe(0);
  expect(Object.keys(saved?.processed ?? {})).toHaveLength(20);
  release();
  await Promise.all(requests);
  expect(acknowledged).toBe(20);
  expect(f.rooms.get(f.code)?.state.crews[0].trialScoreUnits).toBe(20);
});

it("a failed batch rolls back new receipts but keeps existing receipts recoverable", async () => {
  const f = setup(async () => {
    throw new Error("Disk full");
  });
  f.room.processed.old = { fingerprint: "old", receipt: { revision: 1 } };
  const fresh = f.transaction(f.code, (room) => {
    room.state.crews[0].trialScoreUnits = 10;
    room.processed.new = { fingerprint: "new", receipt: { revision: 2 } };
  });
  const duplicate = f.transaction(
    f.code,
    () => {
      throw new Error("Must not run");
    },
    (room) => room.processed.old?.receipt,
  );
  expect(await duplicate).toEqual({ revision: 1 });
  await expect(fresh).rejects.toMatchObject({ code: "SAVE_FAILED" });
  expect(f.room.state.crews[0].trialScoreUnits).toBe(0);
  expect(f.room.processed.new).toBeUndefined();
  expect(f.room.state.status).toBe("paused");
});

it("a snapshot delivery error never rolls back an already committed action", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const f = setup(
      async () => {},
      () => {
        throw new Error("Transport unavailable");
      },
    );
    await f.transaction(f.code, (room) => {
      room.state.crews[0].trialScoreUnits = 10;
    });
    expect(f.rooms.get(f.code)?.state.crews[0].trialScoreUnits).toBe(10);
    expect(f.rooms.get(f.code)?.storageError).toBeNull();
  } finally {
    log.mockRestore();
  }
});

it("an absent member gets a safe default after 15 seconds without blocking connected teammates", () => {
  const room = emptyRoom(fixture(1, [2]));
  startCrews(room, 1000);
  const run = room.runs.c0;
  room.state.players[1].connected = false;
  updateCrewPresence(room, run, 1000);
  updateCrewPresence(room, run, 15999);
  expect(run.ready).not.toContain("p0-1");
  updateCrewPresence(room, run, 16000);
  expect(run.ready).toContain("p0-1");
  expect(run.suspended).toBe(false);
});

it("queue admission caps pending work and returns a typed busy response", async () => {
  const f = setup(async () => {});
  const requests = Array.from({ length: 513 }, () =>
    f
      .transaction(f.code, () => {})
      .then(
        () => "ok",
        (error) => error.code,
      ),
  );
  const results = await Promise.all(requests);
  expect(results.filter((result) => result === "BUSY")).toHaveLength(1);
  expect(results.filter((result) => result === "ok")).toHaveLength(512);
});
