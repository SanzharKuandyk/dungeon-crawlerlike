import { currentMapNode, reachableNodes } from "../../game/expedition-map.js";
import type { CampChoice } from "../../shared/command-types.js";
import { reject } from "../errors.js";
import type { StoredRoom } from "../room-types.js";
import { ownedHero, requirePhase } from "./hero-actions.js";
export function voteRoute(room: StoredRoom, id: string, nodeId: string, now: number) {
  requirePhase(room, "route", now, id);
  const hero = ownedHero(room, id);
  if (
    hero.status !== "alive" ||
    !reachableNodes(room.state, hero.crewId).some((n) => n.id === nodeId)
  )
    reject("INVALID", "Choose a connected destination.");
  room.state.crewProgress[hero.crewId].routeVotes[id] = nodeId;
}
export function voteCamp(room: StoredRoom, id: string, choice: CampChoice, now: number) {
  requirePhase(room, "camp", now, id);
  const hero = ownedHero(room, id),
    crew = room.state.crews.find((c) => c.id === hero.crewId);
  if (!crew) reject("INVALID", "Crew missing.");
  const node = currentMapNode(room.state, crew);
  // A restored hero can continue even if an earlier save retained the eliminated flag.
  crew.status = room.state.heroes.some((h) => h.crewId === crew.id && h.status === "alive")
    ? "active"
    : "eliminated";
  if (crew.status === "eliminated") {
    if (!["rescue", "wait"].includes(choice)) reject("INVALID", "This crew needs rescue.");
  } else if (hero.status === "dead") reject("INVALID", "Ask a living teammate for revival.");
  else if (
    choice === "rest" &&
    !room.state.crewProgress[hero.crewId].recovering &&
    node?.kind !== "camp"
  )
    reject("INVALID", "Rest at a camp. Checkpoints do not offer free Rest.");
  else if (!["rest", "continue", "leave"].includes(choice))
    reject("INVALID", "Choose an available recovery action.");
  if (choice === "rest" && room.state.crewProgress[hero.crewId].recovering)
    reject("INVALID", "Failed-encounter recovery offers paid treatment, not free Rest.");
  if (
    choice === "leave" &&
    room.state.encounters.find((e) => e.id === room.state.crewProgress[hero.crewId].encounterId)
      ?.kind === "boss"
  )
    reject("INVALID", "A failed boss must be retried.");
  if (
    choice === "rest" &&
    room.state.crewProgress[hero.crewId].restedNodeIds.includes(node?.id ?? "")
  )
    reject("INVALID", "This camp has already been used.");
  room.state.crewProgress[hero.crewId].campVotes[id] = choice;
}
