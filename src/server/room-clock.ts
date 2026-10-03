import { beginEvents } from "../game/events.js";
import { campAvailable, moveToNextMapRow } from "../game/expedition-map.js";
import { grantEquipment, lockQuiz } from "../game/learning.js";
import { resolveCamp } from "../game/resolve-camp.js";
import { resolveCombat } from "../game/resolve-combat.js";
import { offerRooms, resolveRoutes } from "../game/routes.js";
import { extract, finishMatch } from "../game/scoring.js";
import { DURATIONS } from "../shared/constants.js";
import type { Phase } from "../shared/game-types.js";
import { clockView, newClock } from "./clocks.js";
import type { StoredRoom } from "./room-types.js";

export function setDeadline(room: StoredRoom, now: number) {
  const duration = DURATIONS[room.speed === "fast" ? "fast" : "normal"][room.state.phase.kind];
  room.timer = newClock(
    duration,
    now,
    room.speed !== "manual" && room.state.status === "running" && !room.pauseReasons.length,
  );
  Object.assign(room, clockView(room.timer));
}
export function enter(room: StoredRoom, phase: Phase, now: number) {
  room.state.phase = phase;
  room.state.phaseId++;
  setDeadline(room, now);
}
function nextTurn(room: StoredRoom, now: number) {
  const s = room.state;
  s.turn++;
  s.actions = {};
  s.withdrawVotes = {};
  s.before = null;
  s.events = [];
  enter(room, { kind: "combat" }, now);
}
function afterCombat(room: StoredRoom, now: number) {
  if (room.state.encounters.some((e) => e.status === "active")) nextTurn(room, now);
  else enter(room, { kind: "floor-result" }, now);
}

function nextMapRoom(room: StoredRoom, now: number) {
  const s = room.state;
  moveToNextMapRow(s);
  s.turn = 1;
  s.quizCause = null;
  s.quizQuestionId = null;
  s.quizLocked = false;
  offerRooms(s);
  enter(room, { kind: "route" }, now);
}

export function advancePhase(room: StoredRoom, now: number) {
  const s = room.state;
  if (s.status !== "running") throw new Error("Start or resume first.");
  switch (s.phase.kind) {
    case "route":
      resolveRoutes(s);
      enter(room, { kind: "arrival" }, now);
      break;
    case "arrival":
      s.actions = {};
      s.withdrawVotes = {};
      if (s.quizQuestionId && s.quizCause && !s.quizLocked) {
        s.quizContinuation = s.encounters.some((encounter) => encounter.status === "active")
          ? "start-combat"
          : "finish-floor";
        enter(room, { kind: "question-intro", questionId: s.quizQuestionId }, now);
      } else
        enter(
          room,
          {
            kind: s.encounters.some((encounter) => encounter.status === "active")
              ? "combat"
              : "floor-result",
          },
          now,
        );
      break;
    case "combat":
      room.state = resolveCombat(s).state;
      enter(room, { kind: "combat-reveal" }, now);
      break;
    case "combat-reveal":
      enter(room, { kind: "combat-recap" }, now);
      break;
    case "combat-recap":
      if (s.crews.every((c) => c.status === "eliminated")) {
        finishMatch(s);
        room.deadline = null;
        break;
      }
      if (s.quizQuestionId && s.quizCause && !s.quizLocked) {
        s.quizContinuation = s.encounters.some((e) => e.status === "active")
          ? "next-combat-turn"
          : "finish-floor";
        enter(room, { kind: "question-intro", questionId: s.quizQuestionId }, now);
      } else afterCombat(room, now);
      break;
    case "question-intro":
      enter(room, { kind: "question", questionId: s.phase.questionId }, now);
      break;
    case "question":
      lockQuiz(s);
      enter(room, { kind: "explanation", questionId: s.phase.questionId }, now);
      break;
    case "explanation":
      enter(room, { kind: "equipment", questionId: s.phase.questionId }, now);
      break;
    case "equipment":
      beginEvents(s);
      grantEquipment(s);
      enter(room, { kind: "return" }, now);
      break;
    case "return":
      if (s.quizContinuation === "start-combat") {
        s.before = null;
        s.events = [];
        enter(room, { kind: "combat" }, now);
      } else if (s.quizContinuation === "next-combat-turn") nextTurn(room, now);
      else enter(room, { kind: "floor-result" }, now);
      s.quizContinuation = null;
      break;
    case "floor-result":
      for (const h of s.heroes) if (h.bargainDepth === s.depth) h.bargainDepth = null;
      if (s.expeditionMap) {
        if (s.crews.some((crew) => campAvailable(s, crew))) {
          s.campVotes = {};
          enter(room, { kind: "camp" }, now);
        } else nextMapRoom(room, now);
      } else if (s.depth === 5) {
        extract(s);
        enter(room, { kind: "extraction" }, now);
      } else {
        s.campVotes = {};
        enter(room, { kind: "camp" }, now);
      }
      break;
    case "camp":
      resolveCamp(s);
      enter(room, { kind: "camp-reveal" }, now);
      break;
    case "camp-reveal":
      if (s.crews.every((c) => c.status === "eliminated")) {
        finishMatch(s);
        room.deadline = null;
        break;
      }
      if (s.expeditionMap) {
        nextMapRoom(room, now);
        break;
      }

      s.depth++;
      s.turn = 1;
      s.quizCause = null;
      s.quizQuestionId = null;
      s.quizLocked = false;
      offerRooms(s);
      enter(room, { kind: "route" }, now);
      break;
    case "extraction":
      finishMatch(s);
      room.deadline = null;
      break;
  }
}
