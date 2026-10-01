import { activeQuestion } from "../../game/learning.js";
import type { EquipmentChoice } from "../../shared/command-types.js";
import { reject } from "../errors.js";
import type { StoredRoom } from "../room-types.js";
import { ownedHero, requirePhase } from "./hero-actions.js";
export function answerQuestion(
  room: StoredRoom,
  playerId: string,
  questionId: string,
  choice: number,
  now: number,
) {
  requirePhase(room, "question", now);
  const q = activeQuestion(room.state);
  if (
    !q ||
    q.id !== questionId ||
    !Number.isInteger(choice) ||
    choice < 0 ||
    choice >= q.choices.length
  )
    reject("INVALID", "Choose an answer for the active question.");
  if (!room.state.players.some((p) => p.id === playerId && p.crewId))
    reject("UNAUTHORIZED", "Join a crew first.");
  if (room.state.answers[playerId] !== undefined)
    reject("CONFLICT", "Your answer is already locked.");
  room.state.answers[playerId] = choice;
}
export function chooseEquipment(
  room: StoredRoom,
  playerId: string,
  item: EquipmentChoice,
  now: number,
) {
  requirePhase(room, "equipment", now);
  const h = ownedHero(room, playerId);
  const result = room.state.quizResults.find((r) => r.crewId === h.crewId);
  if (h.status !== "alive" || !result || result.tier === "none")
    reject("INVALID", "Your character has no equipment reward.");
  if (item === "keep" && !h.equipment) reject("INVALID", "There is no equipment to keep.");
  room.state.equipmentChoices[playerId] = item;
}
