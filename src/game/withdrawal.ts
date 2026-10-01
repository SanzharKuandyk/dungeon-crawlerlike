import type { MatchState } from "../shared/game-types.js";
import type { CombatContext } from "./combat-context.js";
import { crewEvent, heroEvent, heroName } from "./events.js";
import { livingMembers } from "./voting.js";
export function applyWithdrawals(s: MatchState, ctx: CombatContext) {
  for (const c of s.crews.filter((c) => c.status === "active" && c.location.kind === "room")) {
    const members = livingMembers(s, c.id);
    if (members.filter((p) => s.withdrawVotes[p.id]).length <= members.length / 2) continue;
    c.location = { kind: "camp" };
    crewEvent(s, c, `${c.name} withdraws. Carried treasure remains at risk.`, 0.05, "withdrawal");
    for (const h of s.heroes.filter((h) => h.crewId === c.id && h.status === "alive")) {
      h.stress++;
      ctx.actions[h.playerId] = { kind: "observe" };
      heroEvent(s, h, `${heroName(s, h)} gains 1 stress while escaping.`, 0.06, "withdrawal");
    }
  }
}
