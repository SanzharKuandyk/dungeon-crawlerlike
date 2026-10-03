import { actionKey, legalActions } from "../../game/action-options.js";
import { fighting } from "../../game/routes.js";
import type { HeroAction } from "../../shared/command-types.js";
import type { PhaseKind } from "../../shared/game-types.js";
import { reject } from "../errors.js";
import type { StoredRoom } from "../room-types.js";

export function requirePhase(room: StoredRoom, kind: PhaseKind, now: number) {
  if (room.state.status !== "running" || room.state.phase.kind !== kind)
    reject("CLOSED", "That decision is not open.");
  if (room.deadline !== null && now >= room.deadline) reject("CLOSED", "The deadline has passed.");
}
export function ownedHero(room: StoredRoom, playerId: string) {
  const h = room.state.heroes.find((h) => h.playerId === playerId);
  if (!h) reject("INVALID", "No character belongs to this session.");
  return h;
}
export function submitAction(room: StoredRoom, playerId: string, action: HeroAction, now: number) {
  requirePhase(room, "combat", now);
  const h = ownedHero(room, playerId);
  if (!legalActions(room.state, h).some((a) => actionKey(a) === actionKey(action)))
    reject("INVALID", "That action or target is not available to your character.");
  room.state.actions[playerId] = action;
}
export function voteWithdraw(room: StoredRoom, playerId: string, withdraw: boolean, now: number) {
  requirePhase(room, "combat", now);
  const h = ownedHero(room, playerId);
  if (!fighting(room.state, h))
    reject("INVALID", "Only fighting characters can request withdrawal.");
  room.state.withdrawVotes[playerId] = withdraw;
}
