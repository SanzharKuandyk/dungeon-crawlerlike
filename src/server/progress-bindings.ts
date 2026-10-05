import type { StoredRoom } from "./room-types.js";

export function bindProgress(room: StoredRoom) {
  for (const [crewId, run] of Object.entries(room.runs)) {
    // This compatibility accessor is never persisted; the match owns progression.
    Object.defineProperty(run, "progress", {
      configurable: true,
      enumerable: false,
      get: () => room.state.crewProgress[crewId],
      set: (value) => {
        room.state.crewProgress[crewId] = value;
      },
    });
  }
}
