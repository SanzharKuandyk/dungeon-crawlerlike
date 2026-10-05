import type { MatchState } from "../../shared/game-types.js";
import type { ExpeditionMap } from "../../shared/map-types.js";
export function completedProgress(maps: ExpeditionMap[], ids: string[]) {
  return maps.reduce(
    (best, map) =>
      Math.max(
        best,
        ...map.nodes.filter((n) => ids.includes(n.id)).map((n) => (map.chapter - 1) * 12 + n.row),
      ),
    0,
  );
}
export function ranking(state: MatchState) {
  return state.crews
    .map((crew) => ({
      crewId: crew.id,
      bosses: crew.bossesDefeated,
      progress: completedProgress(state.chapterMaps, crew.completedNodeIds),
      trialUnits: crew.trialScoreUnits,
    }))
    .sort((a, b) => b.bosses - a.bosses || b.progress - a.progress || b.trialUnits - a.trialUnits);
}
export function finishExpedition(state: MatchState) {
  const scores = ranking(state),
    best = scores[0];
  state.winners = scores
    .filter(
      (s) =>
        best &&
        s.bosses === best.bosses &&
        s.progress === best.progress &&
        s.trialUnits === best.trialUnits,
    )
    .map((s) => s.crewId);
  state.status = "finished";
}
