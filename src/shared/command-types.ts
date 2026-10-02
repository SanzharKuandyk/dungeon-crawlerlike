import type { EquipmentKind } from "./game-types.js";
export type EnemyPart = "body" | "weak-point";
export type HeroAction =
  | { kind: "attack"; part: EnemyPart }
  | { kind: "brace" }
  | { kind: "loot" }
  | { kind: "protect"; targetHeroId: string }
  | { kind: "mend"; targetHeroId: string }
  | { kind: "hex"; part: EnemyPart }
  | { kind: "pilfer" }
  | { kind: "skirmish"; part: EnemyPart }
  | { kind: "channel"; part: EnemyPart }
  | { kind: "duel-attack"; targetHeroId: string }
  | { kind: "duel-hex"; targetHeroId: string }
  | { kind: "duel-pilfer"; targetHeroId: string }
  | { kind: "duel-skirmish"; targetHeroId: string }
  | { kind: "duel-channel"; targetHeroId: string }
  | { kind: "ward"; targetHeroId: string }
  | { kind: "observe" };
export type CampChoice = "secure" | "rest" | "bargain";
export type EquipmentChoice = EquipmentKind | "keep";
