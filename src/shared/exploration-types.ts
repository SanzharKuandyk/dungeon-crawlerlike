export type ExplorationChoice =
  | { kind: "coin"; side: "heads" | "tails"; prize: "gold" | "blessing" }
  | { kind: "risk" | "sacrifice" | "recover-health" | "recover-stress" | "leave" };
export type ExplorationState = {
  nodeId: string;
  allowances: Record<string, number>;
  choices: Record<string, ExplorationChoice>;
  outcomes: {
    heroId: string;
    message: string;
    landing: "heads" | "tails" | null;
    success: boolean | null;
  }[];
  resolved: boolean;
  rolls: Record<string, { chance: number; reward: number }>;
};
