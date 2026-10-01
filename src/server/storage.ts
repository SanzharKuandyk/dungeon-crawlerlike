import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { StoredRoom } from "./room-types.js";
export type Storage = {
  save: (room: StoredRoom) => Promise<void>;
  load: () => Promise<StoredRoom[]>;
};
export function fileStorage(directory: string): Storage {
  return {
    async save(room) {
      if (room.testMode) return;
      await mkdir(directory, { recursive: true });
      const path = join(directory, `${room.state.code}.json`);
      await writeFile(`${path}.tmp`, JSON.stringify(room), "utf8");
      for (let attempt = 0; ; attempt++) {
        try {
          await rename(`${path}.tmp`, path);
          break;
        } catch (error) {
          const code = error instanceof Error && "code" in error ? String(error.code) : "UNKNOWN";
          if (attempt >= 4 || !["EPERM", "EACCES", "EBUSY"].includes(code)) throw error;
          await new Promise((done) => setTimeout(done, 20 * (attempt + 1)));
        }
      }
    },
    async load() {
      await mkdir(directory, { recursive: true });
      const rooms: StoredRoom[] = [];
      for (const name of await readdir(directory)) {
        if (!/^[A-Z0-9]{6}\.json$/.test(name)) continue;
        try {
          const room: StoredRoom = JSON.parse(await readFile(join(directory, name), "utf8"));
          if (
            room.schemaVersion !== 4 ||
            room.state.rulesVersion !== "dungeon-v1" ||
            room.state.code !== name.slice(0, 6) ||
            !room.sessions ||
            !room.processed
          )
            throw new Error("Unsupported snapshot");
          if (room.testMode) continue;
          if (room.state.status === "running") {
            room.remaining =
              room.deadline === null ? null : Math.max(0, room.deadline - Date.now());
            room.state.status = "paused";
            room.deadline = null;
          }
          for (const p of room.state.players) p.connected = false;
          room.state.revision++;
          rooms.push(room);
        } catch {
          console.error(
            `Could not restore ${name}. Keep the snapshot and check its rules version.`,
          );
        }
      }
      return rooms;
    },
  };
}
