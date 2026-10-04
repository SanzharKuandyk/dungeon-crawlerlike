export type EnemyPart = "body" | "weak-point";
export type HeroAction =
  | { kind: "attack"; part: EnemyPart }
  | { kind: "use-item"; itemId: string; targetHeroId: string; inventoryRevision: number }
  | { kind: "brace" }
  | { kind: "protect"; targetHeroId: string }
  | { kind: "mend"; targetHeroId: string }
  | { kind: "hex"; part: EnemyPart }
  | { kind: "pilfer" }
  | { kind: "skirmish"; part: EnemyPart }
  | { kind: "channel"; part: EnemyPart }
  | { kind: "ward"; targetHeroId: string }
  | { kind: "observe" };
export type CampChoice =
  | "rest"
  | "continue"
  | "rescue"
  | "leave"
  | "risk"
  | "recover-health"
  | "recover-stress"
  | "sacrifice";
