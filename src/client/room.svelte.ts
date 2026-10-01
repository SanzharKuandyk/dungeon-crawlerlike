import type { RoomView } from "../shared/view-types.js";
import type { PlayerController } from "./player-controller.js";
export type ConnectionStatus = "connecting" | "resuming" | "ready" | "reconnecting" | "invalid";
export const room = $state<{
  view: RoomView | null;
  status: ConnectionStatus;
  error: string | null;
  testEnabled: boolean;
  pending: number;
  clockOffset: number;
  controller: PlayerController | null;
}>({
  view: null,
  status: "connecting",
  error: null,
  testEnabled: false,
  pending: 0,
  clockOffset: 0,
  controller: null,
});
export const preferences = $state({
  muted: localStorage.getItem("heist-muted") !== "false",
  reducedMotion:
    localStorage.getItem("heist-motion") === "reduced" ||
    matchMedia("(prefers-reduced-motion: reduce)").matches,
});
