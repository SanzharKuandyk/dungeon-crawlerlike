import { crewProgress } from "../game/crew-state.js";
import type { CrewRun } from "../shared/crew-run-types.js";
import type { Phase } from "../shared/game-types.js";
import { freezeClock, newClock, resumeClock } from "./clocks.js";
import { CREW_CHOICES } from "./crew-decisions.js";
import type { StoredRoom } from "./room-types.js";

export function enterCrew(room: StoredRoom, run: CrewRun, phase: Phase, now: number) {
  run.progress.phase = phase;
  run.progress.phaseId = ++room.decisionSerial;
  run.ready = [];
  run.absentSince = {};
  run.suspended = false;
  const choosing = CREW_CHOICES.has(phase.kind);
  const duration = choosing
    ? 60000
    : phase.kind === "combat-reveal"
      ? run.progress.events.some((event) => event.cause === "death" || event.cause === "interrupt")
        ? 8000
        : 6800
      : 1200;
  run.clock = newClock(
    room.speed === "fast" ? (choosing ? 3000 : 500) : duration,
    now,
    room.speed !== "manual" &&
      room.state.status === "running" &&
      !room.pauseReasons.length &&
      !run.pauseReasons.length &&
      !room.state.quizQuestionId &&
      (!choosing || room.inactivityFallback),
  );
}

export function startCrews(room: StoredRoom, now: number) {
  room.decisionSerial = Math.max(room.decisionSerial, room.state.phaseId);
  for (const crew of room.state.crews) {
    const run: CrewRun = {
      crewId: crew.id,
      progress: structuredClone(crewProgress(room.state)),
      clock: newClock(0, now, false),
      pauseReasons: [],
      ready: [],
      absentSince: {},
      suspended: false,
      finished: false,
      rewardCharges: null,
    };
    room.runs[crew.id] = run;
    enterCrew(room, run, { kind: "route" }, now);
  }
  room.deadline = null;
}

export function freezeCrewClocks(room: StoredRoom, now: number) {
  for (const duel of room.duels)
    if (duel.status === "offered" && duel.remaining === null)
      duel.remaining = Math.max(0, duel.expiresAt - now);
  for (const run of Object.values(room.runs)) freezeClock(run.clock, now);
}
export function resumeCrewClocks(room: StoredRoom, now: number) {
  if (room.pauseReasons.length || room.state.status !== "running" || room.state.quizQuestionId)
    return;
  for (const duel of room.duels)
    if (duel.status === "offered" && duel.remaining !== null) {
      duel.expiresAt = now + duel.remaining;
      duel.remaining = null;
    }
  for (const run of Object.values(room.runs)) {
    if (
      !run.pauseReasons.length &&
      !run.suspended &&
      !run.finished &&
      room.speed !== "manual" &&
      (!CREW_CHOICES.has(run.progress.phase.kind) ||
        room.inactivityFallback ||
        room.duels.some((d) => d.status === "active" && d.crewIds.includes(run.crewId)))
    )
      resumeClock(run.clock, now);
  }
}
