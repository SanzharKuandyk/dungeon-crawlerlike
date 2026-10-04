import type { ItemKind } from "./inventory-types.js";
export type TurnSummary = {
  id: string;
  turn: number;
  entries: { actor: string | null; message: string }[];
};
export type TransactionFeedback = {
  requestId: string;
  operation: "buy" | "equip" | "inventory" | "treat" | "reward";
  item: ItemKind | null;
  paid: number;
  destination: string;
};
export type ActionPresentation = {
  label: string;
  actorId: string;
  targetId: string | null;
  damage: number;
  healing: number;
  protection: number;
  stress: number;
  cooldownTurn: number | null;
  unavailableReason: string | null;
};
