import type { BlessingKind } from "../../shared/condition-types.js";
import type { WagerLevel } from "../../shared/trial-types.js";
import { reject } from "../errors.js";
import type { StoredRoom } from "../room-types.js";
export function trialInput(room: StoredRoom, trialId: string, kind: string) {
  const trial = room.state.trial;
  if (
    room.state.status !== "running" ||
    !trial ||
    trial.id !== trialId ||
    trial.phase.kind !== kind
  )
    reject("CLOSED", "This trial decision is closed.");
  return trial;
}
export function voteTrial(room: StoredRoom, id: string, trialId: string, tileId: string) {
  const t = trialInput(room, trialId, "board-vote");
  if (!t.tiles.some((v) => v.id === tileId && !t.usedValues.includes(v.value)))
    reject("INVALID", "Choose an available tile.");
  t.votes[id] = tileId;
}
export function wagerTrial(room: StoredRoom, id: string, trialId: string, wager: WagerLevel) {
  const t = trialInput(room, trialId, "wager");
  if (t.wagers[id] !== undefined) reject("CONFLICT", "Your wager is committed.");
  t.wagers[id] = wager;
}
export function answerTrial(
  room: StoredRoom,
  id: string,
  trialId: string,
  questionId: string,
  choice: number,
) {
  const t = trialInput(room, trialId, "answer");
  if (!("questionId" in t.phase) || t.phase.questionId !== questionId)
    reject("STALE", "The question changed.");
  if (t.answers[id] !== undefined) reject("CONFLICT", "Your answer is final.");
  if (!Number.isInteger(choice) || choice < 0 || choice > 3)
    reject("INVALID", "Choose one answer.");
  t.answers[id] = choice;
}
export function chooseBlessing(
  room: StoredRoom,
  id: string,
  trialId: string,
  offerId: string,
  replace: BlessingKind | null,
) {
  const t = trialInput(room, trialId, "blessing-choice");
  if (t.choices[id]) reject("CONFLICT", "Your reward is committed.");
  const hero = room.state.heroes.find((h) => h.playerId === id);
  if (offerId === "decline") {
    t.choices[id] = "decline";
    return;
  }
  const offer = t.offers[id]?.find((o) => o.id === offerId);
  if (!hero || !offer) reject("INVALID", "Choose your own reward offer.");
  if (
    !hero.conditions.blessings.some((b) => b.kind === offer.kind) &&
    hero.conditions.blessings.length >= 2 &&
    !hero.conditions.blessings.some((b) => b.kind === replace)
  )
    reject("INVALID", "Choose a Blessing to replace.");
  t.choices[id] = `${offerId}|${replace ?? ""}`;
}
