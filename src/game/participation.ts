import type { MatchState } from "../shared/game-types.js";
import type { CombatContext } from "./combat-context.js";
import { encounterFor } from "./routes.js";
export function creditParticipation(s: MatchState, ctx: CombatContext) {
  for (const id of ctx.meaningful) {
    const h = s.heroes.find((h) => h.id === id);
    if (!h) continue;
    const e = encounterFor(s, h);
    if (e) e.contribution[h.crewId] = (e.contribution[h.crewId] ?? 0) + h.power;
  }
}
