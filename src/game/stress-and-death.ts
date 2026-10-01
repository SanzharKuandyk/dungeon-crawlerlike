import type { MatchState } from "../shared/game-types.js";
import { applyLantern, applySalve } from "./equipment.js";
import { crewEvent, heroEvent, heroName } from "./events.js";
export function resolveStress(s: MatchState, affected?: Set<string>) {
  for (const h of s.heroes.filter(
    (h) => h.status === "alive" && (!affected || affected.has(h.id)),
  )) {
    applyLantern(s, h);
    if (h.stress >= 6) {
      h.stress = 3;
      h.hp = Math.max(0, h.hp - h.power);
      heroEvent(s, h, `${heroName(s, h)} panics and loses ${h.power} health.`, 0.74, "panic");
    }
    applySalve(s, h);
  }
}
export function finalizeDeaths(s: MatchState) {
  for (const h of s.heroes.filter((h) => h.status === "alive" && h.hp === 0)) {
    h.status = "dead";
    heroEvent(s, h, `${heroName(s, h)} falls. Their spirit remains.`, 0.8, "death");
  }
  for (const c of s.crews.filter((c) => c.status === "active"))
    if (!s.heroes.some((h) => h.crewId === c.id && h.status === "alive")) {
      const lost = c.carriedTreasure;
      c.carriedTreasure = 0;
      c.status = "eliminated";
      c.location = { kind: "camp" };
      crewEvent(
        s,
        c,
        `${c.name} is eliminated and loses ${lost} carried treasure.`,
        0.82,
        "elimination",
      );
    }
}
