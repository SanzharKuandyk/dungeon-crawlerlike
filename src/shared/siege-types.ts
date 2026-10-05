export type SiegeRole = "attack" | "protect" | "supply";
export type SiegeState = {
  id: "siege-1";
  phase: "intro" | "choice" | "reveal" | "return";
  round: number;
  choices: Record<string, SiegeRole>;
  meters: Record<SiegeRole, number>;
  goals: Record<SiegeRole, number>;
  success: boolean;
  settled: boolean;
  resolvedRounds: number[];
};
