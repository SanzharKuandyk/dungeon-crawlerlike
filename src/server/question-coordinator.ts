import { beginEvents } from "../game/events.js";
import { grantEquipment, lockQuiz, personalReward } from "../game/learning.js";
import type { Phase } from "../shared/game-types.js";
import { clockView, newClock } from "./clocks.js";
import { freezeCrewClocks, resumeCrewClocks } from "./crew-clock.js";
import { CREW_CHOICES } from "./crew-decisions.js";
import type { StoredRoom } from "./room-types.js";

export function questionActive(room: StoredRoom) {
  return room.state.rulesVersion === "dungeon-v2" && room.state.quizQuestionId !== null;
}
export function skipQuestion(room: StoredRoom, now: number) {
  const state = room.state;
  state.quizQuestionId = null;
  state.quizCause = null;
  state.answers = {};
  state.answerPacts = {};
  state.equipmentChoices = {};
  state.quizResults = [];
  state.phase = { kind: "route" };
  state.phaseId = ++room.decisionSerial;
  state.before = null;
  state.events = [];
  room.deadline = null;
  room.timer.deadline = null;
  resumeCrewClocks(room, now);
}

function enterQuestion(room: StoredRoom, phase: Phase, now: number, duration: number) {
  room.state.phase = phase;
  room.state.phaseId = ++room.decisionSerial;
  const ms =
    room.speed === "fast" ? Math.min(duration, phase.kind === "question" ? 4000 : 500) : duration;
  room.timer = newClock(ms, now, room.speed !== "manual" && !room.pauseReasons.length);
  Object.assign(room, clockView(room.timer));
}

export function beginQuestion(room: StoredRoom, now: number) {
  if (
    !room.discovery ||
    questionActive(room) ||
    room.duels.some((duel) => duel.status === "active")
  )
    return;
  if (
    Object.values(room.runs).some(
      (run) => !run.finished && !CREW_CHOICES.has(run.progress.phase.kind),
    )
  )
    return;
  const state = room.state;
  const questionId = state.questionDeck[state.usedQuestions.length];
  if (!questionId || Object.values(room.runs).every((run) => run.finished)) {
    room.discovery = null;
    return;
  }
  freezeCrewClocks(room, now);
  state.quizCause = room.discovery.cause;
  state.quizDepths.push(room.discovery.depth);
  state.quizQuestionId = questionId;
  state.usedQuestions.push(questionId);
  state.quizLocked = false;
  state.quizGranted = false;
  state.answers = {};
  state.answerPacts = {};
  state.equipmentChoices = {};
  state.quizResults = [];
  state.before = null;
  state.events = [];
  room.discovery = null;
  enterQuestion(room, { kind: "question-intro", questionId }, now, 1800);
}

export function questionReady(room: StoredRoom) {
  const state = room.state;
  if (state.phase.kind === "question")
    return state.players.every((player) => state.answers[player.id] !== undefined);
  if (state.phase.kind === "equipment")
    return state.heroes
      .filter((hero) => hero.status === "alive" && personalReward(state, hero.playerId) !== null)
      .every((hero) => state.equipmentChoices[hero.playerId] !== undefined);
  return false;
}

export function advanceQuestion(room: StoredRoom, now: number) {
  const state = room.state;
  const questionId = state.quizQuestionId;
  if (!questionId) return;
  switch (state.phase.kind) {
    case "question-intro":
      enterQuestion(room, { kind: "question", questionId }, now, 35000);
      break;
    case "question":
      lockQuiz(state);
      enterQuestion(room, { kind: "explanation", questionId }, now, 6000);
      break;
    case "explanation":
      enterQuestion(room, { kind: "equipment", questionId }, now, 20000);
      break;
    case "equipment":
      beginEvents(state);
      grantEquipment(state);
      for (const hero of state.heroes) {
        const run = room.runs[hero.crewId];
        if (run && state.equipmentChoices[hero.playerId] !== "keep")
          hero.equipmentActiveFromTurn = run.progress.globalTurn + 1;
      }
      enterQuestion(room, { kind: "return" }, now, 1800);
      break;
    case "return":
      state.quizQuestionId = null;
      state.quizCause = null;
      state.phase = { kind: "route" };
      state.phaseId = ++room.decisionSerial;
      state.before = null;
      state.events = [];
      room.deadline = null;
      resumeCrewClocks(room, now);
      break;
    default:
      throw new Error(`Unexpected shared question phase: ${state.phase.kind}`);
  }
}
