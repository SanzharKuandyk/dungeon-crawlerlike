import { crewState, mergeCrewState } from "../game/crew-state.js";
import { reachableNodes } from "../game/expedition-map.js";
import { winningCamp, winningRoute } from "../game/voting.js";
import type { CrewRun } from "../shared/crew-run-types.js";
import { clockView, freezeClock, resumeClock } from "./clocks.js";
import type { StoredRoom } from "./room-types.js";

export const CREW_CHOICES = new Set(["route", "combat", "camp", "equipment"]);

export function playerRun(room: StoredRoom, playerId: string) {
  const crewId = room.state.players.find((player) => player.id === playerId)?.crewId;
  return crewId ? room.runs[crewId] : undefined;
}

export function crewCommandRoom(room: StoredRoom, run: CrewRun): StoredRoom {
  return { ...room, state: crewState(room.state, run), ...clockView(run.clock) };
}

export function eligibleMembers(room: StoredRoom, run: CrewRun) {
  return room.state.heroes
    .filter((hero) => hero.crewId === run.crewId && hero.status === "alive")
    .map((hero) => hero.playerId);
}

export function allReady(room: StoredRoom, run: CrewRun) {
  const members = eligibleMembers(room, run);
  return members.length > 0 && members.every((id) => run.ready.includes(id));
}

export function fillMissingChoice(room: StoredRoom, run: CrewRun, playerId: string) {
  const state = crewState(room.state, run);
  switch (state.phase.kind) {
    case "route":
      state.routeVotes[playerId] =
        winningRoute(state, run.crewId) || reachableNodes(state, run.crewId)[0]?.id || "";
      break;
    case "combat":
      state.actions[playerId] = { kind: "brace" };
      break;
    case "camp":
      state.campVotes[playerId] = winningCamp(state, run.crewId);
      break;
    case "equipment":
      state.equipmentChoices[playerId] = state.heroes.find((hero) => hero.playerId === playerId)
        ?.equipment
        ? "keep"
        : "ward";
      break;
  }
  if (!run.ready.includes(playerId)) run.ready.push(playerId);
  mergeCrewState(room.state, run, state);
}

export function updateCrewPresence(room: StoredRoom, run: CrewRun, now: number) {
  if (!CREW_CHOICES.has(run.progress.phase.kind) || run.finished) return;
  const members = eligibleMembers(room, run);
  const connected = members.filter(
    (id) => room.state.players.find((player) => player.id === id)?.connected,
  );
  if (!connected.length && !allReady(room, run)) {
    if (!run.suspended) {
      freezeClock(run.clock, now);
      if (!run.pauseReasons.includes("all-offline")) run.pauseReasons.push("all-offline");
      run.suspended = true;
    }
    return;
  }
  if (run.suspended) {
    run.pauseReasons = run.pauseReasons.filter((reason) => reason !== "all-offline");
    if (
      !run.pauseReasons.length &&
      !room.pauseReasons.length &&
      room.speed !== "manual" &&
      room.inactivityFallback
    )
      resumeClock(run.clock, now);
    run.suspended = false;
  }
  for (const id of members) {
    if (connected.includes(id)) delete run.absentSince[id];
    else {
      run.absentSince[id] ??= now;
      if (now - run.absentSince[id] >= 15000 && !run.ready.includes(id))
        fillMissingChoice(room, run, id);
    }
  }
}
