import type { Hero, MatchState } from "../shared/game-types.js";
export function offerRooms(s: MatchState) {
  s.offeredRooms = s.chapterMaps[0].nodes.filter((n) => n.row === 1).map((n) => n.room);
}
export function encounterFor(s: MatchState, h: Hero) {
  return s.encounters.find((e) => e.id === s.crewProgress[h.crewId]?.encounterId);
}
export function fighting(s: MatchState, h: Hero) {
  return h.status === "alive" && encounterFor(s, h)?.status === "active";
}
export function resolveRoutes(_s: MatchState) {
  throw new Error("Use the canonical crew transition.");
}
