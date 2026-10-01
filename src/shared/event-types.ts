import type { Crew, Hero, RoomEncounter } from "./game-types.js";

type EventBase = {
  id: string;
  sequence: number;
  phaseId: number;
  depth: number;
  turn: number;
  roomId: string | null;
  at: number;
  cause: string;
  message: string;
};
export type GameEvent = EventBase &
  (
    | { kind: "hero"; actor: string; hero: Hero }
    | { kind: "enemy"; actor: string | null; encounter: RoomEncounter }
    | { kind: "crew"; actor: string; crew: Crew }
    | { kind: "story"; actor: string | null }
  );
