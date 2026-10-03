import type { Envelope } from "./protocol.js";
export type RecoveryIssue = Envelope & { playerId: string; recoveryCode: string };
export type RecoveryRedeem = { code: string; recoveryCode: string; bootstrapSecret: string };
export type HostRecovery = { code: string; installationKey: string; bootstrapSecret: string };
export type RecoveryRecord = {
  codeHash: string;
  playerId: string;
  expiresAt: number;
  requestId: string;
  redeemedBy: string | null;
};
