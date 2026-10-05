import { resolveCombat } from "../game/combat/resolve-combat.js";
import { createShop } from "../game/inventory/shops.js";
import { applyCamp } from "../game/progression/camp.js";
import { enterNode, nextCombatTurn, spawnEncounter } from "../game/progression/encounters.js";
import { createExploration, resolveExploration } from "../game/progression/exploration.js";
import { createCrewResult } from "../game/progression/results.js";
import { winningCamp, winningRoute } from "../game/voting.js";
import type { CrewRun } from "../shared/crew-run-types.js";
import { enterCrew } from "./crew-clock.js";
import type { StoredRoom } from "./room-types.js";
import { queueSharedEvent } from "./shared-event-coordinator.js";

export function advanceCrew(room: StoredRoom, run: CrewRun, now: number) {
  if (run.finished) return;
  const id = run.crewId;
  const crew = room.state.crews.find((c) => c.id === id);
  if (!crew) throw new Error("Crew missing");
  const p = room.state.crewProgress[id];
  const map = room.state.chapterMaps[p.chapter - 1];
  const node = map.nodes.find((n) => n.id === p.nodeId);
  const enemy = room.state.encounters.find((e) => e.id === p.encounterId);
  switch (p.phase.kind) {
    case "route":
      enterNode(room.state, id, winningRoute(room.state, id));
      enterCrew(room, run, { kind: "arrival" }, now);
      break;
    case "arrival":
      if (node?.kind === "event") {
        p.exploration = createExploration(room.state, id, node.id);
        enterCrew(room, run, { kind: "event" }, now);
        break;
      }
      if (p.encounterId) enterCrew(room, run, { kind: "combat" }, now);
      else {
        if (node?.sharedEventId) queueSharedEvent(room, node.sharedEventId, id);
        enterCrew(
          room,
          run,
          {
            kind: ["merchant", "camp", "altar", "shrine", "arena", "event", "siege"].includes(
              node?.kind ?? "",
            )
              ? "camp"
              : "result",
          },
          now,
        );
      }
      if (node?.kind === "treasure" && !p.encounterId)
        createCrewResult(room.state, id, "cache", "encounter");
      break;
    case "combat":
      room.state = resolveCombat(room.state, { crewId: id }).state;
      enterCrew(room, run, { kind: "combat-reveal" }, now);
      break;
    case "event":
      resolveExploration(room.state, id);
      enterCrew(room, run, { kind: "event-reveal" }, now);
      break;
    case "event-reveal":
      createCrewResult(
        room.state,
        id,
        crew.status === "eliminated" ? "defeated" : "departed",
        "encounter",
      );
      enterCrew(room, run, { kind: "result" }, now);
      break;
    case "combat-reveal":
      enterCrew(room, run, { kind: enemy?.status === "active" ? "combat-recap" : "result" }, now);
      break;
    case "combat-recap":
      nextCombatTurn(room.state, id);
      enterCrew(room, run, { kind: "combat" }, now);
      break;
    case "result":
    case "floor-result":
      if (p.phase.kind === "result" && p.result?.continuation === "stop") {
        finishStop(room, run, now);
        break;
      }
      if (crew.status === "eliminated" || (enemy?.kind === "boss" && enemy.status !== "defeated")) {
        p.recovering = true;
        crew.shop = createShop(room.state, id, p.nodeId ?? "rescue");
        enterCrew(room, run, { kind: "camp" }, now);
      } else if (enemy?.kind === "boss" && enemy.status === "defeated") {
        if (p.chapter === 2) enterCrew(room, run, { kind: "extraction" }, now);
        else {
          p.chapter = 2;
          p.depth = 1;
          p.nodeId = null;
          p.encounterId = null;
          crew.mapPosition = { chapter: p.chapter, nodeId: null, trail: [] };
          crew.location = { kind: "camp" };
          enterCrew(room, run, { kind: "route" }, now);
        }
      } else {
        p.routeVotes = {};
        crew.shop = null;
        enterCrew(room, run, { kind: "route" }, now);
      }
      break;
    case "camp":
      if (winningCamp(room.state, id) === "wait") {
        p.campVotes = {};
        enterCrew(room, run, { kind: "camp" }, now);
        break;
      }
      applyCamp(room.state, id, winningCamp(room.state, id));
      enterCrew(room, run, { kind: "camp-reveal" }, now);
      break;
    case "camp-reveal":
      createCrewResult(
        room.state,
        id,
        winningCamp(room.state, id) === "rest"
          ? "rested"
          : winningCamp(room.state, id) === "rescue"
            ? "recovered"
            : "departed",
        "stop",
      );
      enterCrew(room, run, { kind: "result" }, now);
      break;
    case "extraction":
      run.finished = true;
      run.clock.deadline = null;
      break;
    default:
      throw new Error(`Unexpected crew phase ${p.phase.kind}`);
  }
}

function finishStop(room: StoredRoom, run: CrewRun, now: number) {
  const id = run.crewId,
    p = run.progress;
  const crew = room.state.crews.find((c) => c.id === id);
  if (!crew) throw new Error("Crew missing.");
  const enemy = room.state.encounters.find((e) => e.id === p.encounterId);
  const node = room.state.chapterMaps[p.chapter - 1].nodes.find((n) => n.id === p.nodeId);

  if (p.recovering && ["rescue", "rest"].includes(winningCamp(room.state, id))) {
    p.campVotes = {};
    crew.shop ??= createShop(room.state, id, p.nodeId ?? "recovery");
    enterCrew(room, run, { kind: "camp" }, now);
    return;
  }
  if (crew.status === "eliminated") enterCrew(room, run, { kind: "camp" }, now);
  else if (enemy?.kind === "boss" && enemy.status === "defeated") {
    p.recovering = false;
    enterCrew(room, run, { kind: "floor-result" }, now);
  } else if (
    (enemy?.kind === "boss" && enemy.status !== "defeated") ||
    (enemy &&
      enemy.status === "abandoned" &&
      winningCamp(room.state, id) !== "leave" &&
      node &&
      ["battle", "elite", "boss"].includes(node.kind))
  ) {
    if (!node) throw new Error("Retry node missing");
    p.recovering = false;
    spawnEncounter(room.state, id, node);
    enterCrew(room, run, { kind: "combat" }, now);
  } else {
    if (winningCamp(room.state, id) === "leave" && enemy?.kind !== "boss") {
      if (node) {
        p.completedNodeIds.push(...(p.completedNodeIds.includes(node.id) ? [] : [node.id]));
      }
      p.encounterId = null;
      p.recovering = false;
    }
    p.routeVotes = {};
    crew.shop = null;
    enterCrew(room, run, { kind: "route" }, now);
  }
}
