import type { TestCommand } from "../shared/host-types.js";
import type { Envelope } from "../shared/protocol.js";
import { newClock } from "./clocks.js";
import { enterCrew } from "./crew-clock.js";
import { reject } from "./errors.js";
import { progressExpedition } from "./expedition-scheduler.js";
import { advancePhase, setDeadline } from "./room-clock.js";
import type { StoredRoom } from "./room-types.js";
import { questionActive } from "./shared-event-coordinator.js";
export function testControl(
  room: StoredRoom,
  input: Envelope & { command: TestCommand },
  now: number,
) {
  if (!room.testMode) reject("UNAUTHORIZED", "Test controls are unavailable.");
  if (input.command.kind === "advance") {
    if (room.state.rulesVersion === "dungeon-v5") progressExpedition(room, now, true);
    else advancePhase(room, now);
    return;
  }
  room.speed = input.command.speed;
  setDeadline(room, now);
  if (room.state.rulesVersion === "dungeon-v5" && !questionActive(room)) {
    room.deadline = null;
    for (const run of Object.values(room.runs)) {
      if (run.finished) continue;
      const ready = run.ready;
      enterCrew(room, run, run.progress.phase, now);
      run.ready = ready;
      const duel = room.duels.find((d) => d.status === "active" && d.crewIds.includes(run.crewId));
      if (duel)
        run.clock = newClock(
          room.speed === "fast"
            ? duel.phase === "choice"
              ? 3000
              : 1000
            : duel.phase === "choice"
              ? 45000
              : 6800,
          now,
          room.speed !== "manual" && !run.pauseReasons.length && !room.pauseReasons.length,
        );
    }
  }
}
