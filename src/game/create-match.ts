import type { DungeonContent } from "../shared/content-types.js";
import type { MatchState } from "../shared/game-types.js";
import { createHeroes } from "./create-heroes.js";
import { newCrewProgress } from "./crew-state.js";
import { chapterMap } from "./progression/maps.js";
import { offerRooms } from "./routes.js";

export function createMatch(
  id: string,
  code: string,
  content: DungeonContent,
  seed = 1,
  privateSeeds = { outcome: 1, reward: 2, trial: 3 },
): MatchState {
  return {
    crewProgress: {},
    chapterMaps: ([1, 2] as const).map((chapter) => chapterMap(content, seed, chapter)),
    trialPack: content.trialPack ?? {
      fixture: true,
      categories: ["Input", "State", "Timing"],
      questions: [],
    },
    trial: null,
    sharedEvents: [],
    siege: null,
    usedTrialQuestions: [],
    outcomeRng: {},
    transactions: {},
    rewardSeed: privateSeeds.reward,
    rewardRng: {},
    rewardOffers: [],
    trialRng: privateSeeds.trial,
    id,
    code,
    rulesVersion: "dungeon-v5",

    expeditionMap: chapterMap(content, seed, 1),
    seed,
    outcomeSeed: privateSeeds.outcome,
    revision: 0,
    status: "lobby",
    depth: 1,
    turn: 1,
    globalTurn: 0,
    phase: { kind: "route" },
    phaseId: 0,
    players: [],
    crews: [],
    heroes: [],
    encounters: [],
    crewSerial: 0,
    content: structuredClone(content),
    offeredRooms: [],
    actions: {},
    routeVotes: {},
    campVotes: {},
    withdrawVotes: {},
    resolvedActions: {},
    learningEnabled: true,
    resolvedPhaseIds: [],
    before: null,
    events: [],
    history: [],
    winners: [],
  };
}

export function startMatch(s: MatchState) {
  if (s.status !== "lobby" || !s.crews.length || s.players.some((p) => !p.crewId))
    throw new Error("Every player needs a crew before starting.");
  createHeroes(s);

  if (s.expeditionMap) {
    for (const crew of s.crews) {
      crew.mapPosition = { chapter: 1, nodeId: null, trail: [] };
    }
  }

  for (const crew of s.crews) {
    s.crewProgress[crew.id] = newCrewProgress();
    s.outcomeRng[crew.id] = (s.outcomeSeed ^ ((s.crews.indexOf(crew) + 1) * 0x9e3779b9)) >>> 0;
  }
  s.status = "running";
  s.learningEnabled &&= s.trialPack.questions.length >= 18;
  offerRooms(s);
}
