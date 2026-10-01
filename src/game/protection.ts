import type { Hero, MatchState } from "../shared/game-types.js";
import type { CombatContext } from "./combat-context.js";
import { spendCharge } from "./equipment.js";
import { heroEvent, heroName } from "./events.js";
export function absorb(s: MatchState, h: Hero, raw: number, ctx: CombatContext) {
  let remaining = raw;
  for (const barrier of ctx.barriers.get(h.id) ?? []) {
    const blocked = Math.min(remaining, barrier.amount);
    remaining -= blocked;
    if (blocked > 0) ctx.meaningful.add(barrier.source);
  }
  remaining -= Math.min(remaining, ctx.aid.get(h.id) ?? 0);
  if (remaining > 0 && h.equipment?.kind === "ward" && s.globalTurn >= h.equipmentActiveFromTurn) {
    const blocked = Math.min(remaining, h.power);
    remaining -= blocked;
    spendCharge(h);
    heroEvent(s, h, `${heroName(s, h)}'s Ward absorbs ${blocked}.`, 0.59, "equipment");
  }
  return remaining;
}
