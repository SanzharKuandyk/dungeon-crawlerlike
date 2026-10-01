import type { GameEvent } from "../shared/event-types.js";
import type { MatchState } from "../shared/game-types.js";
import { heroEvent, heroName, lockResolution, storyEvent } from "./events.js";
import { priority } from "./voting.js";
export function activeQuestion(s: MatchState) {
  return s.content.questions.find((q) => q.id === s.quizQuestionId) ?? null;
}
export function chooseQuestion(s: MatchState) {
  s.quizCause = null;
  s.quizQuestionId = null;
  if (
    !s.learningEnabled ||
    s.depth === 5 ||
    s.quizDepths.includes(s.depth) ||
    s.usedQuestions.length >= s.questionDeck.length ||
    s.crews.every((c) => c.status === "eliminated")
  )
    return;
  const order = priority(s, s.offeredRooms);
  let event: GameEvent | undefined;
  for (const cause of ["weak-point", "victory", "loot"]) {
    event = [...s.events]
      .filter((e) => e.cause === cause)
      .sort(
        (a, b) =>
          order.findIndex((r) => r.id === a.roomId) - order.findIndex((r) => r.id === b.roomId),
      )[0];
    if (event) break;
  }
  if (!event) return;
  s.quizQuestionId = s.questionDeck[s.usedQuestions.length];
  s.usedQuestions.push(s.quizQuestionId);
  s.quizDepths.push(s.depth);
  s.quizCause = `${event.message} An ancient inscription is revealed.`;
  s.quizLocked = false;
  s.quizGranted = false;
  s.answers = {};
  s.equipmentChoices = {};
  s.quizResults = [];
  storyEvent(s, s.quizCause, 0.97, "discovery", event.actor, event.roomId);
}
export function lockQuiz(s: MatchState) {
  lockResolution(s);
  const q = activeQuestion(s);
  if (!q) throw new Error("Missing question.");
  s.quizLocked = true;
  s.quizResults = s.crews.map((c) => {
    const members = s.players.filter((p) => p.crewId === c.id);
    const correct = members.filter((p) => s.answers[p.id] === q.correctIndex).length;
    return {
      crewId: c.id,
      total: members.length,
      correct,
      tier:
        correct === members.length
          ? ("perfect" as const)
          : correct > 0
            ? ("partial" as const)
            : ("none" as const),
    };
  });
}
export function grantEquipment(s: MatchState) {
  lockResolution(s);
  if (s.quizGranted) throw new Error("Rewards already granted.");
  s.quizGranted = true;
  for (const h of s.heroes.filter((h) => h.status === "alive")) {
    const result = s.quizResults.find((r) => r.crewId === h.crewId);
    if (!result || result.tier === "none") continue;
    const choice = s.equipmentChoices[h.playerId] ?? (h.equipment ? "keep" : "ward");
    if (choice !== "keep") {
      h.equipment = { kind: choice, charges: result.tier === "perfect" ? 2 : 1 };
      h.equipmentActiveFromTurn = s.globalTurn + 1;
    }
    heroEvent(
      s,
      h,
      `${heroName(s, h)} ${choice === "keep" ? "keeps their equipment" : `equips ${choice}`}.`,
      0.5,
      "question-reward",
    );
  }
}
