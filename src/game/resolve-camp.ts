import type { MatchState } from "../shared/game-types.js";
import {
  beginEvents,
  crewEvent,
  finalizeEvents,
  heroEvent,
  heroName,
  lockResolution,
} from "./events.js";
import { campAvailable } from "./expedition-map.js";
import { finalizeDeaths, resolveStress } from "./stress-and-death.js";
import { winningCamp } from "./voting.js";
export function resolveCamp(s: MatchState) {
  lockResolution(s);
  beginEvents(s);
  for (const c of s.crews.filter((c) => campAvailable(s, c))) {
    const choice = winningCamp(s, c.id);
    if (choice === "secure") {
      const value = c.carriedTreasure;
      c.securedTreasure += value;
      c.carriedTreasure = 0;
      crewEvent(s, c, `${c.name} secures ${value} treasure.`, 0.3, "bank");
    }
    for (const h of s.heroes.filter((h) => h.crewId === c.id && h.status === "alive")) {
      if (choice === "rest") {
        h.hp = Math.min(h.maxHp, h.hp + 2 * h.power);
        h.stress = Math.max(0, h.stress - 2);
        heroEvent(s, h, `${heroName(s, h)} rests and recovers.`, 0.3, "rest");
      }
      if (choice === "bargain") {
        h.stress++;
        h.bargainDepth = s.depth + 1;
        heroEvent(s, h, `${heroName(s, h)} accepts a bargain for the next depth.`, 0.3, "bargain");
      }
    }
  }
  resolveStress(s);
  finalizeDeaths(s);
  finalizeEvents(s);
}
