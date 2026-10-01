import type { GameEvent } from "../shared/event-types.js";
export function eventMessage(event: GameEvent) {
  return event.message;
}
