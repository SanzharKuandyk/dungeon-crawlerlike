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
};

export type Balance = {
  ordinaryHealthBase: number;
  eliteHealthBase: number;
  bossHealthBase: number;
  sealPower: number;
  strikePower: number;
  heavyBonusPower: number;
  shieldPower: number;
  woundedBonusPower: number;
  finalPhaseBonusPower: number;
  seerStress: number;
  sealedStress: number;
  startingGold: number;
  ordinaryReward: number;
  eliteReward: number;
  bossReward: number;
  cacheReward: number;
  rescueDebt: number;
  ordinaryTurns: number;
  bossTurns: number;
  injuryChance: number;
  backpackSlots: number;
  stackLimit: number;
  signatureCooldown: number;
  skirmishStress: number;
};
