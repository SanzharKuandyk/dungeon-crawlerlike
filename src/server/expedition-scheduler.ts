import {
  allReady,
  CREW_CHOICES,
  eligibleMembers,
  fillMissingChoice,
  updateCrewPresence,
} from "./crew-decisions.js";
import { advanceCrew } from "./crew-transitions.js";
import { duelHolds, duelsDue, progressDuels } from "./duel-coordinator.js";
import { closeSession } from "./room-lifecycle.js";
import type { StoredRoom } from "./room-types.js";
import {
  advanceQuestion,
  beginQuestion,
  questionActive,
  questionReady,
} from "./shared-event-coordinator.js";

export function progressExpedition(room: StoredRoom, now: number, force = false) {
  if (room.state.status !== "running") return;
  if (questionActive(room)) {
    if (
      force ||
      (room.speed !== "manual" &&
        (questionReady(room) || (room.deadline !== null && room.deadline <= now)))
    )
      advanceQuestion(room, now);
    return;
  }

  for (const run of Object.values(room.runs)) updateCrewPresence(room, run, now);
  progressDuels(room, now, force);

  for (const run of Object.values(room.runs)) {
    if (duelHolds(room, run.crewId)) continue;
    if (run.finished) continue;
    updateCrewPresence(room, run, now);
    if (run.pauseReasons.includes("host") || (!force && run.pauseReasons.length)) continue;
    const choosing = CREW_CHOICES.has(run.progress.phase.kind);
    if (choosing && room.discovery) continue;
    if (!force && (room.speed === "manual" || run.suspended)) continue;
    const expired = run.clock.deadline !== null && run.clock.deadline <= now;
    if (!force && !(choosing && allReady(room, run)) && !expired) continue;
    if (choosing && (force || expired)) {
      for (const id of eligibleMembers(room, run)) {
        if (!run.ready.includes(id)) fillMissingChoice(room, run, id);
      }
    }
    advanceCrew(room, run, now);
  }

  beginQuestion(room, now);

  if (
    !room.discovery &&
    !questionActive(room) &&
    Object.values(room.runs).length &&
    Object.values(room.runs).every((run) => run.finished)
  ) {
    room.discovery = null;
    closeSession(room, now, "completed");
    room.deadline = null;
  }
}

export function expeditionDue(room: StoredRoom, now: number) {
  if (room.state.status !== "running" || room.speed === "manual") return false;
  if (questionActive(room))
    return questionReady(room) || (room.deadline !== null && room.deadline <= now);

  return (
    duelsDue(room, now) ||
    Object.values(room.runs).some(
      (run) =>
        !run.finished &&
        !run.pauseReasons.length &&
        !duelHolds(room, run.crewId) &&
        ((run.clock.deadline !== null && run.clock.deadline <= now) ||
          (!room.discovery &&
            !run.suspended &&
            CREW_CHOICES.has(run.progress.phase.kind) &&
            allReady(room, run)) ||
          (!run.suspended &&
            Object.entries(run.absentSince).some(
              ([id, since]) => !run.ready.includes(id) && now - since >= 15000,
            ))),
    )
  );
}
