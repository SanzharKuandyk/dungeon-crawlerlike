import { chapterMap } from "../../game/progression/maps.js";
import type { TestScenario } from "../../shared/protocol.js";
import { createCrew, joinCrew, joinPlayer } from "../handlers/lobby.js";
import type { RoomManager } from "../room-manager.js";
import { findSession } from "../sessions.js";
import { applyScenario } from "./scenarios.js";

export type BootstrapInput = {
  hostSecret: string;
  scenario: TestScenario;
  players: { clientId: string; bootstrapSecret: string }[];
};
export async function createTestRoom(manager: RoomManager, input: BootstrapInput) {
  const created = await manager.create(input.hostSecret, true);
  const current = manager.rooms.get(created.code);
  if (!current?.testMode) throw new Error("Not a test room.");
  if (!current.state.players.length)
    await manager.transaction(created.code, (room) => {
      room.state.seed = 12345;
      room.state.outcomeSeed = 98765;
      room.state.chapterMaps = ([1, 2, 3] as const).map((c) =>
        chapterMap(room.state.content, 12345, c),
      );
      room.state.expeditionMap = room.state.chapterMaps[0];
      room.state.trialRng = 67890;
      let cursor = 0;
      for (let crewIndex = 0; crewIndex < 4; crewIndex++) {
        let crewId = "";
        for (let member = 0; member <= crewIndex; member++) {
          const identity = input.players[cursor++];
          const result = joinPlayer(
            room,
            `Explorer ${crewIndex + 1}.${member + 1}`,
            identity.bootstrapSecret,
          );
          if (member === 0) {
            createCrew(room, result.playerId, `Crew ${crewIndex + 1}`);
            crewId = room.state.players.find((p) => p.id === result.playerId)?.crewId ?? "";
          } else joinCrew(room, result.playerId, crewId);
          const p = room.state.players.find((p) => p.id === result.playerId);
          if (p)
            p.classId =
              crewIndex === 0
                ? "wanderer"
                : crewIndex === 1
                  ? "exorcist"
                  : (["knight", "physician", "occultist", "scavenger"][member] as
                      | "knight"
                      | "physician"
                      | "occultist"
                      | "scavenger");
        }
      }
      applyScenario(room, input.scenario, Date.now());
    });
  const saved = manager.rooms.get(created.code);
  if (!saved) throw new Error("Test room disappeared.");
  return {
    code: created.code,
    players: input.players.map((identity) => {
      const session = findSession(saved.sessions, identity.bootstrapSecret);
      const p = saved.state.players.find((p) => p.id === session?.playerId);
      if (!p?.crewId) throw new Error("Bootstrap keys do not match this room.");
      return { clientId: identity.clientId, playerId: p.id, crewId: p.crewId };
    }),
  };
}
