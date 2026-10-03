import { startMatch } from "../../game/create-match.js";
import { crewState, mergeCrewState } from "../../game/crew-state.js";
import { reachableNodes } from "../../game/expedition-map.js";
import { offerRooms, resolveRoutes } from "../../game/routes.js";
import { finalizeDeaths } from "../../game/stress-and-death.js";
import type { TestScenario } from "../../shared/protocol.js";
import { enterCrew, startCrews } from "../crew-clock.js";
import { challenge, voteDuel } from "../duel-commands.js";
import { progressDuels } from "../duel-coordinator.js";
import { advanceQuestion, beginQuestion } from "../question-coordinator.js";
import type { StoredRoom } from "../room-types.js";

export function applyScenario(room: StoredRoom, scenario: TestScenario, now: number) {
  if (scenario === "fresh") return;
  room.speed = "manual";
  startMatch(room.state);
  startCrews(room, now);
  for (const run of Object.values(room.runs)) {
    const state = crewState(room.state, run);
    if (scenario === "final" && state.expeditionMap) {
      state.depth = state.expeditionMap.rows;
      const crew = state.crews[0];
      let node = state.expeditionMap.nodes.find((entry) => entry.row === 1);
      if (!node) throw new Error("Scenario needs a starting node");
      const trail = [node.id];
      while (node.row < state.depth - 1) {
        const nextId: string = node.nextIds[0];
        const next = state.expeditionMap.nodes.find((entry) => entry.id === nextId);
        if (!next) throw new Error("Scenario path is disconnected");
        node = next;
        trail.push(node.id);
      }
      crew.mapPosition = { chapter: 1, nodeId: node.id, trail };
      crew.securedTreasure = 20;
      crew.carriedTreasure = 5;
      offerRooms(state);
      mergeCrewState(room.state, run, state);
      enterCrew(room, run, { kind: "route" }, now);
      continue;
    }
    const reachable = reachableNodes(state, run.crewId);
    const target =
      reachable.find((node) => node.room.risk === (scenario === "critical" ? "high" : "low")) ??
      reachable[0];
    for (const player of state.players) state.routeVotes[player.id] = target.id;
    resolveRoutes(state);
    state.before = null;
    state.events = [];
    if (scenario === "critical") {
      state.heroes[0].hp = state.heroes[0].power;
      state.heroes[0].stress = 5;
      if (state.heroes[1]) state.heroes[1].hp = 0;
      finalizeDeaths(state);
    }
    if (scenario === "treasure") state.crews[0].carriedTreasure = 5;
    mergeCrewState(room.state, run, state);
    enterCrew(room, run, { kind: "combat" }, now);
  }
  if (scenario === "duel") {
    room.state.learningEnabled = false;
    for (const run of Object.values(room.runs)) enterCrew(room, run, { kind: "return" }, now);
    const [first, second] = room.state.crews;
    challenge(room, first.playerIds[0], second.id, now);
    const duel = room.duels[0];
    for (const id of [...first.playerIds, ...second.playerIds])
      voteDuel(room, id, duel.id, true, now);
    progressDuels(room, now);
  }
  if (scenario === "question") {
    room.discovery = { cause: "A seal breaks. An inscription is revealed.", depth: 1 };
    beginQuestion(room, now);
    advanceQuestion(room, now);
  }
}
