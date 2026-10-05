import { defaultPlan } from "../game/combat/turn-plans.js";
import { winningCamp, winningRoute } from "../game/voting.js";
import type { CrewRun } from "../shared/crew-run-types.js";
import { freezeClock, resumeClock } from "./clocks.js";
import type { StoredRoom } from "./room-types.js";

export const CREW_CHOICES = new Set(["route", "combat", "camp", "result", "event"]);
export function playerRun(room: StoredRoom, id: string) {
  const crewId = room.state.players.find((p) => p.id === id)?.crewId;
  return crewId ? room.runs[crewId] : undefined;
}

export function eligibleMembers(room: StoredRoom, run: CrewRun) {
  const living = room.state.heroes.filter((h) => h.crewId === run.crewId && h.status === "alive");
  return (
    ["combat", "result", "event"].includes(run.progress.phase.kind) || !living.length
      ? room.state.heroes.filter((h) => h.crewId === run.crewId)
      : living
  ).map((h) => h.playerId);
}

export function allReady(room: StoredRoom, run: CrewRun) {
  const members = eligibleMembers(room, run);
  return members.length > 0 && members.every((id) => run.ready.includes(id));
}

export function fillMissingChoice(room: StoredRoom, run: CrewRun, id: string) {
  const p = run.progress;
  if (p.phase.kind === "event" && p.exploration) p.exploration.choices[id] ??= { kind: "leave" };
  if (p.phase.kind === "result") {
    for (const offer of room.state.rewardOffers.filter(
      (o) =>
        o.status === "pending" &&
        room.state.heroes.some((h) => h.id === o.ownerHeroId && h.playerId === id),
    ))
      offer.deferred = true;
  }
  if (p.phase.kind === "route") p.routeVotes[id] = winningRoute(room.state, run.crewId);
  if (p.phase.kind === "combat")
    p.actions[id] = room.state.heroes.some((h) => h.playerId === id && h.status === "alive")
      ? { kind: "brace" }
      : { kind: "observe" };
  if (p.phase.kind === "combat") {
    const hero = room.state.heroes.find((h) => h.playerId === id);
    if (hero) p.plans[id] ??= defaultPlan(hero);
  }
  if (p.phase.kind === "camp") p.campVotes[id] = winningCamp(room.state, run.crewId);
  if (!run.ready.includes(id)) run.ready.push(id);
}

export function updateCrewPresence(room: StoredRoom, run: CrewRun, now: number) {
  if (run.finished) return;
  const members = eligibleMembers(room, run),
    connected = members.filter((id) => room.state.players.find((p) => p.id === id)?.connected);
  // Spirits remain present even when only living members can vote.
  const present = room.state.players.some((p) => p.crewId === run.crewId && p.connected);
  if (!present && !allReady(room, run)) {
    freezeClock(run.clock, now);
    if (!run.pauseReasons.includes("all-offline")) run.pauseReasons.push("all-offline");
    run.suspended = true;
    return;
  }
  if (run.suspended) {
    run.pauseReasons = run.pauseReasons.filter((r) => r !== "all-offline");
    run.suspended = false;
    if (
      !run.pauseReasons.length &&
      !room.pauseReasons.length &&
      !(room.state.trial || room.state.siege) &&
      room.speed !== "manual" &&
      (room.inactivityFallback ||
        !CREW_CHOICES.has(run.progress.phase.kind) ||
        room.duels.some((d) => d.status === "active" && d.crewIds.includes(run.crewId)))
    )
      resumeClock(run.clock, now);
  }
  if (
    !CREW_CHOICES.has(run.progress.phase.kind) ||
    room.duels.some((d) => d.status === "active" && d.crewIds.includes(run.crewId))
  )
    return;
  for (const id of members)
    if (connected.includes(id)) delete run.absentSince[id];
    else {
      run.absentSince[id] ??= now;
      if (now - run.absentSince[id] >= 15000 && !run.ready.includes(id))
        fillMissingChoice(room, run, id);
    }
}
