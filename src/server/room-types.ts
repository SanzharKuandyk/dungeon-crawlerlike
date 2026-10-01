import type { MatchState } from "../shared/game-types.js";
import type { Receipt } from "../shared/protocol.js";
import type { Session } from "./sessions.js";
export type StoredRoom = {
  schemaVersion: 4;
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
};
export type Binding = {
  code: string;
  session: Session | null;
  tokenHash: string | null;
  readOnly: boolean;
};
