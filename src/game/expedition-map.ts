import type { DungeonContent } from "../shared/content-types.js";
import type { Crew, MatchState } from "../shared/game-types.js";
import { chapterMap } from "./progression/maps.js";
export const CHAPTER_ROWS = 7;
export const createExpeditionMap = (content: DungeonContent, seed: number, chapter = 1) =>
  chapterMap(content, seed, chapter as 1 | 2 | 3);
export function currentMapNode(state: MatchState, crew: Crew) {
  return state.chapterMaps[(crew.mapPosition?.chapter ?? 1) - 1]?.nodes.find(
    (n) => n.id === crew.mapPosition?.nodeId,
  );
}
export function reachableNodes(state: MatchState, crewId: string) {
  const crew = state.crews.find((c) => c.id === crewId);
  const p = state.crewProgress[crewId];
  if (crew?.status !== "active" || !p) return [];
  const map = state.chapterMaps[p.chapter - 1],
    current = map.nodes.find((n) => n.id === p.nodeId);
  return map.nodes.filter((n) => (current ? current.nextIds.includes(n.id) : n.row === 1));
}
export function campAvailable(state: MatchState, crew: Crew) {
  return state.crewProgress[crew.id]?.phase.kind === "camp";
}
export function moveToNextMapRow(_state: MatchState) {
  throw new Error("Chapter progression belongs to the crew.");
}
