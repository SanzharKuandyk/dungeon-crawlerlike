import type { RoomView } from "../shared/view-types.js";
import type { PlayerController } from "./player-controller.js";
import { browserStorage } from "./storage.js";

export type ConnectionStatus = "connecting" | "resuming" | "ready" | "reconnecting" | "invalid";
export const room = $state<{
  view: RoomView | null;
  status: ConnectionStatus;
  error: string | null;
  testEnabled: boolean;
  pending: number;
  clockOffset: number;
  controller: PlayerController | null;
  hostController: import("./host-controller.js").HostController | null;
}>({
  view: null,
  status: "connecting",
  error: null,
  testEnabled: false,
  pending: 0,
  clockOffset: 0,
  controller: null,
  hostController: null,
});
export const preferences = $state({
  muted: browserStorage.getItem("heist-muted") !== "false",
  reducedMotion:
    browserStorage.getItem("heist-motion") === "reduced" ||
    matchMedia("(prefers-reduced-motion: reduce)").matches,
});
