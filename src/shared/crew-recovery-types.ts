export type CrewRecoveryCommand =
  | { kind: "revive"; targetHeroId: string; payment: "gold" | "debt" }
  | { kind: "request-help" };
