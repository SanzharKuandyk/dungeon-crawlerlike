import { crewProgress } from "../game/crew-state.js";
import { crewEvent, finalizeEvents, storyEvent } from "../game/events.js";
import { resolveDuel } from "../game/resolve-duel.js";
import type { Duel } from "../shared/duel-types.js";
import { freezeClock, newClock } from "./clocks.js";
import { enterCrew, resumeCrewClocks } from "./crew-clock.js";
import type { StoredRoom } from "./room-types.js";

export const duelHeroes = (room: StoredRoom, duel: Duel) =>
  room.state.heroes.filter((hero) => duel.crewIds.includes(hero.crewId) && hero.status === "alive");
export function duelHolds(room: StoredRoom, crewId: string) {
  return room.duels.some(
    (duel) =>
      duel.crewIds.includes(crewId) &&
      (duel.status === "active" ||
        (duel.status === "offered" &&
          ["return", "route"].includes(room.runs[crewId].progress.phase.kind))),
  );
}
function phase(room: StoredRoom, duel: Duel, now: number, reveal: boolean) {
  duel.phase = reveal ? "reveal" : "choice";
  for (const id of duel.crewIds) {
    const run = room.runs[id];
    enterCrew(room, run, { kind: reveal ? "combat-reveal" : "combat" }, now);
    run.progress.turn = duel.turn;
    const duration = room.speed === "fast" ? (reveal ? 1000 : 3000) : reveal ? 6800 : 45000;
    run.clock = newClock(
      duration,
      now,
      room.speed !== "manual" && !room.pauseReasons.length && !run.pauseReasons.length,
    );
  }
}
function start(room: StoredRoom, duel: Duel, now: number) {
  const node = room.state.expeditionMap?.nodes.find((node) => node.id === duel.nodeId);
  if (!node) throw new Error("Duel node missing");
  duel.status = "active";
  for (const id of duel.crewIds) {
    const crew = room.state.crews.find((crew) => crew.id === id);
    if (!crew) throw new Error("Duel crew missing");
    const run = room.runs[id];
    const savedClock = structuredClone(run.clock);
    freezeClock(savedClock, now);
    duel.saved[id] = structuredClone({
      progress: run.progress,
      clock: savedClock,
      location: crew.location,
    });
    duel.capacity[id] = Math.max(
      1,
      duelHeroes(room, duel)
        .filter((hero) => hero.crewId === id)
        .reduce((sum, hero) => sum + hero.hp - 1, 0),
    );
    duel.stakes[id] = Math.min(3, crew.carriedTreasure);
    crew.carriedTreasure -= duel.stakes[id];
    crew.location = { kind: "room", roomId: duel.id };
  }
  room.state.encounters.push({
    id: duel.id,
    definition: node.room,
    crewIds: duel.crewIds,
    enteringPower: {},
    spawnPower: 24,
    bodyHp: 1,
    maxBodyHp: 1,
    weakHp: 0,
    maxWeakHp: 0,
    status: "active",
    contribution: {},
    purseAwarded: true,
    rivalry: { winnerCrewId: null },
  });
  phase(room, duel, now, false);
}
function finish(room: StoredRoom, duel: Duel, now: number) {
  duel.status = "finished";
  for (const id of duel.crewIds) {
    const saved = duel.saved[id];
    const run = room.runs[id];
    const crew = room.state.crews.find((crew) => crew.id === id);
    if (!saved || !crew) throw new Error("Duel continuation missing");
    run.progress = saved.progress;
    run.clock = saved.clock;
    crew.location = saved.location;
    enterCrew(room, run, saved.progress.phase, now);
    run.clock = saved.clock;
  }
  room.state.encounters = room.state.encounters.filter((encounter) => encounter.id !== duel.id);
  resumeCrewClocks(room, now);
}
export function cancelDuel(room: StoredRoom, duel: Duel, now: number) {
  for (const id of duel.crewIds) {
    const crew = room.state.crews.find((c) => c.id === id);
    if (crew) crew.carriedTreasure += duel.stakes[id] ?? 0;
  }
  finish(room, duel, now);
}
export function progressDuels(room: StoredRoom, now: number, force = false) {
  for (const duel of room.duels) {
    if (duel.status === "offered") {
      if (
        now >= duel.expiresAt ||
        duel.crewIds.some(
          (id) =>
            room.runs[id]?.finished ||
            room.state.crews.find((crew) => crew.id === id)?.mapPosition?.nodeId !== duel.nodeId,
        )
      ) {
        duel.status = "declined";
        continue;
      }
      const consent = duel.crewIds.every((id) => {
        const members = duelHeroes(room, duel).filter((hero) => hero.crewId === id);
        return members.filter((hero) => duel.votes[hero.playerId]).length > members.length / 2;
      });
      const safe = duel.crewIds.every(
        (id) =>
          !room.runs[id].pauseReasons.length &&
          ["return", "route"].includes(room.runs[id].progress.phase.kind),
      );
      if (consent && safe && !room.state.quizQuestionId && !room.discovery) {
        if (duelHeroes(room, duel).some((hero) => hero.hp < 2 * hero.power)) {
          duel.status = "declined";
          storyEvent(
            room.state,
            "The challenge ends: every fighter needs half health.",
            0,
            "duel-cancelled",
          );
        } else start(room, duel, now);
      }
      continue;
    }
    if (duel.status !== "active") continue;
    if (duel.crewIds.some((id) => room.runs[id].pauseReasons.length)) continue;
    const run = room.runs[duel.crewIds[0]];
    const ready = duelHeroes(room, duel).every((hero) => duel.actions[hero.playerId] !== undefined);
    const expired = run.clock.deadline !== null && now >= run.clock.deadline;
    if (!force && (room.speed === "manual" || (!expired && !(duel.phase === "choice" && ready))))
      continue;
    if (duel.phase === "reveal") {
      if (duel.turn === 3) finish(room, duel, now);
      else {
        duel.turn++;
        duel.actions = {};
        phase(room, duel, now, false);
      }
      continue;
    }
    const state = {
      ...room.state,
      ...run.progress,
      heroes: room.state.heroes.filter((hero) => duel.crewIds.includes(hero.crewId)),
      crews: room.state.crews.filter((crew) => duel.crewIds.includes(crew.id)),
      encounters: room.state.encounters.filter((encounter) => encounter.id === duel.id),
    };
    resolveDuel(state, duel);
    if (duel.turn === 3) {
      const [a, b] = duel.crewIds;
      const aPressure = (duel.damage[a] ?? 0) * duel.capacity[a];
      const bPressure = (duel.damage[b] ?? 0) * duel.capacity[b];
      duel.winner = aPressure === bPressure ? null : aPressure > bPressure ? a : b;
      for (const crew of state.crews) {
        crew.carriedTreasure += duel.winner
          ? crew.id === duel.winner
            ? Object.values(duel.stakes).reduce((sum, value) => sum + value, 0)
            : 0
          : duel.stakes[crew.id];
        crewEvent(
          state,
          crew,
          duel.winner === crew.id
            ? `${crew.name} wins the stakes.`
            : duel.winner
              ? `${crew.name} loses the wager.`
              : "Draw: stakes returned.",
          0.85,
          "duel-result",
        );
      }
    }
    storyEvent(state, "Both crews recover. No character can die in a duel.", 0.93, "duel-recovery");
    finalizeEvents(state);
    room.state.history = state.history;
    for (const id of duel.crewIds) room.runs[id].progress = structuredClone(crewProgress(state));
    phase(room, duel, now, true);
  }
}
export function duelsDue(room: StoredRoom, now: number) {
  return room.duels.some((duel) =>
    duel.status === "offered"
      ? now >= duel.expiresAt
      : duel.status === "active" &&
        !duel.crewIds.some((id) => room.runs[id].pauseReasons.length) &&
        ((duelHeroes(room, duel).every((hero) => duel.actions[hero.playerId]) &&
          duel.phase === "choice") ||
          (room.runs[duel.crewIds[0]].clock.deadline ?? Infinity) <= now),
  );
}
