import type { MatchState } from "../../shared/game-types.js";
import type { WagerLevel } from "../../shared/trial-types.js";
import { applyAffliction, applyStress, resolvePanic } from "../combat/conditions.js";
import { preventDeath } from "../combat/protection.js";
import { goldReward } from "../progression/economy.js";
import { expeditionEvent } from "../progression/events.js";
import { trialQuestion } from "./board.js";
export const MULTIPLIERS = { steady: 1, bold: 2, oath: 3 } as const;
export function scoreTrialAnswer(value: number, wager: WagerLevel, correct: boolean, size: number) {
  return correct ? (value * MULTIPLIERS[wager] * 12) / size : 0;
}
export function lockTrialQuestion(state: MatchState) {
  const trial = state.trial,
    q = trialQuestion(state);
  if (!trial || !q || trial.resolvedQuestions.includes(q.id))
    throw new Error("Question already resolved or missing.");
  trial.resolvedQuestions.push(q.id);
  trial.results = [];
  for (const player of state.players) {
    const crew = state.crews.find((c) => c.id === player.crewId),
      hero = state.heroes.find((h) => h.playerId === player.id);
    if (!crew || !hero) continue;
    const wager = trial.wagers[player.id] ?? "steady",
      choice = trial.answers[player.id] ?? null,
      correct = choice === q.correctIndex;
    const units = scoreTrialAnswer(q.value, wager, correct, crew.startingSize);
    trial.totals[crew.id] = (trial.totals[crew.id] ?? 0) + units;
    crew.trialScoreUnits += units;
    if (correct) trial.favour[player.id] = (trial.favour[player.id] ?? 0) + MULTIPLIERS[wager];
    else {
      if (wager === "oath") applyAffliction(hero, trial.oath);
      else applyStress(hero, wager === "bold" ? 3 : 1);
      if (hero.status === "alive") {
        resolvePanic(hero);
        preventDeath(hero);
        if (hero.hp === 0) hero.status = "dead";
      } else hero.stress = Math.min(9, hero.stress);
    }
    trial.results.push({
      playerId: player.id,
      choice,
      correct,
      wager,
      units,
      consequence: correct
        ? `${units / 12} points`
        : wager === "oath"
          ? trial.oath
          : wager === "bold"
            ? "+3 stress"
            : "+1 stress",
    });
  }
  trial.questionGold = {};
  for (const crew of state.crews) {
    const multipliers = trial.results
      .filter((r) => crew.playerIds.includes(r.playerId) && r.correct)
      .reduce((sum, r) => sum + MULTIPLIERS[r.wager], 0);
    const earned = Math.floor(
      ((q.value / 100) * (state.content.balance?.trialGoldPer100 ?? 0) * multipliers) /
        crew.startingSize,
    );
    const debtPaid = Math.min(crew.economy.rescueDebt, earned);
    crew.economy = goldReward(crew, earned);
    trial.questionGold[crew.id] = { earned, debtPaid };
    if (earned)
      expeditionEvent(
        state,
        crew.id,
        { kind: "crew", actor: crew.id, crew },
        `Trial: +${earned} gold${debtPaid ? ` · ${debtPaid} repays rescue debt` : ""}.`,
        0.85,
        "trial-gold",
      );
    crew.status = state.heroes.some((h) => h.crewId === crew.id && h.status === "alive")
      ? "active"
      : "eliminated";
  }
}
