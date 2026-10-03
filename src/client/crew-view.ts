import type { RoomView } from "../shared/view-types.js";

export function crewView(view: RoomView, crewId: string): RoomView {
  const run = view.crewRuns.find((entry) => entry.crewId === crewId);
  if (!view.independent || view.quizActive || !run) return view;
  return {
    ...view,
    status: run.pauseReasons.length ? "paused" : view.status,
    deadline: run.clock.deadline,
    remaining: run.clock.deadline === null ? run.clock.remainingMs : null,
    phaseStartedAt: run.clock.startedAt,
    phaseDuration: run.clock.durationMs,
    depth: run.depth,
    turn: run.turn,
    phase: run.phase,
    phaseId: run.phaseId,
    before: run.before,
    events: run.events,
  };
}
