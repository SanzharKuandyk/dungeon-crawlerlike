import type { MatchState } from "../../shared/game-types.js";
import type { Trial, TrialPack, TrialQuestion } from "../../shared/trial-types.js";
import { nextRandom, shuffled } from "../random.js";
export function validateTrialPack(pack: TrialPack, classroom = false) {
  if (
    new Set(pack.categories).size !== 3 ||
    new Set(pack.questions.map((q) => q.id)).size !== pack.questions.length
  )
    throw new Error("Trial categories and question IDs must be unique.");
  for (const category of pack.categories)
    for (const value of [100, 200, 300]) {
      const variants = pack.questions.filter((q) => q.category === category && q.value === value);
      if (variants.length < 2) throw new Error("Every board cell needs two variants.");
    }
  for (const q of pack.questions)
    if (
      q.choices.length !== 4 ||
      q.distractors.length !== 4 ||
      q.correctIndex < 0 ||
      q.correctIndex > 3 ||
      (q.code?.split("\n").length ?? 0) > 12 ||
      (classroom && (pack.fixture || !q.reviewed || !q.reference.file || !q.reference.slide))
    )
      throw new Error("A reviewed lecture reference and four explained choices are required.");
}
export function createTrial(
  state: MatchState,
  chapter: 1 | 2,
  cause: string,
  eventId: import("../../shared/shared-event-types.js").SharedEventId = "trial-1",
): Trial {
  validateTrialPack(state.trialPack);
  return {
    id: `trial:${state.id}:${eventId}`,
    eventId,
    selection: null,
    chapter,
    cause,
    phase: { kind: "intro" },
    questionNumber: 1,
    tiles: state.trialPack.categories.flatMap((category, index) =>
      (
        state.content.sharedEvents?.find((e) => e.id === eventId)?.bands ??
        ((eventId === "trial-2"
          ? [200, 300]
          : eventId === "trial-3"
            ? [100, 300]
            : [100, 200]) as import("../../shared/trial-types.js").TrialValue[])
      ).map((value) => ({
        id: `tile:${index}:${value}`,
        category,
        value,
      })),
    ),
    usedValues: [],
    votes: {},
    wagers: {},
    answers: {},
    oath: chapter === 1 ? "shaken" : "brittle",
    results: [],
    totals: {},
    favour: {},
    offers: {},
    choices: {},
    resolvedQuestions: [],
    rewardsGranted: false,
  };
}
export function chooseTile(state: MatchState, trial: Trial) {
  const available = trial.tiles.filter((t) => !trial.usedValues.includes(t.value));
  const crewVotes: Record<string, string> = {};
  const choose = (ids: string[], votes: Record<string, string>) => {
    const counts = new Map<string, number>();
    for (const id of ids)
      if (available.some((t) => t.id === votes[id]))
        counts.set(votes[id], (counts.get(votes[id]) ?? 0) + 1);
    const max = Math.max(0, ...counts.values());
    return ids.map((id) => votes[id]).find((v) => counts.get(v) === max);
  };
  for (const crew of state.crews) {
    const ids = [...crew.playerIds];
    const shift = (trial.questionNumber - 1) % ids.length;
    const winner = choose([...ids.slice(shift), ...ids.slice(0, shift)], trial.votes);
    if (winner) crewVotes[crew.id] = winner;
  }
  const crews = shuffled(state.crews, state.seed);
  const shift = (trial.chapter + trial.questionNumber - 2) % crews.length;
  const winner = choose(
    [...crews.slice(shift), ...crews.slice(0, shift)].map((c) => c.id),
    crewVotes,
  );
  const tile =
    available.find((t) => t.id === winner) ??
    available.slice().sort((a, b) => a.value - b.value || a.id.localeCompare(b.id))[0];
  if (!tile) throw new Error("Trial board exhausted.");
  const rng = nextRandom(state.trialRng);
  state.trialRng = rng.state;
  const question = shuffled(
    state.trialPack.questions.filter(
      (q) =>
        q.category === tile.category &&
        q.value === tile.value &&
        !state.usedTrialQuestions.includes(q.id),
    ),
    rng.state,
  )[0];
  if (!question) throw new Error("Reviewed question variants exhausted.");
  trial.usedValues.push(tile.value);
  trial.selection = {
    tileId: tile.id,
    crewVotes,
    reason: winner
      ? "One vote per crew · ties use rotating crew priority"
      : "No crew votes · lowest available value",
  };
  state.usedTrialQuestions.push(question.id);
  trial.wagers = {};
  trial.answers = {};
  trial.votes = {};
  return question.id;
}
export function trialQuestion(state: MatchState): TrialQuestion | undefined {
  const phase = state.trial?.phase;
  return phase && "questionId" in phase
    ? state.trialPack.questions.find((q) => q.id === phase.questionId)
    : undefined;
}
