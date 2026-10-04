import { createBlessingOffers, grantBlessings } from "../game/trials/blessings.js";
import { chooseTile, createTrial, trialQuestion } from "../game/trials/board.js";
import { lockTrialQuestion } from "../game/trials/scoring.js";
import type { TrialPhase } from "../shared/trial-types.js";
import { clockView, newClock } from "./clocks.js";
import { freezeCrewClocks, resumeCrewClocks } from "./crew-clock.js";
import type { StoredRoom } from "./room-types.js";
export const questionActive = (room: StoredRoom) => room.state.trial !== null;
function enterTrial(room: StoredRoom, phase: TrialPhase, now: number, duration: number) {
  const trial = room.state.trial;
  if (!trial) throw new Error("Trial missing");
  trial.phase = phase;
  room.state.phase = {
    kind:
      phase.kind === "intro"
        ? "question-intro"
        : phase.kind === "board-vote"
          ? "route"
          : phase.kind === "wager"
            ? "camp"
            : phase.kind === "answer"
              ? "question"
              : phase.kind === "reveal"
                ? "explanation"
                : phase.kind === "blessing-choice"
                  ? "equipment"
                  : "return",
    questionId: trial.id,
  } as import("../shared/game-types.js").Phase;
  room.state.phaseId = ++room.decisionSerial;
  room.timer = newClock(
    room.speed === "fast" ? Math.min(duration, phase.kind === "answer" ? 4000 : 500) : duration,
    now,
    room.speed !== "manual" && !room.pauseReasons.length,
  );
  Object.assign(room, clockView(room.timer));
}
export function beginQuestion(room: StoredRoom, now: number) {
  if (!room.discovery || room.state.trial) return;
  if (
    Object.values(room.runs).some(
      (r) =>
        !r.finished && ["arrival", "combat-reveal", "camp-reveal"].includes(r.progress.phase.kind),
    )
  )
    return;
  if (room.duels.some((d) => d.status === "active" && d.phase === "reveal")) return;
  const chapter = room.discovery.depth as 1 | 2;
  room.state.trial = createTrial(room.state, chapter, room.discovery.cause);
  room.state.completedTrials.push(chapter);
  room.discovery = null;
  freezeCrewClocks(room, now);
  enterTrial(room, { kind: "intro" }, now, 3000);
}
export function skipQuestion(room: StoredRoom, now: number) {
  if (room.state.trial?.phase.kind === "blessing-choice") grantBlessings(room.state);
  room.state.trial = null;
  room.state.phase = { kind: "route" };
  room.state.phaseId = ++room.decisionSerial;
  room.timer.deadline = null;
  room.deadline = null;
  room.remaining = null;
  resumeCrewClocks(room, now);
}
export function questionReady(room: StoredRoom) {
  const trial = room.state.trial;
  if (!trial) return false;
  if (trial.phase.kind === "board-vote")
    return room.state.players.every((p) => trial.votes[p.id] !== undefined);
  if (trial.phase.kind === "wager")
    return room.state.players.every((p) => trial.wagers[p.id] !== undefined);
  if (trial.phase.kind === "answer")
    return room.state.players.every((p) => trial.answers[p.id] !== undefined);
  if (trial.phase.kind === "blessing-choice")
    return Object.keys(trial.offers).every((id) => trial.choices[id] !== undefined);
  return false;
}
export function advanceQuestion(room: StoredRoom, now: number) {
  const trial = room.state.trial;
  if (!trial) return;
  switch (trial.phase.kind) {
    case "intro":
      enterTrial(room, { kind: "board-vote", questionNumber: 1 }, now, 12000);
      break;
    case "board-vote":
      enterTrial(room, { kind: "wager", questionId: chooseTile(room.state, trial) }, now, 10000);
      break;
    case "wager": {
      const q = trialQuestion(room.state);
      if (!q) throw new Error("Question missing");
      enterTrial(
        room,
        { kind: "answer", questionId: q.id },
        now,
        q.value === 100 ? 45000 : q.value === 200 ? 60000 : 75000,
      );
      break;
    }
    case "answer":
      lockTrialQuestion(room.state);
      enterTrial(room, { kind: "reveal", questionId: trial.phase.questionId }, now, 10000);
      break;
    case "reveal":
      if (trial.questionNumber < 3) {
        trial.questionNumber++;
        trial.votes = {};
        enterTrial(room, { kind: "board-vote", questionNumber: trial.questionNumber }, now, 12000);
      } else {
        createBlessingOffers(room.state);
        enterTrial(room, { kind: "blessing-choice" }, now, 20000);
      }
      break;
    case "blessing-choice":
      grantBlessings(room.state);
      enterTrial(room, { kind: "return" }, now, 2000);
      break;
    case "return":
      skipQuestion(room, now);
      break;
  }
}
