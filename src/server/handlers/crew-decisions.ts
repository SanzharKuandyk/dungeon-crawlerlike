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
    if (choice !== "rescue") reject("INVALID", "This crew needs rescue.");
  } else if (hero.status === "dead") reject("INVALID", "Spirits can request their own rescue.");
  else if (
    choice === "rest" &&
    !room.state.crewProgress[hero.crewId].recovering &&
    !["camp", "altar", "shrine"].includes(node?.kind ?? "")
  )
    reject("INVALID", "Rest at a camp or shrine.");
  else if (
    ![
      "rest",
      "continue",
      "leave",
      "risk",
      "recover-health",
      "recover-stress",
      "sacrifice",
    ].includes(choice) ||
    (choice === "risk" && node?.kind !== "event")
  )
    reject("INVALID", "Choose an available camp action.");
  if (
    ["risk", "recover-health", "recover-stress", "sacrifice"].includes(choice) &&
    node?.kind !== "event"
  )
    reject("INVALID", "Choose this at an exploration event.");
  if (choice === "risk" && !["coin-fountain", "trapped-cache"].includes(node?.eventId ?? ""))
    reject("INVALID", "This event has no chance roll.");
  if (
    choice === "sacrifice" &&
    (node?.eventId !== "sacrificial-altar" ||
      room.state.heroes.some(
        (h) => h.crewId === hero.crewId && h.status === "alive" && h.hp <= h.power,
      ))
  )
    reject("INVALID", "Everyone must survive the displayed health cost.");
  if (["recover-health", "recover-stress"].includes(choice) && node?.eventId !== "quiet-shrine")
    reject("INVALID", "Recover at the quiet shrine.");
  if (
    choice === "rest" &&
    room.state.crewProgress[hero.crewId].restedNodeIds.includes(node?.id ?? "") &&
    !room.state.crewProgress[hero.crewId].recovering
  )
    reject("INVALID", "This camp has already been used.");
  room.state.crewProgress[hero.crewId].campVotes[id] = choice;
}
