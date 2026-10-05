export type EnemyStatus =
  | {
      kind: "marked";
      sourceHeroId: string;
      sourceActionId: string;
      magnitude: number;
      expiresAfterTurn: number;
    }
  | { kind: "braced"; magnitude: number; expiresAfterTurn: number };
