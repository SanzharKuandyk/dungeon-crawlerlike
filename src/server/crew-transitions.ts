import { crewState, mergeCrewState } from "../game/crew-state.js";
import { beginEvents, heroEvent, lockResolution } from "../game/events.js";
import { campAvailable } from "../game/expedition-map.js";
import { resolveCamp } from "../game/resolve-camp.js";
import { resolveCombat } from "../game/resolve-combat.js";
import { offerRooms, resolveRoutes } from "../game/routes.js";
import { extract } from "../game/scoring.js";
import type { CrewRun } from "../shared/crew-run-types.js";
import type { MatchState, Phase } from "../shared/game-types.js";
import { enterCrew } from "./crew-clock.js";
import type { StoredRoom } from "./room-types.js";

function afterFloor(state: MatchState): Phase {
  for (const hero of state.heroes) {
    if (hero.bargainDepth === state.depth) hero.bargainDepth = null;
  }
  if (state.depth === state.expeditionMap?.rows) {
    extract(state);
    return { kind: "extraction" };
  }
  if (campAvailable(state, state.crews[0])) {
    state.campVotes = {};
    return { kind: "camp" };
  }
  return nextRoom(state);
}

function nextRoom(state: MatchState): Phase {
  state.depth++;
  state.turn = 1;
  state.actions = {};
  state.withdrawVotes = {};
  offerRooms(state);
  return { kind: "route" };
}

function discover(room: StoredRoom, state: MatchState) {
  if (
    !room.state.learningEnabled ||
    room.discovery ||
    room.state.quizQuestionId ||
    state.depth >= 10 ||
    room.state.quizDepths.includes(state.depth) ||
    room.state.usedQuestions.length >= Math.min(3, room.state.questionDeck.length) ||
    room.state.crews.every((crew) => crew.status === "eliminated")
  )
    return;
  const event = ["weak-point", "victory", "loot"].flatMap((cause) =>
    state.events.filter((event) => event.cause === cause),
  )[0];
  if (event)
    room.discovery = { cause: `${event.message} An inscription is revealed.`, depth: state.depth };
}

function grantSpoils(state: MatchState, charges: 1 | 2) {
  lockResolution(state);
  beginEvents(state);
  for (const hero of state.heroes.filter((hero) => hero.status === "alive")) {
    const choice = state.equipmentChoices[hero.playerId] ?? (hero.equipment ? "keep" : "ward");
    if (choice !== "keep") {
      hero.equipment = { kind: choice, charges };
      hero.equipmentActiveFromTurn = state.globalTurn + 1;
    }
    heroEvent(
      state,
      hero,
      `${hero.classId} ${choice === "keep" ? "keeps their equipment" : `equips ${choice}`}.`,
      0.4,
      "equipment",
    );
  }
}

export function advanceCrew(room: StoredRoom, run: CrewRun, now: number) {
  if (run.finished) return;
  let state = crewState(room.state, run);
  let next: Phase;
  switch (state.phase.kind) {
    case "route":
      resolveRoutes(state);
      next = { kind: "arrival" };
      break;
    case "arrival":
      state.actions = {};
      state.withdrawVotes = {};
      next = {
        kind: state.encounters.some((encounter) => encounter.status === "active")
          ? "combat"
          : "floor-result",
      };
      break;
    case "combat":
      state = resolveCombat(state).state;
      next = { kind: "combat-reveal" };
      break;
    case "combat-reveal":
      if (state.crews[0].status === "eliminated") {
        run.finished = true;
        run.clock.deadline = null;
        return;
      }
      if (state.encounters.some((encounter) => encounter.status === "active")) {
        state.turn++;
        state.actions = {};
        state.withdrawVotes = {};
        state.before = null;
        state.events = [];
        next = { kind: "combat" };
      } else next = { kind: "floor-result" };
      break;
    case "floor-result":
      if (state.encounters.some((encounter) => encounter.status === "defeated")) {
        const node = state.expeditionMap?.nodes.find(
          (node) => node.id === state.crews[0].mapPosition?.nodeId,
        );
        run.rewardCharges = node?.kind === "elite" || node?.kind === "boss" ? 2 : 1;
        state.equipmentChoices = {};
        next = { kind: "equipment", questionId: `spoils:${run.crewId}:${state.depth}` };
      } else next = afterFloor(state);
      break;
    case "equipment":
      grantSpoils(state, run.rewardCharges ?? 1);
      next = { kind: "return" };
      break;
    case "return":
      run.rewardCharges = null;
      next = afterFloor(state);
      break;
    case "camp":
      resolveCamp(state);
      next = { kind: "camp-reveal" };
      break;
    case "camp-reveal":
      if (state.crews[0].status === "eliminated") {
        run.finished = true;
        run.clock.deadline = null;
        return;
      }
      next = nextRoom(state);
      break;
    case "extraction":
      run.finished = true;
      run.clock.deadline = null;
      return;
    default:
      throw new Error(`Unexpected crew phase: ${state.phase.kind}`);
  }
  mergeCrewState(room.state, run, state);
  if (["arrival", "combat-reveal"].includes(next.kind)) discover(room, state);
  enterCrew(room, run, next, now);
}
