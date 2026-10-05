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
  blockGain: number;
  recipientEnemyId: string | null;
};
export type EnemyInstance = {
  id: string;
  role: import("./enemy-content-types.js").EnemyRole;
  name: string;
  family: import("./content-types.js").EnemyFamily;
  hp: number;
  maxHp: number;
  block: number;
  effects: import("./enemy-effects.js").EnemyStatus[];
  intent: StructuredIntent;
};
export type EncounterBuild = {
  rules?: import("./content-types.js").Balance;
  patterns?: Partial<import("./enemy-content-types.js").EnemyPatterns>;
  block: number;
  bossPhase: 1 | 2 | 3;
  pendingBossPhase: 1 | 2 | 3;
  attempt: number;
  nodeId: string;
  kind: "battle" | "elite" | "boss";
  pilfered: string[];
};
