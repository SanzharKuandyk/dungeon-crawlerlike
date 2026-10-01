import type { HostInput } from "../shared/protocol.js";
import { navigate } from "./navigation.js";
import { notifyError } from "./notify.js";
import { playerController } from "./player-controller.js";
import { room } from "./room.svelte.js";
import { type ClientSession, createClientSession } from "./session.js";

let player: ClientSession | null = null,
  routeGeneration = 0;
const key = (code: string, role: string) => `siege-session:${code}:${role}`;
export function secureSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
export function closeRoom() {
  routeGeneration++;
  player?.dispose();
  player = null;
  room.view = null;
  room.pending = 0;
  room.controller = null;
}
export function openRoom(code: string, role: "host" | "projector" | "player") {
  closeRoom();
  const generation = routeGeneration;
  room.status = "connecting";
  room.error = null;
  const token =
    role === "projector" ? undefined : (localStorage.getItem(key(code, role)) ?? undefined);
  player = createClientSession({
    code,
    role,
    token,
    onView: (view) => {
      if (generation !== routeGeneration) return;
      room.view = view;
      room.clockOffset = view.serverNow - Date.now();
    },
    onStatus: (status) => {
      if (generation === routeGeneration) room.status = status;
    },
    onPending: (count) => {
      if (generation === routeGeneration) room.pending = count;
    },
  });
  room.controller = playerController(player);
}
export async function checkHealth() {
  try {
    const response = await fetch("/api/health");
    room.testEnabled = (await response.json()).testMode === true;
  } catch {
    room.error = "Cannot reach the server.";
  }
}
async function post(path: string, body: unknown) {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message ?? "Request failed.");
    return data as { code: string; hostToken: string };
  } catch (error) {
    notifyError(error instanceof Error ? error.message : "Cannot reach the server.");
    return null;
  } finally {
    clearTimeout(timer);
  }
}
export async function createRoom() {
  const storageKey = "siege-create-key";
  const secret = localStorage.getItem(storageKey) ?? secureSecret();
  localStorage.setItem(storageKey, secret);
  const created = await post("/api/rooms", { bootstrapSecret: secret });
  if (!created) return;
  localStorage.setItem(key(created.code, "host"), secret);
  localStorage.removeItem(storageKey);
  navigate("host", created.code);
}
export async function joinPlayer(name: string) {
  if (!player || !room.view) return;
  const storageKey = key(room.view.code, "player");
  const secret = localStorage.getItem(storageKey) ?? secureSecret();
  localStorage.setItem(storageKey, secret);
  await player.join(name, secret);
}
export const createCrew = (name: string) =>
  player?.command((env, ack) => player?.socket.emit("crew:create", { ...env, name }, ack));
export const joinCrew = (crewId: string) =>
  player?.command((env, ack) => player?.socket.emit("crew:join", { ...env, crewId }, ack));
export function hostControl(
  action: HostInput["action"],
  extra: Pick<HostInput, "enabled" | "speed"> = {},
) {
  const active = player;
  return active?.command((env, ack) =>
    active.socket.emit("host:control", { ...env, action, ...extra }, ack),
  );
}
export function reconnect() {
  player?.reconnect();
}
export function readHistory(before: number) {
  return new Promise<import("../shared/event-types.js").GameEvent[]>((resolve) => {
    if (!player?.ready) {
      resolve([]);
      return;
    }
    const timer = setTimeout(() => resolve([]), 5000);
    player.socket.emit("history:read", { before }, (result) => {
      clearTimeout(timer);
      resolve(result.ok ? result.value : []);
    });
  });
}
