import type { HeroAction } from "../shared/command-types.js";
export type Barrier = { source: string; amount: number };
export type Attack = { actor: string; roomId: string; part: "body" | "weak-point"; amount: number };
export type CombatContext = {
  actions: Record<string, HeroAction>;
  barriers: Map<string, Barrier[]>;
  aid: Map<string, number>;
  attacks: Attack[];
  duelAttacks: { actor: string; roomId: string; targetHeroId: string; amount: number }[];
  claims: Map<string, number>;
  meaningful: Set<string>;
  fightingAtLock: Set<string>;
};
export function combatContext(
  actions: Record<string, HeroAction>,
  fightingAtLock: Set<string>,
): CombatContext {
  return {
    actions,
    fightingAtLock,
    barriers: new Map(),
    aid: new Map(),
    attacks: [],
    duelAttacks: [],
    claims: new Map(),
    meaningful: new Set(),
  };
}
