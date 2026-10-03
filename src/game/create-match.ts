import type { DungeonContent } from "../shared/content-types.js";
import type { MatchState } from "../shared/game-types.js";
import { createHeroes } from "./create-heroes.js";
import { createExpeditionMap } from "./expedition-map.js";
import { shuffled } from "./random.js";
import { offerRooms } from "./routes.js";

export function createMatch(
  id: string,
  code: string,
  content: DungeonContent,
  seed = 1,
): MatchState {
  return {
    id,
    code,
    rulesVersion: "dungeon-v1",
    expeditionFeatures: "rivalries-v1",
    expeditionMap: createExpeditionMap(content, seed),
    seed,
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
    answers: {},
    answerPacts: {},
    equipmentChoices: {},
    resolvedActions: {},
    learningEnabled: true,
    questionDeck: shuffled(
      content.questions.map((q) => q.id),
      seed,
    ),
    usedQuestions: [],
    quizDepths: [],
    quizResults: [],
    quizCause: null,
    quizQuestionId: null,
    quizLocked: false,
    quizGranted: false,
    quizContinuation: null,
    treasureEquipmentDepths: {},
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

  s.status = "running";
  offerRooms(s);
}
