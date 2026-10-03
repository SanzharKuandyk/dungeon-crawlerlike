import type { HostCommand } from "../shared/host-types.js";
import type { ClientSession } from "./session.js";
export function hostController(session: ClientSession) {
  return {
    command(command: HostCommand) {
      return session.command((env, ack) =>
        session.socket.emit("host:control", { ...env, command }, ack),
      );
    },
    issueRecovery(playerId: string, recoveryCode: string) {
      return session.command((env, ack) =>
        session.socket.emit("host:recovery-issue", { ...env, playerId, recoveryCode }, ack),
      );
    },
  };
}
export type HostController = ReturnType<typeof hostController>;
