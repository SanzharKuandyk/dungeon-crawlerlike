import type { RoomDefinition } from "./content-types.js";

export type MapNodeKind = "battle" | "elite" | "camp" | "treasure" | "event" | "boss";

export type MapNode = {
  id: string;
  row: number;
  lane: number;
  kind: MapNodeKind;
  room: RoomDefinition;
  nextIds: string[];
};

export type ExpeditionMap = {
  version: "branching-v1";
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
  battle: "Battle",
  elite: "Elite",
  camp: "Camp",
  treasure: "Treasure",
  event: "Mystery",
  boss: "Guardian",
};
