export type DecisionClock = {
  deadline: number | null;
  remainingMs: number;
  elapsedMs: number;
  durationMs: number;
  startedAt: number;
};

export type CrewProgress = import("./progression-types.js").CrewProgress;

export type CrewRun = {
  crewId: string;
  progress: CrewProgress;
  clock: DecisionClock;
  ready: string[];
  absentSince: Record<string, number>;
  suspended: boolean;
  pauseReasons: import("./host-types.js").CrewPauseReason[];
  finished: boolean;
};

export type CrewRunView = Pick<
  CrewRun,
  "crewId" | "clock" | "pauseReasons" | "suspended" | "finished"
> &
  Pick<CrewProgress, "depth" | "turn" | "phase" | "phaseId" | "before" | "events"> & {
    readyCount: number;
    memberCount: number;
  };
