import type { GameEvent } from "../shared/event-types.js";
import type { ArenaState, Crew, Hero, MatchState, RoomEncounter } from "../shared/game-types.js";

type Payload =
  | { kind: "hero"; actor: string; hero: Hero }
  | { kind: "crew"; actor: string; crew: Crew }
  | { kind: "enemy"; actor: string | null; encounter: RoomEncounter }
  | { kind: "story"; actor: string | null };
export function arenaState(s: MatchState): ArenaState {
  return structuredClone({ heroes: s.heroes, crews: s.crews, encounters: s.encounters });
}
export function beginEvents(s: MatchState) {
  s.before = arenaState(s);
  s.events = [];
}
function append(
  s: MatchState,
  payload: Payload,
  message: string,
  at: number,
  cause: string,
  roomId: string | null,
) {
  const sequence = s.history.length + 1;
  const event: GameEvent = {
    ...payload,
    id: `${s.id}:${sequence}`,
    sequence,
    phaseId: s.phaseId,
    depth: s.depth,
    turn: s.turn,
    roomId,
    at,
    cause,
    message,
  };
  s.events.push(event);
  s.history.push(event);
}
export function heroName(s: MatchState, h: Hero) {
  return s.players.find((p) => p.id === h.playerId)?.name ?? "Hero";
}
export function heroEvent(s: MatchState, h: Hero, message: string, at: number, cause = "action") {
  const c = s.crews.find((c) => c.id === h.crewId);
  append(
    s,
    { kind: "hero", actor: h.id, hero: structuredClone(h) },
    message,
    at,
    cause,
    c?.location.kind === "room" ? c.location.roomId : null,
  );
}
export function crewEvent(s: MatchState, c: Crew, message: string, at: number, cause = "treasure") {
  append(
    s,
    { kind: "crew", actor: c.id, crew: structuredClone(c) },
    message,
    at,
    cause,
    c.location.kind === "room" ? c.location.roomId : null,
  );
}
export function enemyEvent(
  s: MatchState,
  e: RoomEncounter,
  message: string,
  at: number,
  cause = "enemy",
  actor: string | null = null,
) {
  append(s, { kind: "enemy", actor, encounter: structuredClone(e) }, message, at, cause, e.id);
}
export function storyEvent(
  s: MatchState,
  message: string,
  at = 0,
  cause = "story",
  actor: string | null = null,
  roomId: string | null = null,
) {
  append(s, { kind: "story", actor }, message, at, cause, roomId);
}
export function lockResolution(s: MatchState) {
  if (s.resolvedPhaseIds.includes(s.phaseId)) throw new Error("Phase already resolved.");
  s.resolvedPhaseIds.push(s.phaseId);
}

export function finalizeEvents(s: MatchState) {
  const start = s.history.length - s.events.length;
  s.events.sort((a, b) => a.at - b.at);
  s.events = s.events.map((event, i) => ({
    ...event,
    sequence: start + i + 1,
    id: `${s.id}:${start + i + 1}`,
  }));
  s.history.splice(start, s.history.length - start, ...s.events);
}
