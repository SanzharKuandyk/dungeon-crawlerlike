export type HeroAction =
  | { kind: "attack"; enemyId: string }
  | { kind: "use-item"; itemId: string; targetHeroId: string; inventoryRevision: number }
  | { kind: "brace" }
  | { kind: "protect"; targetHeroId: string }
  | { kind: "mend"; targetHeroId: string }
  | { kind: "hex"; enemyId: string }
  | { kind: "pilfer"; enemyId: string }
  | { kind: "skirmish"; enemyId: string }
  | { kind: "channel"; enemyId: string }
  | { kind: "ward"; targetHeroId: string }
  | { kind: "observe" };
export type CampChoice = "rest" | "continue" | "rescue" | "leave" | "wait";
