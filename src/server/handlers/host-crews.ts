import type { HostCommand } from "../../shared/host-types.js";
import { extendClock, freezeClock } from "../clocks.js";
import { resumeCrewClocks } from "../crew-clock.js";
import { CREW_CHOICES, eligibleMembers, fillMissingChoice } from "../crew-decisions.js";
import { advanceCrew } from "../crew-transitions.js";
import { reject } from "../errors.js";
import { questionActive } from "../question-coordinator.js";
import type { StoredRoom } from "../room-types.js";

type Command = Extract<HostCommand, { crewId: string }>;
export function hostCrewControl(room: StoredRoom, command: Command, now: number) {
  const run = room.runs[command.crewId];
  if (!run || run.finished) reject("CLOSED", "This crew has finished.");
  if (run.progress.phaseId !== command.expectedCrewPhaseId)
    reject("STALE", "This crew has moved to another phase.");
  const duel = room.duels.find((d) => d.status === "active" && d.crewIds.includes(run.crewId));
  const affected = duel ? duel.crewIds.map((id) => room.runs[id]) : [run];
  if (command.kind === "crew-pause") {
    for (const entry of affected) {
      if (!entry.pauseReasons.includes("host")) entry.pauseReasons.push("host");
      freezeClock(entry.clock, now);
    }
  } else if (command.kind === "crew-resume") {
    for (const entry of affected)
      entry.pauseReasons = entry.pauseReasons.filter((r) => r !== "host");
    resumeCrewClocks(room, now);
  } else {
    if (questionActive(room) || duel || !CREW_CHOICES.has(run.progress.phase.kind))
      reject("CLOSED", "This is not an ordinary crew decision.");
    if (command.kind === "crew-extend") {
      if (!room.inactivityFallback || room.speed === "manual")
        reject("CLOSED", "This decision has no timer.");
      extendClock(run.clock, 30000, now);
    } else {
      if (room.state.status !== "running" || run.pauseReasons.length)
        reject("PAUSED", "Resume before resolving choices.");
      for (const id of eligibleMembers(room, run)) {
        const phase = run.progress.phase.kind;
        const hasInput =
          phase === "combat"
            ? run.progress.actions[id] !== undefined
            : phase === "route"
              ? run.progress.routeVotes[id] !== undefined
              : phase === "camp"
                ? run.progress.campVotes[id] !== undefined
                : run.progress.equipmentChoices[id] !== undefined;
        if (!hasInput) fillMissingChoice(room, run, id);
        if (!run.ready.includes(id)) run.ready.push(id);
      }
      advanceCrew(room, run, now);
    }
  }
}
