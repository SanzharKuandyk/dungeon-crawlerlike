import { startMatch } from "../../game/create-match.js";
import { resolveCombat } from "../../game/resolve-combat.js";
import { offerRooms, resolveRoutes } from "../../game/routes.js";
import { finalizeDeaths } from "../../game/stress-and-death.js";
import type { TestScenario } from "../../shared/protocol.js";
import { enter } from "../room-clock.js";
import type { StoredRoom } from "../room-types.js";
export function applyScenario(room: StoredRoom, scenario: TestScenario, now: number) {
  if (scenario === "fresh") return;
  startMatch(room.state);
  if (scenario === "final") {
    room.state.depth = 5;
    for (const c of room.state.crews) {
      c.securedTreasure = 20;
      c.carriedTreasure = 5;
    }
    offerRooms(room.state);
    enter(room, { kind: "route" }, now);
    return;
  }
  enter(room, { kind: "route" }, now);
  for (const [index, c] of room.state.crews.entries()) {
    const target =
      scenario === "split"
        ? room.state.offeredRooms[index % 3]
        : room.state.offeredRooms.find(
            (v) => v.risk === (scenario === "critical" ? "high" : "low"),
          );
    for (const id of c.playerIds) room.state.routeVotes[id] = target?.id ?? "";
  }
  resolveRoutes(room.state);
  enter(room, { kind: "combat" }, now);
  if (scenario === "critical") {
    const first = room.state.heroes[0];
    first.hp = first.power;
    first.stress = 5;
    const second = room.state.heroes[1];
    second.hp = 0;
    finalizeDeaths(room.state);
  }
  if (scenario === "treasure") for (const c of room.state.crews) c.carriedTreasure = 5;
  if (scenario === "question") {
    for (const h of room.state.heroes)
      room.state.actions[h.playerId] = { kind: "attack", part: "weak-point" };
    room.state = resolveCombat(room.state).state;
    room.state.quizContinuation = "next-combat-turn";
    const id = room.state.quizQuestionId;
    if (!id) throw new Error("Question fixture failed.");
    enter(room, { kind: "question", questionId: id }, now);
  }
}
