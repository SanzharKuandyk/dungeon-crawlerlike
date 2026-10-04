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
): MatchState {
  return {
    crewProgress: {},
    chapterMaps: ([1, 2, 3] as const).map((chapter) => chapterMap(content, seed, chapter)),
    trialPack: content.trialPack ?? {
      fixture: true,
      categories: ["Input", "State", "Timing"],
      questions: [],
    },
    trial: null,
    completedTrials: [],
    usedTrialQuestions: [],
    outcomeRng: {},
    transactions: {},
    rewardSeed: seed ^ 0x73b48a19,
    rewardRng: {},
    rewardOffers: [],
    trialRng: seed ^ 0xa57a,
    id,
    code,
    rulesVersion: "dungeon-v4",

    expeditionMap: chapterMap(content, seed, 1),
    seed,
    outcomeSeed: seed ^ 0xbc4df,
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
