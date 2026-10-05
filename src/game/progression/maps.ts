import EVENTS from "../../../content/dungeon/events.json" with { type: "json" };
import DEFAULT_MAPS from "../../../content/dungeon/maps.json" with { type: "json" };
import DEFAULT_EVENTS from "../../../content/dungeon/shared-events.json" with { type: "json" };
import type { DungeonContent } from "../../shared/content-types.js";
import type { ExpeditionMap, MapNode, MapNodeKind } from "../../shared/map-types.js";
import { MAP_NODE_LABELS } from "../../shared/map-types.js";
import type { Chapter } from "../../shared/progression-types.js";
import type { SharedEventDefinition } from "../../shared/shared-event-types.js";
import { shuffled } from "../random.js";

export function chapterMap(content: DungeonContent, seed: number, chapter: Chapter): ExpeditionMap {
  const rows = (content.mapTemplates ?? DEFAULT_MAPS).find((m) => m.chapter === chapter)?.rows as
    | MapNodeKind[][]
    | undefined;
  if (rows?.length !== 12) throw new Error("Missing twelve-row chapter template.");
  const checkpoints = content.sharedEvents ?? (DEFAULT_EVENTS as SharedEventDefinition[]);
  const nodes: MapNode[] = [];
  rows.forEach((kinds, index) => {
    kinds.forEach((kind, laneIndex) => {
      const row = index + 1,
        lane = kinds.length === 1 ? 1 : laneIndex;
      const template = shuffled(content.rooms, seed + chapter * 101 + row * 13)[
        lane % content.rooms.length
      ];
      const id = `map-${chapter}-${row}-${lane}`;
      const event = shuffled(EVENTS, seed + chapter * 719 + row * 37)[0];
      nodes.push({
        id,
        row,
        lane,
        kind,
        nextIds: [],
        ...(kind === "event" ? { eventId: event.id as MapNode["eventId"] } : {}),
        ...(kind === "altar" || kind === "siege"
          ? { sharedEventId: checkpoints.find((e) => e.chapter === chapter && e.row === row)?.id }
          : {}),
        room: {
          ...template,
          id,
          depth: row,
          name:
            kind === "boss"
              ? chapter === 1
                ? "Iron Warden"
                : "Hollow Regent"
              : kind === "event"
                ? event.name
                : ["battle", "elite"].includes(kind)
                  ? template.name
                  : MAP_NODE_LABELS[kind],
          risk: kind === "elite" || kind === "boss" ? "high" : "low",
          description:
            kind === "camp"
              ? "Rest once, treat wounds or revive an ally. No equipment shop."
              : kind === "merchant"
                ? "Buy and upgrade equipment, treat wounds or revive. No free Rest."
                : kind === "altar"
                  ? "Scheduled class trial; inspect its status, then continue."
                  : kind === "siege"
                    ? "Work with every crew: Attack, Protect or Supply."
                    : kind === "elite"
                      ? "Harder enemies; 24 gold and a personal build choice."
                      : kind === "boss"
                        ? "Prepare your build. Defeat the boss to advance."
                        : kind === "treasure"
                          ? "12 gold and a personal build choice."
                          : kind === "event"
                            ? "Choose a personal risk, inspect the odds, or leave."
                            : kind === "arena"
                              ? "Consent only. Duel or face a champion."
                              : kind === "shrine"
                                ? "Recover health or stress."
                                : "12 gold and a personal build choice on first victory.",
        },
      });
    });
  });
  for (const node of nodes) {
    const next = nodes.filter((n) => n.row === node.row + 1);
    const current = nodes.filter((n) => n.row === node.row);
    // Converge between forks; unequal lanes connect in order without crossed edges.
    node.nextIds = next
      .filter(
        (n) =>
          next.length === 1 ||
          current.length === 1 ||
          n.lane === Math.min(node.lane, next.length - 1) ||
          (node.lane === current.length - 1 && n.lane >= node.lane),
      )
      .map((n) => n.id);
  }
  const map: ExpeditionMap = { version: "chapters-v5", chapter, rows: 12, nodes };
  validateMap(map);
  return map;
}
export function validateMap(map: ExpeditionMap) {
  const byId = new Map(map.nodes.map((n) => [n.id, n])),
    reached = new Set<string>();
  if (byId.size !== map.nodes.length || map.rows !== 12) throw new Error("Invalid chapter map.");
  const visit = (node: MapNode, fights: number, recovery: boolean, merchant: boolean): void => {
    reached.add(node.id);
    fights += ["battle", "elite"].includes(node.kind) ? 1 : 0;
    recovery ||= ["camp", "altar", "shrine"].includes(node.kind);
    merchant ||= node.kind === "merchant";
    if (node.row === map.rows) {
      if (node.kind !== "boss" || fights < (map.chapter === 1 ? 5 : 3) || !recovery || !merchant)
        throw new Error("Missing route guarantees.");
      return;
    }
    if (!node.nextIds.length) throw new Error("Dead-end route.");
    for (const id of node.nextIds) {
      const next = byId.get(id);
      if (!next || next.row !== node.row + 1) throw new Error("Disconnected route.");
      visit(next, fights, recovery, merchant);
    }
  };
  const entrances = map.nodes.filter((n) => n.row === 1);
  if (!entrances.length) throw new Error("Missing entrance.");
  for (const node of entrances) visit(node, 0, false, false);
  if (reached.size !== map.nodes.length) throw new Error("Unreachable node.");
}
