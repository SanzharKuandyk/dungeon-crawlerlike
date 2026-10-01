import type { CampChoice } from "../../shared/command-types.js";
import { reject } from "../errors.js";
import type { StoredRoom } from "../room-types.js";
import { ownedHero, requirePhase } from "./hero-actions.js";
export function voteRoute(room: StoredRoom, playerId: string, roomId: string, now: number) {
  requirePhase(room, "route", now);
  if (ownedHero(room, playerId).status !== "alive")
    reject("INVALID", "Spirits cannot choose the crew's route.");
  if (!room.state.offeredRooms.some((r) => r.id === roomId))
    reject("INVALID", "Choose an offered room.");
  room.state.routeVotes[playerId] = roomId;
}
export function voteCamp(room: StoredRoom, playerId: string, choice: CampChoice, now: number) {
  requirePhase(room, "camp", now);
  if (ownedHero(room, playerId).status !== "alive")
    reject("INVALID", "Spirits cannot choose the crew's camp action.");
  room.state.campVotes[playerId] = choice;
}
