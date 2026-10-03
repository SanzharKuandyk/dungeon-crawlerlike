import { hostSchema, recoveryIssueSchema, testControlSchema } from "../shared/host-validation.js";
import { rosterSchema } from "../shared/validation.js";
import { reject } from "./errors.js";
import { hostControl } from "./handlers/host.js";
import { changeRoster } from "./handlers/lobby.js";
import { issueRecovery } from "./recovery.js";
import type { RoomManager } from "./room-manager.js";
import { hashToken } from "./sessions.js";
import type { BindingGetter, GameSocket, Responder } from "./socket-types.js";
import { testControl } from "./test-controls.js";
export function attachHostSockets(
  socket: GameSocket,
  manager: RoomManager,
  binding: BindingGetter,
  respond: Responder,
  clock: () => number,
) {
  const host = () => {
    const value = binding();
    if (value.session?.role !== "host") reject("UNAUTHORIZED", "Host access required.");
    return value;
  };
  socket.on(
    "host:control",
    (input, ack) =>
      void respond(ack, async () => {
        const parsed = hostSchema.parse(input);
        return manager.command(host(), parsed, parsed, (r) => hostControl(r, parsed, clock()));
      }),
  );
  socket.on(
    "host:roster",
    (input, ack) =>
      void respond(ack, async () => {
        const parsed = rosterSchema.parse(input);
        return manager.command(host(), parsed, parsed, (r) => changeRoster(r, parsed));
      }),
  );
  socket.on(
    "host:recovery-issue",
    (input, ack) =>
      void respond(ack, async () => {
        const parsed = recoveryIssueSchema.parse(input);
        return manager.command(
          host(),
          parsed,
          { ...parsed, recoveryCode: hashToken(parsed.recoveryCode) },
          (r) => issueRecovery(r, parsed, clock()),
        );
      }),
  );
  socket.on(
    "test:control",
    (input, ack) =>
      void respond(ack, async () => {
        const parsed = testControlSchema.parse(input);
        return manager.command(host(), parsed, parsed, (r) => testControl(r, parsed, clock()));
      }),
  );
}
