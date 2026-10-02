import { randomUUID } from "node:crypto";
import { shuffled } from "../../game/random.js";
import type { ClassId } from "../../shared/content-types.js";
import { TEAM_COLORS } from "../../shared/palette.js";
import type { RosterChange } from "../../shared/protocol.js";
import { nameSchema } from "../../shared/validation.js";
import { reject } from "../errors.js";
import type { StoredRoom } from "../room-types.js";
import { createSession, findSession } from "../sessions.js";
export function joinPlayer(room: StoredRoom, name: string, secret: string) {
  const existing = findSession(room.sessions, secret);
  if (existing) {
    if (existing.role !== "player") reject("CONFLICT", "This key belongs to a host.");
    return { playerId: existing.playerId };
  }
  if (room.state.status !== "lobby")
    reject("CLOSED", "The expedition has started. Existing players can reconnect.");
  const id = randomUUID();
  room.state.players.push({
    id,
    name: nameSchema.parse(name),
    crewId: null,
    connected: false,
    bot: false,
    classId: "knight",
    classNotice: null,
  });
  createSession(room.sessions, { role: "player", playerId: id }, secret);
  return { playerId: id };
}
function updateCrew(room: StoredRoom, id: string) {
  const s = room.state,
    c = s.crews.find((c) => c.id === id);
  if (!c) return;
  const members = s.players.filter((p) => p.crewId === id);
  if (!members.length) {
    s.crews = s.crews.filter((c) => c.id !== id);
    return;
  }
  c.playerIds = members.map((p) => p.id);
  c.startingSize = members.length as 1 | 2 | 3 | 4;
  for (const p of members)
    if (members.length > (s.content.classes.find((c) => c.id === p.classId)?.maxCrewSize ?? 4)) {
      p.classId = "knight";
      p.classNotice = "Your crew now has more than two members. Your class changed to Knight.";
    }
}
export function joinCrew(room: StoredRoom, playerId: string, crewId: string) {
  const s = room.state;
  if (s.status !== "lobby") reject("CLOSED", "Crews are locked after starting.");
  const p = s.players.find((p) => p.id === playerId);
  if (!p || !s.crews.some((c) => c.id === crewId)) reject("INVALID", "Choose an existing crew.");
  if (p.crewId === crewId) return;
  if (s.players.filter((p) => p.crewId === crewId).length >= 4)
    reject("CLOSED", "That crew already has four members.");
  const previous = p.crewId;
  p.crewId = crewId;
  updateCrew(room, crewId);
  if (previous) updateCrew(room, previous);
}
export function crewSymbol(index: number) {
  let n = index + 1,
    text = "";
  while (n > 0) {
    n--;
    text = String.fromCharCode(65 + (n % 26)) + text;
    n = Math.floor(n / 26);
  }
  return text;
}
export function createCrew(room: StoredRoom, playerId: string, name: string) {
  const s = room.state;
  if (s.status !== "lobby") reject("CLOSED", "Crews are locked after starting.");
  const color = shuffled(TEAM_COLORS, s.seed)[s.crewSerial % TEAM_COLORS.length];
  const symbol = crewSymbol(s.crewSerial++);
  const id = randomUUID();
  s.crews.push({
    id,
    name: nameSchema.parse(name),
    symbol,
    colorId: color.id,
    playerIds: [],
    startingSize: 1,
    carriedTreasure: 0,
    securedTreasure: 0,
    status: "active",
    location: { kind: "camp" },
  });
  joinCrew(room, playerId, id);
}
export function chooseClass(room: StoredRoom, playerId: string, classId: ClassId) {
  const s = room.state;
  if (s.status !== "lobby") reject("CLOSED", "Classes are locked after starting.");
  const p = s.players.find((p) => p.id === playerId);
  const definition = s.content.classes.find((c) => c.id === classId);
  if (!p?.crewId || !definition) reject("INVALID", "Join a crew before choosing a class.");
  if (s.players.filter((v) => v.crewId === p.crewId).length > definition.maxCrewSize)
    reject("INVALID", "This class is available to crews of one or two.");
  p.classId = classId;
  p.classNotice = null;
}
export function changeRoster(room: StoredRoom, change: RosterChange) {
  const s = room.state;
  if (s.status !== "lobby") reject("CLOSED", "The roster is locked after starting.");
  if (change.action === "delete-crew") {
    if (!s.crews.some((c) => c.id === change.crewId)) reject("NOT_FOUND", "Crew not found.");
    for (const player of s.players) if (player.crewId === change.crewId) player.crewId = null;
    s.crews = s.crews.filter((c) => c.id !== change.crewId);
  } else {
    const player = s.players.find((p) => p.id === change.playerId);
    if (!player) reject("NOT_FOUND", "Player not found.");
    s.players = s.players.filter((p) => p.id !== player.id);
    if (player.crewId) updateCrew(room, player.crewId);
    for (const [hash, session] of Object.entries(room.sessions))
      if (session.role === "player" && session.playerId === player.id) delete room.sessions[hash];
  }
}
