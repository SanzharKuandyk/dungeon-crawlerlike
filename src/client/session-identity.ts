import type { Socket } from "socket.io-client";
import type { ActionResult, ClientEvents, Receipt, ServerEvents } from "../shared/protocol.js";

type IdentityInput =
  | { kind: "join"; code: string; name: string; bootstrapSecret: string }
  | { kind: "recover"; code: string; recoveryCode: string; bootstrapSecret: string };
export function submitIdentity(socket: Socket<ServerEvents, ClientEvents>, input: IdentityInput) {
  return new Promise<ActionResult<Receipt>>((resolve) => {
    const timer = setTimeout(
      () =>
        resolve({
          ok: false,
          code: "OFFLINE",
          message:
            input.kind === "join"
              ? "Joining timed out. Retry with the same nickname."
              : "Recovery timed out. Retry the same code.",
        }),
      12000,
    );
    const ack = (result: ActionResult<Receipt>) => {
      clearTimeout(timer);
      resolve(result);
    };
    if (input.kind === "join")
      socket.emit(
        "session:join",
        { code: input.code, name: input.name, bootstrapSecret: input.bootstrapSecret },
        ack,
      );
    else
      socket.emit(
        "session:recover",
        {
          code: input.code,
          recoveryCode: input.recoveryCode,
          bootstrapSecret: input.bootstrapSecret,
        },
        ack,
      );
  });
}
