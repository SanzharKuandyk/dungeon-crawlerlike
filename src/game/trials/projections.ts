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
