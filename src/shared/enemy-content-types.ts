export type EnemyRole = "raider" | "guard" | "whisperer" | "supporter" | "devourer";
export type EnemyPatternId = EnemyRole | "iron-warden" | "hollow-regent";
export type EnemyMoveDefinition = {
  id: string;
  name: string;
  target: "rotating" | "wounded" | "none";
  damagePower: number;
  stress: number;
  stressPerPhase: boolean;
  blockPower: number;
  recipient: "self" | "ally" | null;
  bleed: boolean;
  injury: import("./condition-types.js").InjuryKind | null;
  injuryChance: number;
  finalPhaseDamagePower: number;
};
export type EnemyPatterns = Record<
  EnemyPatternId,
  {
    name: string;
    moves: [EnemyMoveDefinition, EnemyMoveDefinition, EnemyMoveDefinition];
  }
>;
