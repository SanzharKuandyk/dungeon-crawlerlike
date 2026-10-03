import { randomUUID } from "node:crypto";
import type { HostRecovery, RecoveryIssue, RecoveryRedeem } from "../shared/recovery-types.js";
import { audit } from "./audit.js";
import { reject } from "./errors.js";
import { pauseRoom, requireLiveRoom } from "./room-lifecycle.js";
import type { StoredRoom } from "./room-types.js";
import { createSession, hashToken } from "./sessions.js";

export function issueRecovery(room: StoredRoom, input: RecoveryIssue, now: number) {
  requireLiveRoom(room, now);
  if (!room.state.players.some((p) => p.id === input.playerId))
    reject("NOT_FOUND", "Player not found.");
  const codeHash = hashToken(input.recoveryCode);
  const existing = room.recovery.find((r) => r.codeHash === codeHash);
  if (existing) {
    if (
      existing.playerId === input.playerId &&
      existing.redeemedBy === null &&
      existing.expiresAt > now
    )
      return;
    reject("CONFLICT", "Generate a new recovery code.");
  }
  room.recovery = room.recovery.filter(
    (r) => r.playerId !== input.playerId || r.redeemedBy !== null,
  );
  audit(
    room,
    {
      commandId: input.requestId,
      intervention: "recovery-issue",
      crewIds: [],
      playerId: input.playerId,
    },
    "A private device recovery code was issued.",
  );
  room.recovery.push({
    codeHash,
    playerId: input.playerId,
    expiresAt: now + 300000,
    requestId: input.requestId,
    redeemedBy: null,
  });
}
export function redeemRecovery(room: StoredRoom, input: RecoveryRedeem, now: number) {
  requireLiveRoom(room, now);
  const record = room.recovery.find((r) => r.codeHash === hashToken(input.recoveryCode));
  const tokenHash = hashToken(input.bootstrapSecret);
  if (!record) reject("RECOVERY_EXPIRED", "Invalid recovery code. Ask the host for a new one.");
  if (record.redeemedBy) {
    if (record.redeemedBy !== tokenHash || !room.sessions[tokenHash])
      reject("RECOVERY_EXPIRED", "This code was already used.");
    return { playerId: record.playerId };
  }
  if (record.expiresAt <= now)
    reject("RECOVERY_EXPIRED", "Recovery code expired. Ask the host for a new one.");
  for (const [hash, session] of Object.entries(room.sessions))
    if (session.role === "player" && session.playerId === record.playerId)
      delete room.sessions[hash];
  createSession(
    room.sessions,
    { role: "player", playerId: record.playerId },
    input.bootstrapSecret,
  );
  record.redeemedBy = tokenHash;
  audit(
    room,
    {
      commandId: record.requestId,
      intervention: "player-recovery",
      crewIds: [],
      playerId: record.playerId,
    },
    `${room.state.players.find((p) => p.id === record.playerId)?.name ?? "Player"}'s device reconnected.`,
  );
  return { playerId: record.playerId };
}
export function recoverHost(room: StoredRoom, input: HostRecovery, now: number) {
  requireLiveRoom(room, now);
  const hash = hashToken(input.bootstrapSecret);
  if (room.sessions[hash]?.role === "host") return;
  for (const [key, session] of Object.entries(room.sessions))
    if (session.role === "host") delete room.sessions[key];
  createSession(room.sessions, { role: "host", playerId: null }, input.bootstrapSecret);
  if (room.state.status === "running" || room.state.status === "paused")
    pauseRoom(room, "host", now);
  audit(
    room,
    { commandId: randomUUID(), intervention: "host-recovery", crewIds: [], playerId: null },
    "Host access recovered.",
  );
}
