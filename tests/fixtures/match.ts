import balance from "../../content/dungeon/balance.json";
import classes from "../../content/dungeon/classes.json";
import rooms from "../../content/dungeon/rooms.json";
import pack from "../../content/learning/trials.fixture.json";
import { createMatch, startMatch } from "../../src/game/create-match.js";
import { enterNode } from "../../src/game/progression/encounters.js";
import type { DungeonContent } from "../../src/shared/content-types.js";
import type { MatchState } from "../../src/shared/game-types.js";
export const content = {
  classes,
  rooms,
  trialPack: pack,
  balance,
} as unknown as DungeonContent;
export function fixture(count = 2, sizes: number[] = []): MatchState {
  const s = createMatch("match", "ABC123", content, 3);
  for (let i = 0; i < count; i++) {
    const size = sizes[i] ?? 1,
      ids = Array.from({ length: size }, (_, j) => `p${i}-${j}`);
    s.crews.push({
      id: `c${i}`,
      name: `Crew ${i}`,
      symbol: String.fromCharCode(65 + i),
      colorId: ["blue", "teal", "orange", "purple"][i % 4],
      playerIds: ids,
      startingSize: size as 1 | 2 | 3 | 4,
      economy: { gold: 24, rescueDebt: 0 },
      bossesDefeated: 0,
      completedNodeIds: [],
      trialScoreUnits: 0,
      rewardedNodeIds: [],
      shop: null,
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
  for (const crew of s.crews) {
    const p = s.crewProgress[crew.id];
    p.phaseId = 1;
    enterNode(s, crew.id, s.chapterMaps[0].nodes[0].id);
    p.phase = { kind: "combat" };
    p.phaseId = 2;
  }
  s.phase = { kind: "combat" };
  s.phaseId = 2;
  return s;
}
export function next(s: MatchState) {
  for (const p of Object.values(s.crewProgress)) {
    p.phaseId++;
    p.turn++;
    p.actions = {};
    p.withdrawVotes = {};
  }
  return s;
}
