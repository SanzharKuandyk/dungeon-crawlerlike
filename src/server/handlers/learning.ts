import { activeQuestion, personalReward } from "../../game/learning.js";
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
  pact: "careful" | "blood" = "careful",
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
  if (!["careful", "blood"].includes(pact)) reject("INVALID", "Choose a valid pact.");
  const hero = room.state.heroes.find((hero) => hero.playerId === playerId);
  if (pact === "blood" && (hero?.status !== "alive" || hero.hp <= hero.power))
    reject("INVALID", "The blood pact needs more health than its cost.");
  room.state.answerPacts[playerId] = pact;
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
  const spoils =
    room.state.phase.kind === "equipment" && room.state.phase.questionId.startsWith("spoils:")
      ? room.runs[h.crewId]?.rewardCharges
      : null;
  if (h.status !== "alive" || (!spoils && personalReward(room.state, playerId) === null))
    reject("INVALID", "Your character has no equipment reward.");
  if (item === "keep" && !h.equipment) reject("INVALID", "There is no equipment to keep.");
  room.state.equipmentChoices[playerId] = item;
}
