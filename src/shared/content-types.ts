export type ClassId = "knight" | "physician" | "occultist" | "scavenger" | "wanderer" | "exorcist";
export type EnemyFamily = "sentinel" | "seer" | "devourer";
export type Risk = "low" | "medium" | "high";
export type ClassDefinition = {
  id: ClassId;
  name: string;
  skill: string;
  description: string;
  maxCrewSize: 4;
};
export type RoomDefinition = {
  id: string;
  depth: number;
  name: string;
  risk: Risk;
  family: EnemyFamily;
  description: string;
};
export type DungeonContent = {
  classes: ClassDefinition[];
  rooms: RoomDefinition[];
  trialPack?: import("./trial-types.js").TrialPack;
  balance?: Balance;
  enemyPatterns?: import("./enemy-content-types.js").EnemyPatterns;
  mapTemplates?: { chapter: 1 | 2; rows: import("./map-types.js").MapNodeKind[][] }[];
  sharedEvents?: import("./shared-event-types.js").SharedEventDefinition[];
};

export type Balance = {
  ordinaryHealthBase: number;
  eliteHealthBase: number;
  bossHealthBase: number;
  startingGold: number;
  ordinaryReward: number;
  eliteReward: number;
  bossReward: number;
  cacheReward: number;
  rescueDebt: number;
  ordinaryTurns: number;
  eliteTurns: number;
  bossTurns: number;
  injuryChance: number;
  backpackSlots: number;
  stackLimit: number;
  signatureCooldown: number;
  skirmishStress: number;
  trialGoldPer100?: number;
};
