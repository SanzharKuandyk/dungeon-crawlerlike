import type { CrewProgress, CrewRun } from "../shared/crew-run-types.js";
import type { MatchState } from "../shared/game-types.js";

export function crewProgress(state: MatchState): CrewProgress {
  const {
    depth,
    turn,
    globalTurn,
    phase,
    phaseId,
    actions,
    routeVotes,
    campVotes,
    withdrawVotes,
    equipmentChoices,
    resolvedActions,
    resolvedPhaseIds,
    treasureEquipmentDepths,
    before,
    events,
  } = state;
  return {
    depth,
    turn,
    globalTurn,
    phase,
    phaseId,
    actions,
    routeVotes,
    campVotes,
    withdrawVotes,
    equipmentChoices,
    resolvedActions,
    resolvedPhaseIds,
    treasureEquipmentDepths,
    before,
    events,
  };
}

export function crewState(expedition: MatchState, run: CrewRun, publicRoster = false): MatchState {
  const state = { ...expedition, ...run.progress };
  if (!publicRoster) {
    state.crews = expedition.crews.filter((crew) => crew.id === run.crewId);
    state.players = expedition.players.filter((player) => player.crewId === run.crewId);
    state.heroes = expedition.heroes.filter((hero) => hero.crewId === run.crewId);
    state.encounters = expedition.encounters.filter((encounter) =>
      encounter.crewIds.includes(run.crewId),
    );
    // Shared questions are scheduled by the expedition, never by a single crew.
    state.learningEnabled = false;
  }
  state.offeredRooms =
    expedition.expeditionMap?.nodes
      .filter((node) => node.row === run.progress.depth)
      .map((node) => node.room) ?? expedition.offeredRooms;
  return state;
}

export function mergeCrewState(expedition: MatchState, run: CrewRun, state: MatchState) {
  run.progress = crewProgress(state);
  for (const crew of state.crews) {
    const index = expedition.crews.findIndex((candidate) => candidate.id === crew.id);
    expedition.crews[index] = crew;
  }
  for (const hero of state.heroes) {
    const index = expedition.heroes.findIndex((candidate) => candidate.id === hero.id);
    expedition.heroes[index] = hero;
  }
  expedition.encounters = [
    ...expedition.encounters.filter((encounter) => !encounter.crewIds.includes(run.crewId)),
    ...state.encounters,
  ];
  expedition.history = state.history;
}
