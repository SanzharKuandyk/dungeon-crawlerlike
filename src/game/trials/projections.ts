import type { MatchState } from "../../shared/game-types.js";
import type { TrialView } from "../../shared/trial-types.js";
import { trialQuestion } from "./board.js";
export function projectTrial(state: MatchState): TrialView | null {
  const trial = state.trial;
  if (!trial) return null;
  const question = trialQuestion(state),
    reveal = trial.phase.kind === "reveal";
  const shown =
    question && (trial.phase.kind === "answer" || reveal)
      ? {
          id: question.id,
          category: question.category,
          value: question.value,
          prompt: question.prompt,
          code: question.code,
          choices: [...question.choices] as [string, string, string, string],
          reference: question.reference,
        }
      : null;
  return {
    eventId: trial.eventId,
    questionCount: 2,
    crewVotes: state.crews.map((crew) => {
      const counts = new Map<string, number>();
      for (const id of crew.playerIds)
        if (trial.votes[id]) counts.set(trial.votes[id], (counts.get(trial.votes[id]) ?? 0) + 1);
      const max = Math.max(0, ...counts.values()),
        shift = (trial.questionNumber - 1) % crew.playerIds.length;
      const ordered = [...crew.playerIds.slice(shift), ...crew.playerIds.slice(0, shift)];
      const tileId =
        ordered.map((id) => trial.votes[id]).find((id) => counts.get(id) === max) ?? null;
      return {
        crewId: crew.id,
        tileId: trial.selection?.crewVotes[crew.id] ?? tileId,
        submitted: crew.playerIds.filter((id) => trial.votes[id]).length,
        total: crew.playerIds.length,
      };
    }),
    selectionReason: trial.selection?.reason ?? null,
    wagers: Object.entries(trial.wagers).map(([playerId, wager]) => ({ playerId, wager })),
    selectedTile: question
      ? (trial.tiles.find((t) => t.category === question.category && t.value === question.value) ??
        null)
      : null,
    id: trial.id,
    chapter: trial.chapter,
    cause: trial.cause,
    phase: trial.phase,
    tiles: trial.tiles,
    usedValues: trial.usedValues,
    questionNumber: trial.questionNumber,
    fixture: state.trialPack.fixture,
    question: shown,
    correctIndex: reveal ? (question?.correctIndex ?? null) : null,
    explanation: reveal ? (question?.explanation ?? null) : null,
    distractors: reveal ? (question?.distractors ?? []) : [],
    totals: trial.totals,
    oath: trial.oath,
    goldPer100: state.content.balance?.trialGoldPer100 ?? 0,
    goldRewards: reveal ? (trial.questionGold ?? {}) : {},
    accuracy: reveal
      ? state.crews.map((c) => ({
          crewId: c.id,
          total: c.playerIds.length,
          correct: trial.results.filter((r) => c.playerIds.includes(r.playerId) && r.correct)
            .length,
        }))
      : [],
  };
}
