import type { Envelope } from "./protocol.js";

export type RoomPauseReason = "host" | "host-offline" | "server-restart" | "save-failed";
export type CrewPauseReason = "host" | "all-offline";
export type RoomLifecycle =
  | { kind: "live"; hostDisconnectedAt: number | null }
  | { kind: "closed"; closedAt: number; reason: "ended" | "completed" };
export type HostCommand =
  | { kind: "start" | "pause" | "resume" | "end" }
  | { kind: "learning" | "fallback" | "pvp-policy"; enabled: boolean }
  | {
      kind: "crew-pause" | "crew-resume" | "crew-extend" | "crew-resolve";
      crewId: string;
      expectedCrewPhaseId: number;
    }
  | {
      kind: "duel-cancel";
      duelId: string;
      expectedTurn: number;
      expectedDuelPhase: "choice" | "reveal";
    }
  | { kind: "question-skip"; questionId: string };
export type HostCommandInput = Envelope & { command: HostCommand };
export type TestCommand =
  | { kind: "advance" }
  | { kind: "speed"; speed: "normal" | "fast" | "manual" };
export type HostIntervention = {
  commandId: string;
  intervention: HostCommand["kind"] | "player-recovery" | "host-recovery" | "recovery-issue";
  crewIds: string[];
  playerId: string | null;
};
