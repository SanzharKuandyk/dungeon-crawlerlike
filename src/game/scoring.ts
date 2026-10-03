import type { MatchState } from "../shared/game-types.js";
import { beginEvents, crewEvent, finalizeEvents, lockResolution } from "./events.js";

export function extract(s: MatchState) {
  lockResolution(s);
  beginEvents(s);
  for (const c of s.crews.filter((c) => c.status === "active")) {
    const amount = c.carriedTreasure;
    c.securedTreasure += amount;
    c.carriedTreasure = 0;
    crewEvent(s, c, `${c.name} extracts and secures ${amount} treasure.`, 0.5, "extraction");
  }
  finalizeEvents(s);
}
export function finishMatch(s: MatchState) {
  const max = Math.max(0, ...s.crews.map((c) => c.securedTreasure));
  s.winners = s.crews.filter((c) => c.securedTreasure === max).map((c) => c.id);
  s.status = "finished";
}
