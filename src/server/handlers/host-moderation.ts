import type { HostCommand } from "../../shared/host-types.js";
import { cancelDuel } from "../duel-coordinator.js";
import { reject } from "../errors.js";
import { skipQuestion } from "../question-coordinator.js";
import type { StoredRoom } from "../room-types.js";
export function hostModeration(
  room: StoredRoom,
  command: Extract<HostCommand, { kind: "duel-cancel" | "question-skip" }>,
  now: number,
) {
  if (command.kind === "question-skip") {
    if (room.state.trial?.id !== command.questionId) reject("STALE", "This question changed.");
    if (!room.state.trial) reject("CLOSED", "No trial is active.");
    skipQuestion(room, now);
  } else {
    const duel = room.duels.find((d) => d.id === command.duelId);
    if (duel?.status !== "active" || (duel.turn === 3 && duel.phase === "reveal"))
      reject("CLOSED", "This duel has already settled.");
    if (duel.turn !== command.expectedTurn || duel.phase !== command.expectedDuelPhase)
      reject("STALE", "This duel changed.");
    cancelDuel(room, duel, now);
  }
}
