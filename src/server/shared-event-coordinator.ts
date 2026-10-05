import { createShop } from "../game/inventory/shops.js";
import { createSiege, resolveSiegeRound } from "../game/siege.js";
import { createBlessingOffers, grantBlessings } from "../game/trials/blessings.js";
import { chooseTile, createTrial, trialQuestion } from "../game/trials/board.js";
import { lockTrialQuestion } from "../game/trials/scoring.js";
import type { SharedEventId } from "../shared/shared-event-types.js";
import type { TrialPhase } from "../shared/trial-types.js";
import { clockView, newClock } from "./clocks.js";
import { enterCrew, freezeCrewClocks, resumeCrewClocks } from "./crew-clock.js";
import { cancelDuel } from "./duel-coordinator.js";
import type { StoredRoom } from "./room-types.js";

export const questionActive = (room: StoredRoom) =>
  room.state.trial !== null || room.state.siege !== null;
export function queueSharedEvent(room: StoredRoom, id: SharedEventId, crewId: string) {
  if (room.state.sharedEvents.some((e) => e.id === id)) return;
  room.state.sharedEvents.push({
    id,
    status: id.startsWith("trial") && !room.state.learningEnabled ? "skipped" : "pending",
    triggerCrewId: crewId,
  });
  selectPending(room);
}
export function selectPending(room: StoredRoom) {
  if (questionActive(room)) return;
  const pending = room.state.sharedEvents.find((e) => e.status === "pending");
  if (!pending) {
    room.discovery = null;
    return;
  }
  const definition = room.state.content.sharedEvents?.find((e) => e.id === pending.id);
  const crew = room.state.crews.find((c) => c.id === pending.triggerCrewId);
  room.discovery = {
    eventId: pending.id,
    depth: definition?.chapter ?? 1,
    cause: `Crew ${crew?.symbol ?? ""} awakened ${pending.id.replace("-", " ")}. Finish the current reveal.`,
  };
}
function enterShared(
  room: StoredRoom,
  id: SharedEventId,
  stage: string,
  now: number,
  duration: number,
) {
  room.state.phase = { kind: "shared-event", eventId: id, stage };
  room.state.phaseId = ++room.decisionSerial;
  room.timer = newClock(
    room.speed === "fast" ? Math.min(duration, stage === "answer" ? 4000 : 500) : duration,
    now,
    room.speed !== "manual" && !room.pauseReasons.length,
  );
  Object.assign(room, clockView(room.timer));
}
function enterTrial(room: StoredRoom, phase: TrialPhase, now: number, duration: number) {
  const trial = room.state.trial;
  if (!trial) throw new Error("Trial missing.");
  trial.phase = phase;
  enterShared(room, trial.eventId, phase.kind, now, duration);
}
export function beginQuestion(room: StoredRoom, now: number) {
  if (!room.discovery || questionActive(room)) return;
  if (
    Object.values(room.runs).some(
      (r) =>
        !r.finished &&
        !r.pauseReasons.length &&
        !r.suspended &&
        ["arrival", "combat-reveal", "camp-reveal", "event-reveal"].includes(r.progress.phase.kind),
    )
  )
    return;
  if (
    room.duels.some(
      (d) =>
        d.status === "active" &&
        d.phase === "reveal" &&
        d.crewIds.every((id) => !room.runs[id]?.pauseReasons.length && !room.runs[id]?.suspended),
    )
  )
    return;
  const discovery = room.discovery,
    id = discovery.eventId ?? "trial-1";
  let record = room.state.sharedEvents.find((e) => e.id === id);
  if (!record) {
    record = { id, status: "pending", triggerCrewId: room.state.crews[0]?.id ?? "" };
    room.state.sharedEvents.push(record);
  }
  if (record.status !== "pending") {
    selectPending(room);
    return;
  }
  record.status = "active";
  room.discovery = null;
  freezeCrewClocks(room, now);
  if (id === "siege-1") {
    room.state.siege = createSiege(room.state);
    enterShared(room, id, "intro", now, 3000);
  } else {
    room.state.trial = createTrial(room.state, discovery.depth as 1 | 2, discovery.cause, id);
    enterTrial(room, { kind: "intro" }, now, 3000);
  }
}
export function skipQuestion(room: StoredRoom, now: number, skipped = false) {
  const eventId = room.state.trial?.eventId ?? room.state.siege?.id;
  if (room.state.trial) {
    const trial = room.state.trial;
    createBlessingOffers(room.state);
    grantBlessings(room.state);
    for (const hero of room.state.heroes) {
      if (trial.choices[hero.playerId] === undefined)
        hero.pendingBlessings.push(...(trial.offers[hero.playerId] ?? []));
    }
  }
  if (eventId) {
    const record = room.state.sharedEvents.find((e) => e.id === eventId);
    if (record) record.status = skipped ? "skipped" : "completed";
  }
  room.state.trial = null;
  room.state.siege = null;
  room.state.phase = { kind: "route" };
  room.state.phaseId = ++room.decisionSerial;
  room.timer.deadline = null;
  room.deadline = null;
  room.remaining = null;
  for (const duel of room.duels.filter((d) => d.status === "active"))
    if (room.state.heroes.some((h) => h.status === "dead" && duel.crewIds.includes(h.crewId)))
      cancelDuel(room, duel, now);
  for (const run of Object.values(room.runs)) {
    const heroes = room.state.heroes.filter((h) => h.crewId === run.crewId),
      crew = room.state.crews.find((c) => c.id === run.crewId);
    if (!crew) continue;
    for (const hero of heroes.filter((h) => h.status === "dead")) {
      run.ready = run.ready.filter((id) => id !== hero.playerId);
      delete run.progress.plans[hero.playerId];
      delete run.progress.actions[hero.playerId];
    }
    if (heroes.length && heroes.every((h) => h.status === "dead") && !run.finished) {
      crew.status = "eliminated";
      run.progress.recovering = true;
      const encounter = room.state.encounters.find((e) => e.id === run.progress.encounterId);
      if (encounter?.status === "active") encounter.status = "abandoned";
      crew.shop ??= createShop(room.state, crew.id, run.progress.nodeId ?? "recovery");
      enterCrew(room, run, { kind: "camp" }, now);
    }
  }
  selectPending(room);
  resumeCrewClocks(room, now);
}
export function questionReady(room: StoredRoom) {
  const trial = room.state.trial;
  if (room.state.siege?.phase === "choice")
    return room.state.players.every((p) => room.state.siege?.choices[p.id] !== undefined);
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
  const siege = room.state.siege;
  if (siege) {
    if (siege.phase === "intro") {
      siege.phase = "choice";
      enterShared(room, siege.id, "choice", now, 20000);
    } else if (siege.phase === "choice") {
      resolveSiegeRound(room.state);
      siege.phase = "reveal";
      enterShared(room, siege.id, "reveal", now, 4000);
    } else if (siege.phase === "reveal") {
      if (siege.settled) {
        siege.phase = "return";
        enterShared(room, siege.id, "return", now, 2000);
      } else {
        siege.round++;
        siege.choices = {};
        siege.phase = "choice";
        enterShared(room, siege.id, "choice", now, 20000);
      }
    } else skipQuestion(room, now);
    return;
  }
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
      if (!q) throw new Error("Question missing.");
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
      if (trial.questionNumber < 2) {
        trial.questionNumber++;
        trial.votes = {};
        trial.selection = null;
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
