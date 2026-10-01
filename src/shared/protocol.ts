import type { CampChoice, EquipmentChoice, HeroAction } from "./command-types.js";
import type { ClassId } from "./content-types.js";
import type { GameEvent } from "./event-types.js";
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
  | "OFFLINE";
export type ActionResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: ErrorCode; message: string };
export type Receipt = { revision: number; code?: string; playerId?: string };
export type Envelope = { requestId: string; matchId: string; phaseId: number };
export type Ack = (result: ActionResult<Receipt>) => void;
export type HostAction = "start" | "pause" | "resume" | "end" | "learning" | "advance" | "speed";
export type HostInput = Envelope & {
  action: HostAction;
  enabled?: boolean;
  speed?: "normal" | "fast" | "manual";
};
export interface ClientEvents {
  "session:join": (
    input: { code: string; name: string; bootstrapSecret: string },
    ack: Ack,
  ) => void;
  "session:resume": (input: { code: string; token?: string }, ack: Ack) => void;
  "session:sync": (
    input: { pending: string[] },
    ack: (result: ActionResult<{ view: RoomView; receipts: Record<string, Receipt> }>) => void,
  ) => void;
  "crew:create": (input: Envelope & { name: string }, ack: Ack) => void;
  "crew:join": (input: Envelope & { crewId: string }, ack: Ack) => void;
  "hero:class": (input: Envelope & { classId: ClassId }, ack: Ack) => void;
  "route:vote": (input: Envelope & { roomId: string }, ack: Ack) => void;
  "hero:action": (input: Envelope & { action: HeroAction }, ack: Ack) => void;
  "crew:withdraw": (input: Envelope & { withdraw: boolean }, ack: Ack) => void;
  "camp:vote": (input: Envelope & { choice: CampChoice }, ack: Ack) => void;
  "learning:answer": (input: Envelope & { questionId: string; choice: number }, ack: Ack) => void;
  "equipment:choose": (input: Envelope & { item: EquipmentChoice }, ack: Ack) => void;
  "host:control": (input: HostInput, ack: Ack) => void;
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
  "room:snapshot": (view: RoomView) => void;
  "session:error": (error: { code: ErrorCode; message: string }) => void;
}
export type TestScenario = "fresh" | "split" | "treasure" | "critical" | "question" | "final";
export type TestBootstrap = {
  code: string;
  players: { playerId: string; crewId: string; clientId: string }[];
};
