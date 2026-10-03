import type { MatchState } from "./game-types.js";

export type DecisionClock = {
  deadline: number | null;
  remainingMs: number;
  elapsedMs: number;
  durationMs: number;
  startedAt: number;
};

export type CrewProgress = Pick<
  MatchState,
  | "depth"
  | "turn"
  | "globalTurn"
  | "phase"
  | "phaseId"
  | "actions"
  | "routeVotes"
  | "campVotes"
  | "withdrawVotes"
  | "equipmentChoices"
  | "resolvedActions"
  | "resolvedPhaseIds"
  | "treasureEquipmentDepths"
  | "before"
  | "events"
>;

export type CrewRun = {
  crewId: string;
  progress: CrewProgress;
  clock: DecisionClock;
  ready: string[];
  absentSince: Record<string, number>;
  suspended: boolean;
  pauseReasons: import("./host-types.js").CrewPauseReason[];
  finished: boolean;
  rewardCharges: 1 | 2 | null;
};

export type CrewRunView = Pick<
  CrewRun,
  "crewId" | "clock" | "pauseReasons" | "suspended" | "finished" | "rewardCharges"
> &
  Pick<CrewProgress, "depth" | "turn" | "phase" | "phaseId" | "before" | "events"> & {
    readyCount: number;
    memberCount: number;
  };
