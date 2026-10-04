import type { CrewRun } from "../shared/crew-run-types.js";
import type { Duel } from "../shared/duel-types.js";
import type { MatchState } from "../shared/game-types.js";
import type { Receipt } from "../shared/protocol.js";
import type { Session } from "./sessions.js";

export type StoredRoom = {
  schemaVersion: 9;
  savedAt: number;
  absentSince: Record<string, number>;
  pauseReasons: import("../shared/host-types.js").RoomPauseReason[];
  timer: import("../shared/crew-run-types.js").DecisionClock;
  pvpEnabled: boolean;
  recovery: import("../shared/recovery-types.js").RecoveryRecord[];
  duels: Duel[];
  creationKeyHash: string;
  state: MatchState;
  sessions: Record<string, Session>;
  deadline: number | null;
  remaining: number | null;
  phaseStartedAt: number;
  phaseDuration: number;
  speed: "manual" | "normal" | "fast";
  storageError: string | null;
  testMode: boolean;
  processed: Record<string, { fingerprint: string; receipt: Receipt }>;
  runs: Record<string, CrewRun>;
  decisionSerial: number;
  inactivityFallback: boolean;
  discovery: { cause: string; depth: number } | null;
  lifecycle: import("../shared/host-types.js").RoomLifecycle;
};
export type Binding = {
  code: string;
  session: Session | null;
  tokenHash: string | null;
  readOnly: boolean;
};
