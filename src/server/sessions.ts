import { createHash, randomBytes } from "node:crypto";

export type Session = { role: "host"; playerId: null } | { role: "player"; playerId: string };
export const newToken = () => randomBytes(32).toString("hex");
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export function createSession(
  sessions: Record<string, Session>,
  session: Session,
  token = newToken(),
) {
  sessions[hashToken(token)] = session;
  return token;
}
export function findSession(
  sessions: Record<string, Session>,
  token: string | undefined,
): Session | null {
  return token ? (sessions[hashToken(token)] ?? null) : null;
}
