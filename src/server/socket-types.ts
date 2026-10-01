import type { Socket } from "socket.io";
import type { ActionResult, ClientEvents, ServerEvents } from "../shared/protocol.js";
import type { Binding } from "./room-types.js";
export type GameSocket = Socket<ClientEvents, ServerEvents>;
export type Responder = <T>(
  ack: (result: ActionResult<T>) => void,
  task: () => Promise<ActionResult<T>>,
) => Promise<void>;
export type BindingGetter = (player?: boolean) => Binding;
