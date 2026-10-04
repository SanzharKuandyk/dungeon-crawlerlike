import type { Crew } from "../../shared/game-types.js";
export function goldReward(crew: Crew, amount: number) {
  const paid = Math.min(crew.economy.rescueDebt, amount);
  return { gold: crew.economy.gold + amount - paid, rescueDebt: crew.economy.rescueDebt - paid };
}
export function reserveAllowances(gold: number, heroes: { id: string; power: number }[]) {
  return Object.fromEntries(heroes.map((hero) => [hero.id, Math.floor((gold * hero.power) / 12)]));
}
