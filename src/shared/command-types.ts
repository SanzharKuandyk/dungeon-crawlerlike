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
  | { kind: "ward"; targetHeroId: string }
  | { kind: "observe" };
export type CampChoice = "secure" | "rest" | "bargain";
export type EquipmentChoice = EquipmentKind | "keep";
