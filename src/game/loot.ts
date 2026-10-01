import type { MatchState } from "../shared/game-types.js";
import type { CombatContext } from "./combat-context.js";
import { crewEvent, heroEvent, heroName } from "./events.js";
import { priority } from "./voting.js";
export function awardLoot(s: MatchState, ctx: CombatContext) {
  for (const e of s.encounters.filter((e) => e.status === "active")) {
    const ranked = priority(s, s.crews)
      .filter(
        (c) => c.status === "active" && c.location.kind === "room" && c.location.roomId === e.id,
      )
      .map((c) => ({
        crew: c,
        claim: s.heroes
          .filter((h) => h.crewId === c.id && h.status === "alive")
          .reduce((n, h) => n + (ctx.claims.get(h.id) ?? 0), 0),
      }))
      .filter((v) => v.claim > 0)
      .sort((a, b) => b.claim - a.claim);
    const count = Math.max(1, Math.ceil(e.crewIds.length / 2));
    const value = s.depth + { low: 1, medium: 2, high: 3 }[e.definition.risk];
    for (const { crew: c } of ranked.slice(0, count)) {
      c.carriedTreasure += value;
      crewEvent(s, c, `${c.name} claims ${value} treasure in ${e.definition.name}.`, 0.85, "loot");
      if (s.treasureEquipmentDepths[c.id] !== s.depth) {
        s.treasureEquipmentDepths[c.id] = s.depth;
        for (const h of s.heroes.filter(
          (h) => h.crewId === c.id && h.status === "alive" && !h.equipment,
        )) {
          h.equipment = { kind: "ward", charges: 1 };
          heroEvent(s, h, `${heroName(s, h)} finds a Ward charge.`, 0.9, "cache-equipment");
        }
      }
    }
    if (e.bodyHp === 0 && !e.purseAwarded) {
      e.purseAwarded = true;
      const purse = { low: 6, medium: 8, high: 10 }[e.definition.risk] + s.depth;
      for (const c of s.crews.filter(
        (c) => c.status === "active" && c.location.kind === "room" && c.location.roomId === e.id,
      ))
        if ((e.contribution[c.id] ?? 0) >= (e.enteringPower[c.id] ?? Infinity)) {
          c.carriedTreasure += purse;
          crewEvent(s, c, `${c.name} earns the ${purse}-treasure victory purse.`, 0.87, "purse");
        }
    }
  }
}
