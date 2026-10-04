import EVENTS from "../../../content/dungeon/events.json" with { type: "json" };
import type { DungeonContent } from "../../shared/content-types.js";
import type { ExpeditionMap, MapNode, MapNodeKind } from "../../shared/map-types.js";
import type { Chapter } from "../../shared/progression-types.js";
import { shuffled } from "../random.js";

const ROWS: MapNodeKind[][] = [
  ["battle"],
  ["merchant", "treasure", "event"],
  ["battle", "battle", "elite"],
  ["altar"],
  ["camp", "merchant", "arena"],
  ["camp", "camp", "elite"],
  ["boss"],
];
const BOSSES = ["Iron Warden", "Choir of Ash", "Hollow Regent"];
const LABELS: Record<MapNodeKind, string> = {
  battle: "Battle",
  elite: "Elite",
  merchant: "Merchant",
  treasure: "Forgotten cache",
  event: "Strange fountain",
  altar: "Trial altar",
  shrine: "Recovery shrine",
  camp: "Wayside camp",
  arena: "Arena",
  boss: "Boss",
};

export function chapterMap(content: DungeonContent, seed: number, chapter: Chapter): ExpeditionMap {
  const nodes: MapNode[] = [];
  ROWS.forEach((kinds, index) => {
    kinds.forEach((original, laneIndex) => {
      const row = index + 1;
      const lane = kinds.length === 1 ? 1 : laneIndex;
      const kind = original === "altar" && chapter === 3 ? "shrine" : original;
      const template = shuffled(content.rooms, seed + chapter * 101 + row * 13)[lane];
      const id = `map-${chapter}-${row}-${lane}`;
      const event = shuffled(EVENTS, seed + chapter * 719)[0];
      nodes.push({
        id,
        row,
        lane,
        kind,
        ...(kind === "event" ? { eventId: event.id as MapNode["eventId"] } : {}),
        nextIds: [],
        room: {
          ...template,
          id,
          depth: row,
          name:
            kind === "event"
              ? event.name
              : kind === "boss"
                ? BOSSES[chapter - 1]
                : ["battle", "elite"].includes(kind)
                  ? template.name
                  : LABELS[kind],
          risk: kind === "elite" || kind === "boss" ? "high" : "low",
          description:
            kind === "altar" || kind === "shrine"
              ? "Recovery and supplies; every route converges here."
              : kind === "arena"
                ? "Optional consent duel. No surprise attacks."
                : kind === "merchant"
                  ? "Frozen stock; your own spending allowance."
                  : kind === "event"
                    ? "Inspect the odds before choosing."
                    : kind === "elite"
                      ? "More danger; 24 gold."
                      : kind === "boss"
                        ? "Defeat the chapter boss to advance."
                        : kind === "treasure"
                          ? "12 gold, once."
                          : kind === "camp"
                            ? "Rest, treat injuries, or revive."
                            : "12 gold on victory.",
        },
      });
    });
  });
  for (const node of nodes) {
    const next = nodes.filter((n) => n.row === node.row + 1);
    node.nextIds = next
      .filter((n) => next.length === 1 || ROWS[node.row - 1].length === 1 || n.lane === node.lane)
      .map((n) => n.id);
  }
  const map: ExpeditionMap = { version: "chapters-v3", chapter, rows: 7, nodes };
  validateMap(map);
  return map;
}

export function validateMap(map: ExpeditionMap) {
  const byId = new Map(map.nodes.map((n) => [n.id, n]));
  const reached = new Set<string>();
  const entrances = map.nodes.filter((n) => n.row === 1);
  if (!entrances.length) throw new Error("Missing dungeon entrance");
  const visit = (node: MapNode, fights: number, recovery: boolean, merchant: boolean): void => {
    reached.add(node.id);
    fights += node.kind === "battle" || node.kind === "elite" ? 1 : 0;
    recovery ||= ["camp", "altar", "shrine"].includes(node.kind);
    merchant ||= ["merchant", "altar", "shrine"].includes(node.kind);
    if (node.row === 7) {
      if (node.kind !== "boss" || fights < 2 || !recovery || !merchant)
        throw new Error("Invalid route guarantees");
      return;
    }
    if (!node.nextIds.length) throw new Error("Dead-end route");
    for (const id of node.nextIds) {
      const next = byId.get(id);
      if (!next || next.row !== node.row + 1) throw new Error("Disconnected route");
      visit(next, fights, recovery, merchant);
    }
  };
  for (const node of map.nodes.filter((n) => n.row === 1)) visit(node, 0, false, false);
  if (reached.size !== map.nodes.length) throw new Error("Unreachable map node");
  if (byId.size !== map.nodes.length) throw new Error("Duplicate map nodes");
}
