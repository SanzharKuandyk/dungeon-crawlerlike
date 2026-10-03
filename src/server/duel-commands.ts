import type { DuelAction } from "../shared/duel-types.js";
import { reject } from "./errors.js";
import type { StoredRoom } from "./room-types.js";

export function duelMember(room: StoredRoom, playerId: string) {
  if (room.state.status !== "running" || room.state.quizQuestionId)
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
  const node = room.state.expeditionMap?.nodes.find((node) => node.id === nodeId);
  if (
    !target ||
    target.id === hero.crewId ||
    target.status !== "active" ||
    !nodeId ||
    target.mapPosition?.nodeId !== nodeId ||
    !node ||
    !["battle", "elite"].includes(node.kind)
  )
    reject("INVALID", "Meet an active crew in the same battle room.");
  const ids = [hero.crewId, targetCrewId];
  if (
    room.state.heroes.some(
      (hero) => ids.includes(hero.crewId) && hero.status === "alive" && hero.hp < 2 * hero.power,
    )
  )
    reject("CLOSED", "Every fighter needs at least half health to enter a duel.");
  if (room.duels.some((duel) => duel.crewIds.every((id) => ids.includes(id))))
    reject("CLOSED", "This pair has already had a challenge.");
  for (const id of ids) {
    const run = room.runs[id];
    const history = room.duels.filter((duel) => duel.crewIds.includes(id));
    if (
      !run ||
      run.finished ||
      history.length >= 2 ||
      history.some((duel) => ["active", "offered"].includes(duel.status))
    )
      reject("CLOSED", "This crew is unavailable for a challenge.");
    if (
      history.some((duel) => {
        const prior = room.state.expeditionMap?.nodes.find((node) => node.id === duel.nodeId);
        return duel.status === "finished" && prior && node.row - prior.row < 3;
      })
    )
      reject("CLOSED", "This crew has two rooms of protection after its last duel.");
  }
  if (
    !["floor-result", "equipment", "return", "route"].includes(
      room.runs[hero.crewId].progress.phase.kind,
    )
  )
    reject("CLOSED", "Finish your encounter before challenging.");
  room.duels.push({
    id: `duel:${room.state.id}:${room.duels.length}`,
    nodeId,
    crewIds: [hero.crewId, targetCrewId],
    status: "offered",
    expiresAt: now + 30000,
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
  if (duel?.status !== "offered" || duel.expiresAt <= now || !duel.crewIds.includes(hero.crewId))
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
