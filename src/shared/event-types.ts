import type { Crew, Hero, RoomEncounter } from "./game-types.js";

export type CombatEffect =
  | {
      type: "hit";
      action: string;
      target: string;
      part: "body" | "hero";
      attempted: number;
      blocked: number;
      damage: number;
      sources?: { label: string; amount: number }[];
    }
  | { type: "heal" | "barrier" | "ward"; target: string; amount: number }
  | { type: "interrupt" | "death" | "panic" | "loot"; target: string; amount: number };

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
    | {
        kind: "hero";
        actor: string;
        hero: Hero;
        exploration?: { landing: "heads" | "tails" | null; success: boolean | null };
      }
    | { kind: "enemy"; actor: string | null; encounter: RoomEncounter }
    | { kind: "crew"; actor: string; crew: Crew }
    | ({ kind: "host-intervention"; actor: null } & import("./host-types.js").HostIntervention)
    | { kind: "story"; actor: string | null }
    | { kind: "effect"; actor: string; effect: CombatEffect }
  );
