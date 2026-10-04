import { actionKey, legalActions } from "../../game/action-options.js";
import { fighting } from "../../game/routes.js";
import type { HeroAction } from "../../shared/command-types.js";
import type { PhaseKind } from "../../shared/game-types.js";
import { playerRun } from "../crew-decisions.js";
import { reject } from "../errors.js";
import type { StoredRoom } from "../room-types.js";
export function requirePhase(room: StoredRoom, kind: PhaseKind, now: number, playerId?: string) {
  const run = playerId ? playerRun(room, playerId) : undefined;
  if (
    room.state.status !== "running" ||
    (run?.progress.phase.kind ?? room.state.phase.kind) !== kind ||
    room.state.trial
  )
    reject("CLOSED", "That decision is not open.");
  const deadline = run?.clock.deadline ?? room.deadline;
  if (deadline !== null && now >= deadline) reject("CLOSED", "The deadline has passed.");
}
export function ownedHero(room: StoredRoom, playerId: string) {
  const hero = room.state.heroes.find((h) => h.playerId === playerId);
  if (!hero) reject("INVALID", "No character belongs to this session.");
  return hero;
}
export function submitAction(room: StoredRoom, id: string, action: HeroAction, now: number) {
  requirePhase(room, "combat", now, id);
  const hero = ownedHero(room, id);
  if (!legalActions(room.state, hero).some((a) => actionKey(a) === actionKey(action)))
    reject("INVALID", "That action or target is unavailable.");
  room.state.crewProgress[hero.crewId].actions[id] = action;
}
export function voteWithdraw(room: StoredRoom, id: string, withdraw: boolean, now: number) {
  requirePhase(room, "combat", now, id);
  const hero = ownedHero(room, id);
  if (!fighting(room.state, hero)) reject("INVALID", "Only fighting characters may withdraw.");
  room.state.crewProgress[hero.crewId].withdrawVotes[id] = withdraw;
}
