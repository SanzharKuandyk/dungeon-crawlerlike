import type { ItemKind } from "./inventory-types.js";
export type RewardOffer = {
  id: string;
  sourceNodeId: string;
  ownerHeroId: string;
  options: { id: string; kind: ItemKind }[];
  status: "pending" | "claimed" | "declined";
  deferred: boolean;
  selectedOptionId: string | null;
};
export type RewardClaim = {
  offerId: string;
  optionId: string | null;
  disposition: "equip" | "keep" | "leave" | "defer";
  replacementItemId: string | null;
};
export type CrewResult = {
  id: string;
  crewId: string;
  outcome: "victory" | "escaped" | "defeated" | "cache" | "rested" | "recovered" | "departed";
  sourceNodeId: string;
  title: string;
  goldEarned: number;
  debtPaid: number;
  heroChanges: {
    heroId: string;
    hpBefore: number;
    hpAfter: number;
    stressBefore: number;
    stressAfter: number;
    conditions: string[];
  }[];
  rewardIds: string[];
  continuation: "encounter" | "stop";
};
