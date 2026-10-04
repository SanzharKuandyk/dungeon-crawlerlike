import type { MatchState } from "../../shared/game-types.js";
import type { CrewResult } from "../../shared/reward-types.js";
export function createCrewResult(
  state: MatchState,
  crewId: string,
  outcome: CrewResult["outcome"],
  continuation: CrewResult["continuation"],
) {
  const p = state.crewProgress[crewId];
  const crew = state.crews.find((c) => c.id === crewId);
  if (!crew) throw new Error("Crew missing.");
  const before = p.before?.crews.find((c) => c.id === crewId);
  const debtPaid = Math.max(
    0,
    (before?.economy.rescueDebt ?? crew.economy.rescueDebt) - crew.economy.rescueDebt,
  );
  const nodeId = p.nodeId ?? "start";
  p.result = {
    id: `${state.id}:result:${crewId}:${p.phaseId}`,
    crewId,
    outcome,
    continuation,
    sourceNodeId: nodeId,
    title:
      state.chapterMaps[p.chapter - 1].nodes.find((n) => n.id === nodeId)?.room.name ?? "Recovery",
    goldEarned:
      Math.max(0, crew.economy.gold - (before?.economy.gold ?? crew.economy.gold)) + debtPaid,
    debtPaid,
    heroChanges: state.heroes
      .filter((h) => h.crewId === crewId)
      .map((h) => {
        const old = p.before?.heroes.find((v) => v.id === h.id) ?? h;
        return {
          heroId: h.id,
          hpBefore: old.hp,
          hpAfter: h.hp,
          stressBefore: old.stress,
          stressAfter: h.stress,
          conditions: [
            ...h.conditions.injuries.map((i) => `${i} injury`),
            ...h.conditions.afflictions.map((a) => a.kind),
            ...(h.status === "dead" ? ["Spirit"] : []),
          ],
        };
      }),
    rewardIds: state.rewardOffers
      .filter(
        (o) =>
          o.sourceNodeId === nodeId &&
          state.heroes.some((h) => h.id === o.ownerHeroId && h.crewId === crewId),
      )
      .map((o) => o.id),
  };
}
export function saveTurnSummary(state: MatchState, crewId: string) {
  const p = state.crewProgress[crewId];
  p.lastTurn = {
    id: `${state.id}:${crewId}:${p.phaseId}`,
    turn: p.turn,
    entries: p.events
      .filter(
        (e) =>
          e.kind === "effect" || ["death", "panic", "victory", "enemy-cancelled"].includes(e.cause),
      )
      .map((e) => ({ actor: e.actor, message: e.message })),
  };
}
