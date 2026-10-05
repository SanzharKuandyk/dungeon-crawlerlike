import { finishMatch } from "../game/scoring.js";
import type { RoomPauseReason } from "../shared/host-types.js";
import { clockView, freezeClock, resumeClock } from "./clocks.js";
import { freezeCrewClocks, resumeCrewClocks } from "./crew-clock.js";
import { reject } from "./errors.js";
import type { StoredRoom } from "./room-types.js";

export const HOST_RECONNECT_MS = 90_000;
export function requireLiveRoom(room: StoredRoom, _now: number) {
  if (room.lifecycle.kind === "closed") reject("ROOM_CLOSED", "This expedition has ended.");
}

export function pauseRoom(room: StoredRoom, reason: RoomPauseReason, now: number) {
  if (!room.pauseReasons.includes(reason)) room.pauseReasons.push(reason);
  if (room.state.status === "running") room.state.status = "paused";
  freezeClock(room.timer, now);
  Object.assign(room, clockView(room.timer));
  freezeCrewClocks(room, now);
}

export function resumeRoom(room: StoredRoom, now: number) {
  room.pauseReasons = [];
  room.storageError = null;
  room.state.status = "running";
  if (room.state.trial || room.state.siege) {
    if (room.speed !== "manual") resumeClock(room.timer, now);
    Object.assign(room, clockView(room.timer));
  } else {
    room.deadline = null;
    resumeCrewClocks(room, now);
  }
}

export function closeSession(room: StoredRoom, now: number, reason: "ended" | "completed") {
  finishMatch(room.state);
  room.lifecycle = { kind: "closed", closedAt: now, reason };
  if (reason === "ended") room.sessions = {};
  room.deadline = null;
  room.timer.deadline = null;
  room.discovery = null;
  for (const run of Object.values(room.runs)) run.clock.deadline = null;
}

export function hostPresence(room: StoredRoom, connected: boolean, now: number) {
  if (room.lifecycle.kind === "closed") return;
  if (connected) room.lifecycle.hostDisconnectedAt = null;
  else room.lifecycle.hostDisconnectedAt ??= now;
}

export function hostExpired(room: StoredRoom, now: number) {
  return (
    ["running", "paused"].includes(room.state.status) &&
    room.lifecycle.kind === "live" &&
    room.lifecycle.hostDisconnectedAt !== null &&
    now - room.lifecycle.hostDisconnectedAt >= HOST_RECONNECT_MS &&
    !room.pauseReasons.includes("host-offline")
  );
}
