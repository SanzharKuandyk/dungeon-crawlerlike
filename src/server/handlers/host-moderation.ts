import type { HostCommand } from "../../shared/host-types.js";
import { cancelDuel } from "../duel-coordinator.js";
import { reject } from "../errors.js";
import type { StoredRoom } from "../room-types.js";
import { selectPending, skipQuestion } from "../shared-event-coordinator.js";
export function hostModeration(
  room: StoredRoom,
  command: Extract<HostCommand, { kind: "duel-cancel" | "question-skip" }>,
  now: number,
) {
  if (command.kind === "question-skip") {
    const pending = room.state.sharedEvents.find(
      (e) => e.id === command.questionId && e.status === "pending",
    );
    if (pending && !(room.state.trial || room.state.siege)) {
      pending.status = "skipped";
      room.discovery = null;
      selectPending(room);
      return;
    }
    if ((room.state.trial?.id ?? room.state.siege?.id) !== command.questionId)
      reject("STALE", "This shared event changed.");
    if (!(room.state.trial || room.state.siege)) reject("CLOSED", "No trial is active.");
    skipQuestion(room, now, true);
  } else {
    const duel = room.duels.find((d) => d.id === command.duelId);
    if (duel?.status !== "active" || (duel.turn === 3 && duel.phase === "reveal"))
      reject("CLOSED", "This duel has already settled.");
    if (duel.turn !== command.expectedTurn || duel.phase !== command.expectedDuelPhase)
      reject("STALE", "This duel changed.");
    cancelDuel(room, duel, now);
  }
}
