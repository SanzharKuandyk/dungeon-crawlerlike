import type { MatchState, RoomEncounter } from "../../shared/game-types.js";
import { goldReward } from "./economy.js";
import { grantEquipmentOffers } from "./equipment-rewards.js";
import { expeditionEvent } from "./events.js";
export function awardEncounter(state: MatchState, crewId: string, enemy: RoomEncounter) {
  const crew = state.crews.find((c) => c.id === crewId);
  const p = state.crewProgress[crewId];
  if (!crew || crew.rewardedNodeIds.includes(enemy.nodeId) || enemy.hp > 0) return;
  const amount =
    enemy.kind === "boss"
      ? (state.content.balance?.bossReward ?? 36)
      : enemy.kind === "elite"
        ? (state.content.balance?.eliteReward ?? 24)
        : (state.content.balance?.ordinaryReward ?? 12);
  grantEquipmentOffers(state, crewId, enemy.nodeId);
  crew.rewardedNodeIds.push(enemy.nodeId);
  if (!crew.completedNodeIds.includes(enemy.nodeId)) crew.completedNodeIds.push(enemy.nodeId);
  p.completedNodeIds = [...crew.completedNodeIds];
  crew.economy = goldReward(crew, amount);
  if (enemy.kind === "boss") {
    crew.bossesDefeated++;
    p.bossesDefeated = crew.bossesDefeated;
  }
  expeditionEvent(
    state,
    crewId,
    { kind: "crew", actor: crewId, crew },
    `${crew.name} defeats ${enemy.definition.name} · ${amount} gold${enemy.kind === "boss" ? " · boss defeated" : ""}.`,
    0.9,
    "victory",
  );
}
