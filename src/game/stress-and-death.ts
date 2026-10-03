import type { MatchState } from "../shared/game-types.js";
import { applyLantern, applySalve } from "./equipment.js";
import { crewEvent, effectEvent, heroEvent, heroName } from "./events.js";

export function resolveStress(s: MatchState, affected?: Set<string>) {
  for (const h of s.heroes.filter(
    (h) => h.status === "alive" && (!affected || affected.has(h.id)),
  )) {
    applyLantern(s, h);
    if (h.stress >= 6) {
      effectEvent(
        s,
        h.id,
        { type: "panic", target: h.id, amount: Math.min(h.hp, h.power) },
        null,
        0.74,
        `${heroName(s, h)} panics.`,
      );
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
    effectEvent(
      s,
      h.id,
      { type: "death", target: h.id, amount: 0 },
      null,
      0.8,
      `${heroName(s, h)} becomes a spirit.`,
    );
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
