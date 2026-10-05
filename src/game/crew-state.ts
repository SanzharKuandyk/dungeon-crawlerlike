import type { CrewProgress, CrewRun } from "../shared/crew-run-types.js";
import type { MatchState } from "../shared/game-types.js";
export function newCrewProgress(): CrewProgress {
  return {
    recovering: false,
    helpRequests: [],
    exploration: null,
    result: null,
    lastTurn: null,
    restedNodeIds: [],
    chapter: 1,
    depth: 1,
    nodeId: null,
    completedNodeIds: [],
    bossesDefeated: 0,
    encounterId: null,
    turn: 1,
    globalTurn: 0,
    phase: { kind: "route" },
    phaseId: 0,
    actions: {},
    plans: {},
    routeVotes: {},
    campVotes: {},
    withdrawVotes: {},
    resolvedActions: {},
    resolvedPhaseIds: [],
    before: null,
    events: [],
  };
}
// Projections alone flatten crew metadata into the existing screen contract.
export function crewState(state: MatchState, run: CrewRun, _publicRoster = false): MatchState {
  const p = state.crewProgress[run.crewId];
  return {
    ...state,
    ...p,
    expeditionMap: state.chapterMaps[p.chapter - 1],
    offeredRooms: state.chapterMaps[p.chapter - 1].nodes
      .filter((n) => n.row === (p.nodeId ? p.depth + 1 : 1))
      .map((n) => n.room),
  };
}
