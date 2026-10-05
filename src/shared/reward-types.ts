import type { ConsumableKind, EquipmentKind } from "./inventory-types.js";
export type RewardOption =
  | { id: string; kind: EquipmentKind; type: "equipment"; rank: 1; upgradeItemId: string | null }
  | {
      id: string;
      kind: "draught" | "bandage";
      type: "supplies";
      items: { kind: ConsumableKind; count: number }[];
    };
export type RewardOffer = {
  id: string;
  sourceNodeId: string;
  ownerHeroId: string;
  options: RewardOption[];
  status: "pending" | "claimed" | "declined";
  deferred: boolean;
  selectedOptionId: string | null;
};
export type RewardClaim = {
  offerId: string;
  optionId: string | null;
  disposition: "equip" | "keep" | "upgrade" | "leave";
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
