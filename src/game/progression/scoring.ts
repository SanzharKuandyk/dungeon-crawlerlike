import type { MatchState } from "../../shared/game-types.js";
export function ranking(state: MatchState) {
  return state.crews
    .map((crew) => ({
      crewId: crew.id,
      bosses: crew.bossesDefeated,
      progress: crew.completedNodeIds.reduce(
        (max, id) => Math.max(max, Number(id.split("-")[1]) * 7 + Number(id.split("-")[2])),
        0,
      ),
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
