export type HeroBuild = {
  expeditionUses: string[];
  pendingBlessings: import("./trial-types.js").BlessingOffer[];
  inventory: import("./inventory-types.js").Inventory;
  conditions: Omit<import("./condition-types.js").HeroConditions, "stress">;
  skillReadyTurn: number;
  encounterUses: string[];
};
