import { DURATIONS } from "../shared/constants.js";
import type { Phase } from "../shared/game-types.js";
import { clockView, newClock } from "./clocks.js";
import { progressExpedition } from "./expedition-scheduler.js";
import type { StoredRoom } from "./room-types.js";
export function setDeadline(room: StoredRoom, now: number) {
  const duration = DURATIONS[room.speed === "fast" ? "fast" : "normal"][room.state.phase.kind];
  room.timer = newClock(
    duration,
    now,
    room.speed !== "manual" && room.state.status === "running" && !room.pauseReasons.length,
  );
  Object.assign(room, clockView(room.timer));
}
export function enter(room: StoredRoom, phase: Phase, now: number) {
  room.state.phase = phase;
  room.state.phaseId++;
  setDeadline(room, now);
}
export function advancePhase(room: StoredRoom, now: number) {
  progressExpedition(room, now, true);
}
