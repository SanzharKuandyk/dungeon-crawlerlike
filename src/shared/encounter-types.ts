export type IntentTarget = {
  heroId: string;
  damage: number;
  stress: number;
  bleed: boolean;
  injury: import("./condition-types.js").InjuryKind | null;
  injuryChance: number;
};
export type StructuredIntent = {
  moveId: string;
  name: string;
  targets: IntentTarget[];
  shieldGain: number;
  sealModifier: string | null;
};
export type EncounterBuild = {
  rules?: import("./content-types.js").Balance;
  shield: number;
  bossPhase: 1 | 2 | 3;
  pendingBossPhase: 1 | 2 | 3;
  attempt: number;
  nodeId: string;
  kind: "battle" | "elite" | "boss";
  pilfered: string[];
};
