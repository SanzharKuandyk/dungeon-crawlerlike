import type { DuelAction } from "../shared/duel-types.js";
import { reject } from "./errors.js";
import type { StoredRoom } from "./room-types.js";

export function duelMember(room: StoredRoom, playerId: string) {
  if (room.state.status !== "running" || room.state.trial?.id)
    reject("CLOSED", "Finish the current event first.");
  const hero = room.state.heroes.find(
    (hero) => hero.playerId === playerId && hero.status === "alive",
  );
  if (!hero) reject("INVALID", "Only living crew members can challenge.");
  return hero;
}
export function challenge(room: StoredRoom, playerId: string, targetCrewId: string, now: number) {
  if (!room.pvpEnabled) reject("CLOSED", "New challenges are disabled by the host.");
  const hero = duelMember(room, playerId);
  const own = room.state.crews.find((crew) => crew.id === hero.crewId);
  const target = room.state.crews.find((crew) => crew.id === targetCrewId);
  const nodeId = own?.mapPosition?.nodeId;
  const ownRun = room.runs[hero.crewId];
  const node = room.state.chapterMaps[(ownRun?.progress.chapter ?? 1) - 1].nodes.find(
    (n) => n.id === nodeId,
  );
  const ids = [hero.crewId, targetCrewId];
  if (
    !target ||
    target.id === hero.crewId ||
    target.status !== "active" ||
    !node ||
    node.kind !== "arena" ||
    room.runs[targetCrewId]?.progress.chapter !== ownRun.progress.chapter ||
    room.runs[targetCrewId]?.progress.phase.kind !== "camp"
  )
    reject("INVALID", "Meet a willing crew at an arena in the same chapter.");
  for (const waiting of room.duels)
    if (waiting.npc && waiting.status === "offered" && ids.includes(waiting.crewIds[0]))
      waiting.status = "declined";
  for (const id of ids)
    if (
      !room.runs[id] ||
      room.runs[id].finished ||
      room.runs[id].progress.phase.kind !== "camp" ||
      room.duels.some((d) => d.crewIds.includes(id) && d.status !== "declined")
    )
      reject("CLOSED", "Each crew may enter one arena duel per expedition.");
  if (
    room.state.heroes.some(
      (h) => ids.includes(h.crewId) && h.status === "alive" && h.hp < 2 * h.power,
    )
  )
    reject("CLOSED", "Every fighter needs half health.");
  room.duels.push({
    id: `duel:${room.state.id}:${room.duels.length}`,
    nodeId: node.id,
    crewIds: [hero.crewId, targetCrewId],
    status: "offered",
    expiresAt: now + 20000,
    remaining: null,
    votes: { [playerId]: true },
    turn: 1,
    phase: "choice",
    actions: {},
    stakes: {},
    damage: {},
    capacity: {},
    winner: null,
    saved: {},
  });
}
export function voteDuel(
  room: StoredRoom,
  playerId: string,
  duelId: string,
  accept: boolean,
  now: number,
) {
  const hero = duelMember(room, playerId);
  const duel = room.duels.find((duel) => duel.id === duelId);
  if (
    (duel?.status !== "offered" && duel?.status !== "champion-offer") ||
    (duel.status === "offered" && duel.expiresAt <= now) ||
    !duel.crewIds.includes(hero.crewId)
  )
    reject("CLOSED", "This challenge is closed.");
  duel.votes[playerId] = accept;
  if (!accept) duel.status = "declined";
}
export function submitDuel(
  room: StoredRoom,
  playerId: string,
  duelId: string,
  action: DuelAction,
  now: number,
) {
  const hero = duelMember(room, playerId);
  const duel = room.duels.find((duel) => duel.id === duelId);
  if (duel?.status !== "active" || duel.phase !== "choice" || !duel.crewIds.includes(hero.crewId))
    reject("CLOSED", "This duel decision is closed.");
  const run = room.runs[hero.crewId];
  if (run.clock.deadline !== null && now >= run.clock.deadline)
    reject("CLOSED", "The duel choice has locked.");
  if (
    action.kind !== "guard" &&
    !(duel.npc && action.targetHeroId === "champion") &&
    !room.state.heroes.some(
      (target) =>
        target.id === action.targetHeroId &&
        target.status === "alive" &&
        target.crewId !== hero.crewId &&
        duel.crewIds.includes(target.crewId),
    )
  )
    reject("INVALID", "Choose a living rival.");
  duel.actions[playerId] = action;
}

export function queueArena(room: StoredRoom, playerId: string, now: number) {
  const hero = duelMember(room, playerId),
    run = room.runs[hero.crewId];
  const node = room.state.chapterMaps[run.progress.chapter - 1].nodes.find(
    (n) => n.id === run.progress.nodeId,
  );
  if (
    !room.pvpEnabled ||
    run.progress.phase.kind !== "camp" ||
    node?.kind !== "arena" ||
    room.duels.some((d) => d.crewIds.includes(hero.crewId) && d.status !== "declined")
  )
    reject("CLOSED", "Wait for a challenger at an unused arena.");
  if (
    room.state.heroes.some(
      (h) => h.crewId === hero.crewId && h.status === "alive" && h.hp < 2 * h.power,
    )
  )
    reject("CLOSED", "Every fighter needs half health.");
  room.duels.push({
    id: `duel:${room.state.id}:${room.duels.length}`,
    nodeId: node.id,
    crewIds: [hero.crewId, "champion"],
    npc: { hp: 48, maxHp: 48 },
    status: "offered",
    expiresAt: now + 20000,
    remaining: null,
    votes: {},
    turn: 1,
    phase: "choice",
    actions: {},
    stakes: {},
    damage: {},
    capacity: {},
    winner: null,
    saved: {},
  });
}
