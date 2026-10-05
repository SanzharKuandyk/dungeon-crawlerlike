import { newCrewProgress } from "../game/crew-state.js";
import type { CrewRun } from "../shared/crew-run-types.js";
import type { Phase } from "../shared/game-types.js";
import { freezeClock, newClock, resumeClock } from "./clocks.js";
import { CREW_CHOICES } from "./crew-decisions.js";
import { bindProgress } from "./progress-bindings.js";
import type { StoredRoom } from "./room-types.js";

export function enterCrew(room: StoredRoom, run: CrewRun, phase: Phase, now: number) {
  run.progress.phase = phase;
  run.progress.phaseId = ++room.decisionSerial;
  run.ready = [];
  run.absentSince = {};
  run.suspended = false;
  const choosing = CREW_CHOICES.has(phase.kind);
  const duration =
    phase.kind === "result"
      ? 60000
      : choosing
        ? phase.kind === "route"
          ? 25000
          : phase.kind === "camp"
            ? 60000
            : phase.kind === "event"
              ? 30000
              : 45000
        : phase.kind === "combat-reveal"
          ? 10000
          : phase.kind === "extraction"
            ? 4000
            : phase.kind === "combat-recap"
              ? 3000
              : phase.kind === "event-reveal"
                ? 3000
                : phase.kind === "camp-reveal"
                  ? 2000
                  : phase.kind === "arrival"
                    ? 4000
                    : 1200;
  run.clock = newClock(
    room.speed === "fast"
      ? choosing
        ? 3000
        : phase.kind === "combat-reveal"
          ? 1000
          : 500
      : duration,
    now,
    room.speed !== "manual" &&
      room.state.status === "running" &&
      !room.pauseReasons.length &&
      !run.pauseReasons.length &&
      !(room.state.trial || room.state.siege) &&
      (!choosing || room.inactivityFallback),
  );
}

export function startCrews(room: StoredRoom, now: number) {
  for (const crew of room.state.crews) {
    room.state.crewProgress[crew.id] = newCrewProgress();
    room.state.outcomeRng[crew.id] =
      (room.state.outcomeSeed ^ ((room.state.crews.indexOf(crew) + 1) * 0x9e3779b9)) >>> 0;
    room.runs[crew.id] = {
      crewId: crew.id,
      progress: room.state.crewProgress[crew.id],
      clock: newClock(0, now, false),
      pauseReasons: [],
      ready: [],
      absentSince: {},
      suspended: false,
      finished: false,
    };
  }
  bindProgress(room);
  for (const run of Object.values(room.runs)) enterCrew(room, run, { kind: "route" }, now);
  room.deadline = null;
}

export function freezeCrewClocks(room: StoredRoom, now: number) {
  for (const duel of room.duels)
    if (duel.status === "offered" && duel.remaining === null)
      duel.remaining = Math.max(0, duel.expiresAt - now);
  for (const run of Object.values(room.runs)) freezeClock(run.clock, now);
}

export function resumeCrewClocks(room: StoredRoom, now: number) {
  if (
    room.pauseReasons.length ||
    room.state.status !== "running" ||
    room.state.trial ||
    room.state.siege
  )
    return;
  for (const duel of room.duels)
    if (duel.status === "offered" && duel.remaining !== null) {
      duel.expiresAt = now + duel.remaining;
      duel.remaining = null;
    }
  for (const run of Object.values(room.runs))
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
