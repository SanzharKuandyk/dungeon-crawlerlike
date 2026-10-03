import classes from "../../content/dungeon/classes.json";
import rooms from "../../content/dungeon/rooms.json";
import questions from "../../content/learning/week-4.json";
import { createMatch, startMatch } from "../../src/game/create-match.js";
import { resolveRoutes } from "../../src/game/routes.js";
import type { DungeonContent } from "../../src/shared/content-types.js";
import type { MatchState } from "../../src/shared/game-types.js";

export const content = { classes, rooms, questions } as DungeonContent;
export function fixture(count = 2, sizes: number[] = []): MatchState {
  const s = createMatch("match", "ABC123", content, 3);
  // These fixtures exercise the original shared-room rules.
  delete s.expeditionMap;
  for (let i = 0; i < count; i++) {
    const size = sizes[i] ?? 1;
    const ids = Array.from({ length: size }, (_, j) => `p${i}-${j}`);
    s.crews.push({
      id: `c${i}`,
      name: `Crew ${i}`,
      symbol: String.fromCharCode(65 + i),
      colorId: ["blue", "teal", "orange", "purple"][i % 4],
      playerIds: ids,
      startingSize: size as 1 | 2 | 3 | 4,
      carriedTreasure: 0,
      securedTreasure: 0,
      status: "active",
      location: { kind: "camp" },
    });
    for (const id of ids)
      s.players.push({
        id,
        name: id,
        crewId: `c${i}`,
        connected: true,
        bot: false,
        classId: "knight",
        classNotice: null,
      });
  }
  startMatch(s);
  s.phaseId = 1;
  for (const p of s.players) s.routeVotes[p.id] = "d1-0";
  resolveRoutes(s);
  s.phase = { kind: "combat" };
  s.phaseId = 2;
  return s;
}
export function next(s: MatchState) {
  s.phaseId++;
  s.turn++;
  s.actions = {};
  s.withdrawVotes = {};
  return s;
}
