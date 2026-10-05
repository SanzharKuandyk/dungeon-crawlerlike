import type { RoomDefinition } from "./content-types.js";

export type MapNodeKind =
  | "battle"
  | "elite"
  | "camp"
  | "treasure"
  | "event"
  | "boss"
  | "merchant"
  | "altar"
  | "arena"
  | "shrine"
  | "siege";

export type MapNode = {
  sharedEventId?: import("./shared-event-types.js").SharedEventId;
  eventId?: "coin-fountain" | "trapped-cache" | "sacrificial-altar" | "quiet-shrine";
  id: string;
  row: number;
  lane: number;
  kind: MapNodeKind;
  room: RoomDefinition;
  nextIds: string[];
};

export type ExpeditionMap = {
  version: "branching-v1" | "chapters-v3" | "chapters-v5";
  chapter: number;
  rows: number;
  nodes: MapNode[];
};

export type MapPosition = {
  chapter: number;
  nodeId: string | null;
  trail: string[];
};

export const MAP_NODE_LABELS: Record<MapNodeKind, string> = {
  siege: "Class siege",
  merchant: "Merchant",
  altar: "Trial altar",
  arena: "Arena",
  shrine: "Recovery shrine",
  battle: "Battle",
  elite: "Elite",
  camp: "Camp",
  treasure: "Treasure",
  event: "Mystery",
  boss: "Guardian",
};
