import type { HeroAction } from "./command-types.js";

export type CombatAction = Exclude<HeroAction, { kind: "ward" | "observe" }>;
export type SpiritAction = Extract<HeroAction, { kind: "ward" | "observe" }>;
export type TurnPlan =
  | {
      kind: "hero";
      actions: [CombatAction] | [CombatAction, CombatAction];
      activation: { kind: "haste"; itemId: string } | null;
      inventoryRevision: number;
    }
  | { kind: "spirit"; action: SpiritAction };

export const planActions = (plan: TurnPlan): HeroAction[] =>
  plan.kind === "hero" ? plan.actions : [plan.action];
