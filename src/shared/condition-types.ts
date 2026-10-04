export type InjuryKind = "arm" | "leg";
export type TraitRank = 1 | 2;
export type BlessingKind =
  | "iron-nerve"
  | "sealbreaker"
  | "last-stand"
  | "field-medic"
  | "clear-purpose"
  | "second-breath";
export type AfflictionKind = "shaken" | "doubtful" | "brittle" | "haunted";
export type BlessingInstance = { kind: BlessingKind; rank: TraitRank; spent: boolean };
export type AfflictionInstance = { kind: AfflictionKind };
export type CombatStatus = { kind: "bleed"; turns: number };
export type HeroConditions = {
  stress: number;
  injuries: InjuryKind[];
  blessings: BlessingInstance[];
  afflictions: AfflictionInstance[];
  combatEffects: CombatStatus[];
};
