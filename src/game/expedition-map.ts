import type { DungeonContent } from "../shared/content-types.js";
import type { Crew, MatchState } from "../shared/game-types.js";
import type { ExpeditionMap, MapNode, MapNodeKind } from "../shared/map-types.js";
import { shuffled } from "./random.js";

export const CHAPTER_ROWS = 10;

function nodeKind(row: number, lane: number, seed: number): MapNodeKind {
  if (row === CHAPTER_ROWS) return "boss";
  if (row === 1) return "battle";
  if ((row === 2 || row === 6) && lane === 1) return "camp";
  if (row === 4 || row === 8) return lane === 1 ? "camp" : lane === 0 ? "battle" : "elite";

  return shuffled<MapNodeKind>(["battle", "treasure", row % 2 ? "elite" : "event"], seed)[lane];
}

export function createExpeditionMap(
  content: DungeonContent,
  seed: number,
  chapter = 1,
): ExpeditionMap {
  const nodes: MapNode[] = [];

  for (let row = 1; row <= CHAPTER_ROWS; row++) {
    const templates = shuffled(
      content.rooms.filter((room) => room.depth === ((row - 1) % 5) + 1),
      seed + chapter * 97 + row,
    );

    for (const lane of row === CHAPTER_ROWS ? [1] : [0, 1, 2]) {
      const kind = nodeKind(row, lane, seed + chapter * 131 + row);
      const template = templates[lane % templates.length];
      const id = `map-${chapter}-${row}-${lane}`;
      const names = {
        camp: "Wayside camp",
        treasure: "Forgotten cache",
        event: "Uncharted chamber",
        elite: `Elite · ${template.name}`,
        boss: `Chapter ${chapter} guardian`,
        battle: template.name,
      };
      const descriptions = {
        camp: "Vote to heal, secure treasure, or take a bargain for the next room.",
        treasure: "Collect carried treasure and a fresh equipment charge without a fight.",
        event: "An unknown encounter: a hidden cache, a healing shrine, or an ambush.",
        elite: "A tougher enemy guards a larger treasure purse.",
        boss: "Face the guardian, then rest or bank treasure before the next chapter.",
        battle: template.description,
      };

      nodes.push({
        id,
        row,
        lane,
        kind,
        room: {
          ...template,
          id,
          depth: (chapter - 1) * CHAPTER_ROWS + row,
          name: names[kind],
          description: descriptions[kind],
          risk: kind === "elite" || kind === "boss" ? "high" : template.risk,
        },
        nextIds: [],
      });
    }
  }

  for (const node of nodes) {
    const next = nodes.filter((candidate) => candidate.row === node.row + 1);
    const direction =
      node.lane === 0 ? 1 : node.lane === 2 ? -1 : (seed + chapter + node.row) % 2 ? -1 : 1;
    node.nextIds = next
      .filter(
        (candidate) =>
          node.row === CHAPTER_ROWS - 1 ||
          candidate.lane === node.lane ||
          candidate.lane === Math.max(0, Math.min(2, node.lane + direction)),
      )
      .map((candidate) => candidate.id);
  }

  return { version: "branching-v1", chapter, rows: CHAPTER_ROWS, nodes };
}

export function currentMapNode(s: MatchState, crew: Crew) {
  return s.expeditionMap?.nodes.find((node) => node.id === crew.mapPosition?.nodeId);
}

export function reachableNodes(s: MatchState, crewId: string): MapNode[] {
  const map = s.expeditionMap;
  if (!map) return [];

  const crew = s.crews.find((candidate) => candidate.id === crewId);
  if (crew?.status !== "active") return [];

  const current = currentMapNode(s, crew);
  return map.nodes.filter((node) => (current ? current.nextIds.includes(node.id) : node.row === 1));
}

export function campAvailable(s: MatchState, crew: Crew) {
  if (!s.expeditionMap) return crew.status === "active";

  const node = currentMapNode(s, crew);
  return crew.status === "active" && (node?.kind === "camp" || node?.kind === "boss");
}

export function moveToNextMapRow(s: MatchState) {
  const map = s.expeditionMap;
  if (!map) return;

  s.depth++;

  if ((s.depth - 1) % CHAPTER_ROWS === 0) {
    s.expeditionMap = createExpeditionMap(s.content, s.seed, map.chapter + 1);

    for (const crew of s.crews.filter((crew) => crew.status === "active")) {
      crew.mapPosition = { chapter: map.chapter + 1, nodeId: null, trail: [] };
    }
  }
}
