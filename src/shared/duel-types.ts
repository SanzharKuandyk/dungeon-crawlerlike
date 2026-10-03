import type { CrewProgress, DecisionClock } from "./crew-run-types.js";
import type { Crew } from "./game-types.js";

export type DuelAction = { kind: "strike" | "guard" | "feint"; targetHeroId?: string };
export type Duel = {
  id: string;
  nodeId: string;
  crewIds: [string, string];
  status: "offered" | "active" | "finished" | "declined";
  expiresAt: number;
  remaining: number | null;
  votes: Record<string, boolean>;
  turn: number;
  phase: "choice" | "reveal";
  actions: Record<string, DuelAction>;
  stakes: Record<string, number>;
  damage: Record<string, number>;
  capacity: Record<string, number>;
  winner: string | null;
  saved: Record<
    string,
    { progress: CrewProgress; clock: DecisionClock; location: Crew["location"] }
  >;
};
export type DuelView = Pick<
  Duel,
  | "id"
  | "nodeId"
  | "crewIds"
  | "status"
  | "expiresAt"
  | "turn"
  | "phase"
  | "stakes"
  | "damage"
  | "winner"
> & {
  consent: { crewId: string; yes: number; needed: number }[];
  ownVote: boolean | null;
  ownAction: DuelAction | null;
  readyCount: number;
  memberCount: number;
};
