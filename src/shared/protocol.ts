import type { CampChoice, EquipmentChoice, HeroAction } from "./command-types.js";
import type { ClassId } from "./content-types.js";
import type { DuelAction } from "./duel-types.js";
import type { GameEvent } from "./event-types.js";
import type { Crew } from "./game-types.js";
import type { RoomView } from "./view-types.js";

export type ErrorCode =
  | "INVALID"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "STALE"
  | "CLOSED"
  | "CONFLICT"
  | "READ_ONLY"
  | "SAVE_FAILED"
  | "OFFLINE"
  | "ROOM_CLOSED"
  | "SESSION_EXPIRED"
  | "INTERNAL"
  | "RATE_LIMITED"
  | "BUSY"
  | "PAUSED"
  | "RECOVERY_EXPIRED";
export type ActionResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: ErrorCode; message: string; retryAfterMs?: number };
export type Receipt = { revision: number; code?: string; playerId?: string };
export type Envelope = { requestId: string; matchId: string; phaseId: number };
export type Ack = (result: ActionResult<Receipt>) => void;
export type HostInput = import("./host-types.js").HostCommandInput;
export type HostAction = import("./host-types.js").HostCommand["kind"];
export type RosterChange =
  | { action: "remove-player"; playerId: string }
  | { action: "delete-crew"; crewId: string };
export type RosterInput = Envelope & RosterChange;
export interface ClientEvents {
  "session:join": (
    input: { code: string; name: string; bootstrapSecret: string },
    ack: Ack,
  ) => void;
  "session:resume": (input: { code: string; token?: string; takeover?: boolean }, ack: Ack) => void;
  "session:sync": (
    input: { pending: string[] },
    ack: (result: ActionResult<{ view: RoomView; receipts: Record<string, Receipt> }>) => void,
  ) => void;
  "crew:create": (input: Envelope & { name: string }, ack: Ack) => void;
  "crew:join": (input: Envelope & { crewId: string }, ack: Ack) => void;
  "hero:class": (input: Envelope & { classId: ClassId }, ack: Ack) => void;
  "route:vote": (input: Envelope & { roomId: string }, ack: Ack) => void;
  "hero:action": (input: Envelope & { action: HeroAction }, ack: Ack) => void;
  "pvp:challenge": (input: Envelope & { targetCrewId: string }, ack: Ack) => void;
  "pvp:vote": (input: Envelope & { duelId: string; accept: boolean }, ack: Ack) => void;
  "pvp:action": (input: Envelope & { duelId: string; action: DuelAction }, ack: Ack) => void;
  "decision:edit": (input: Envelope, ack: Ack) => void;
  "crew:withdraw": (input: Envelope & { withdraw: boolean }, ack: Ack) => void;
  "camp:vote": (input: Envelope & { choice: CampChoice }, ack: Ack) => void;
  "learning:answer": (
    input: Envelope & { questionId: string; choice: number; pact?: "careful" | "blood" },
    ack: Ack,
  ) => void;
  "equipment:choose": (input: Envelope & { item: EquipmentChoice }, ack: Ack) => void;
  "host:control": (input: HostInput, ack: Ack) => void;
  "test:control": (
    input: Envelope & { command: import("./host-types.js").TestCommand },
    ack: Ack,
  ) => void;
  "host:recovery-issue": (input: import("./recovery-types.js").RecoveryIssue, ack: Ack) => void;
  "session:recover": (input: import("./recovery-types.js").RecoveryRedeem, ack: Ack) => void;
  "host:roster": (input: RosterInput, ack: Ack) => void;
  "test:answer": (
    input: Envelope,
    ack: (result: ActionResult<{ choice: number | null }>) => void,
  ) => void;
  "history:read": (
    input: { before: number },
    ack: (result: ActionResult<GameEvent[]>) => void,
  ) => void;
}
export interface ServerEvents {
  "room:positions": (input: {
    matchId: string;
    revision: number;
    serverNow: number;
    crews: Pick<Crew, "id" | "mapPosition" | "status">[];
  }) => void;
  "room:closed": (view: RoomView) => void;
  "session:removed": () => void;
  "room:snapshot": (view: RoomView) => void;
  "session:error": (error: { code: ErrorCode; message: string }) => void;
}
export type TestScenario =
  | "duel"
  | "fresh"
  | "split"
  | "treasure"
  | "critical"
  | "question"
  | "final"
  | "rivalry";
export type TestBootstrap = {
  code: string;
  players: { playerId: string; crewId: string; clientId: string }[];
};
