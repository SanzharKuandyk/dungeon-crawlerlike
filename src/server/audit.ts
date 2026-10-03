import type { HostIntervention } from "../shared/host-types.js";
import type { StoredRoom } from "./room-types.js";
export function audit(room: StoredRoom, data: HostIntervention, message: string) {
  const state = room.state;
  const sequence = state.history.length + 1;
  state.history.push({
    ...data,
    kind: "host-intervention",
    actor: null,
    id: `${state.id}:${sequence}`,
    sequence,
    phaseId: state.phaseId,
    depth: state.depth,
    turn: state.turn,
    roomId: null,
    at: 0,
    cause: "host-intervention",
    message,
  });
}
