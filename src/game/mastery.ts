import type { Hero, MatchState, RoomEncounter } from "../shared/game-types.js";
import { heroEvent, heroName } from "./events.js";

export function masteryBonus(hero: Hero, turn: number) {
  return hero.mastery && turn >= hero.mastery.activeFromTurn
    ? Math.floor((hero.power * hero.mastery.rank) / 3)
    : 0;
}

export function rewardMastery(s: MatchState, encounter: RoomEncounter) {
  // Snapshots without the feature marker retain their original rules.
  if (s.expeditionFeatures !== "rivalries-v1" || encounter.status !== "defeated") return;
  for (const h of s.heroes.filter(
    (h) => h.status === "alive" && encounter.crewIds.includes(h.crewId),
  )) {
    if (encounter.rivalry && encounter.rivalry.winnerCrewId !== h.crewId) continue;
    if ((encounter.contribution[h.crewId] ?? 0) < (encounter.enteringPower[h.crewId] ?? Infinity))
      continue;
    if (h.mastery?.rank === 2) continue;
    h.mastery = { rank: h.mastery ? 2 : 1, activeFromTurn: s.globalTurn + 1 };
    heroEvent(
      s,
      h,
      `${heroName(s, h)} earns mastery ${h.mastery.rank}/2. Stronger attacks, healing and barriers next combat.`,
      0.92,
      "mastery",
    );
  }
}
