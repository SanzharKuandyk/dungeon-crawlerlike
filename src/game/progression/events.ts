import type { GameEvent } from "../../shared/event-types.js";
import type { MatchState } from "../../shared/game-types.js";

type Payload = GameEvent extends infer E
  ? E extends GameEvent
    ? Omit<
        E,
        "id" | "sequence" | "phaseId" | "depth" | "turn" | "at" | "cause" | "message" | "roomId"
      >
    : never
  : never;
export function expeditionEvent(
  state: MatchState,
  crewId: string,
  payload: Payload,
  message: string,
  at: number,
  cause: string,
) {
  const progress = state.crewProgress[crewId];
  const sequence = state.history.length + 1;
  const event = {
    ...structuredClone(payload),
    id: `${state.id}:${sequence}`,
    sequence,
    phaseId: progress.phaseId,
    depth: progress.depth,
    turn: progress.turn,
    roomId: progress.encounterId,
    at,
    cause,
    message,
  } as GameEvent;
  progress.events.push(event);
  state.history.push(event);
}
export function beginCrewResolution(state: MatchState, crewId: string) {
  const p = state.crewProgress[crewId];
  if (p.resolvedPhaseIds.includes(p.phaseId)) throw new Error("Phase already resolved.");
  p.resolvedPhaseIds.push(p.phaseId);
  p.before = structuredClone({
    heroes: state.heroes.filter((h) => h.crewId === crewId),
    crews: state.crews.filter((c) => c.id === crewId),
    encounters: state.encounters.filter((e) => e.crewIds.includes(crewId)),
  });
  p.events = [];
}
