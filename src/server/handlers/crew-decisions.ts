import { campAvailable, reachableNodes } from "../../game/expedition-map.js";
import type { CampChoice } from "../../shared/command-types.js";
import { reject } from "../errors.js";
import type { StoredRoom } from "../room-types.js";
import { ownedHero, requirePhase } from "./hero-actions.js";

export function voteRoute(room: StoredRoom, playerId: string, roomId: string, now: number) {
  requirePhase(room, "route", now);
  if (ownedHero(room, playerId).status !== "alive")
    reject("INVALID", "Spirits cannot choose the crew's route.");
  const hero = ownedHero(room, playerId);
  const offered = room.state.expeditionMap
    ? reachableNodes(room.state, hero.crewId).map((node) => node.id)
    : room.state.offeredRooms.map((r) => r.id);

  if (!offered.includes(roomId)) reject("INVALID", "Choose an offered room.");
  room.state.routeVotes[playerId] = roomId;
}

export function voteCamp(room: StoredRoom, playerId: string, choice: CampChoice, now: number) {
  requirePhase(room, "camp", now);
  if (ownedHero(room, playerId).status !== "alive")
    reject("INVALID", "Spirits cannot choose the crew's camp action.");
  const crew = room.state.crews.find((crew) => crew.id === ownedHero(room, playerId).crewId);

  if (!crew || !campAvailable(room.state, crew))
    reject("INVALID", "Your crew has not reached a camp.");
  room.state.campVotes[playerId] = choice;
}
