import { startMatch } from "../../game/create-match.js";
import { finishMatch } from "../../game/scoring.js";
import type { HostInput } from "../../shared/protocol.js";
import { reject } from "../errors.js";
import { advancePhase, enter, setDeadline } from "../room-clock.js";
import type { StoredRoom } from "../room-types.js";
export function hostControl(room: StoredRoom, input: HostInput, now: number) {
  const s = room.state;
  switch (input.action) {
    case "start":
      startMatch(s);
      enter(room, { kind: "route" }, now);
      break;
    case "pause":
      if (s.status !== "running") reject("CLOSED", "The match is not running.");
      room.remaining = room.deadline === null ? null : Math.max(0, room.deadline - now);
      room.deadline = null;
      s.status = "paused";
      break;
    case "resume":
      if (s.status !== "paused") reject("CLOSED", "The match is not paused.");
      s.status = "running";
      room.deadline = room.speed === "manual" ? null : now + (room.remaining ?? room.phaseDuration);
      room.phaseStartedAt = now - (room.phaseDuration - (room.remaining ?? room.phaseDuration));
      room.remaining = null;
      break;
    case "end":
      finishMatch(s);
      room.deadline = null;
      break;
    case "learning":
      if (s.status !== "lobby") reject("CLOSED", "Choose learning before starting.");
      s.learningEnabled = input.enabled ?? true;
      break;
    case "advance":
      if (!room.testMode) reject("UNAUTHORIZED", "Stepping is available only in test mode.");
      advancePhase(room, now);
      break;
    case "speed":
      if (!room.testMode) reject("UNAUTHORIZED", "Speed controls are available only in test mode.");
      room.speed = input.speed ?? "normal";
      setDeadline(room, now);
      break;
  }
}
