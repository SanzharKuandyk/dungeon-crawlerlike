import { CREW_CHOICES } from "./crew-decisions.js";
import type { StoredRoom } from "./room-types.js";
export function hostCapabilities(room: StoredRoom) {
  return {
    crews: Object.values(room.runs).map((run) => {
      const duel = room.duels.some((d) => d.status === "active" && d.crewIds.includes(run.crewId));
      const ordinary =
        !room.state.quizQuestionId &&
        !duel &&
        CREW_CHOICES.has(run.progress.phase.kind) &&
        !run.finished;
      const extendReason = !ordinary
        ? "Ordinary decisions only"
        : !room.inactivityFallback || room.speed === "manual"
          ? "This decision has no timer"
          : null;
      const resolveReason = !ordinary
        ? "Ordinary decisions only"
        : room.state.status !== "running" || run.pauseReasons.length
          ? "Resume before resolving"
          : null;
      return { crewId: run.crewId, extendReason, resolveReason };
    }),
  };
}
