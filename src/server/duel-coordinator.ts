import { addItem } from "../game/inventory/inventory.js";
import { goldReward } from "../game/progression/economy.js";
import { expeditionEvent } from "../game/progression/events.js";
import { resolveDuel } from "../game/resolve-duel.js";
import type { Duel } from "../shared/duel-types.js";
import { freezeClock, newClock } from "./clocks.js";
import { enterCrew, resumeCrewClocks } from "./crew-clock.js";
import type { StoredRoom } from "./room-types.js";

const crewIds = (room: StoredRoom, duel: Duel) => duel.crewIds.filter((id) => room.runs[id]);
export const duelHeroes = (room: StoredRoom, duel: Duel) =>
  room.state.heroes.filter((h) => duel.crewIds.includes(h.crewId) && h.status === "alive");
export const duelHolds = (room: StoredRoom, id: string) =>
  room.duels.some(
    (d) => d.crewIds.includes(id) && ["active", "offered", "champion-offer"].includes(d.status),
  );
function phase(room: StoredRoom, duel: Duel, now: number, reveal: boolean) {
  duel.phase = reveal ? "reveal" : "choice";
  for (const id of crewIds(room, duel)) {
    const run = room.runs[id];
    enterCrew(room, run, { kind: reveal ? "combat-reveal" : "combat" }, now);
    run.progress.turn = duel.turn;
    run.clock = newClock(
      room.speed === "fast" ? (reveal ? 1000 : 3000) : reveal ? 10000 : 45000,
      now,
      room.speed !== "manual" &&
        !room.pauseReasons.length &&
        !run.pauseReasons.length &&
        !room.state.trial,
    );
  }
}
function start(room: StoredRoom, duel: Duel, now: number) {
  duel.status = "active";
  const p = room.runs[duel.crewIds[0]].progress;
  const node = room.state.chapterMaps[p.chapter - 1].nodes.find((n) => n.id === duel.nodeId);
  if (!node) throw new Error("Arena missing");
  for (const id of crewIds(room, duel)) {
    const crew = room.state.crews.find((c) => c.id === id),
      run = room.runs[id];
    if (!crew) throw new Error("Crew missing");
    const clock = structuredClone(run.clock);
    freezeClock(clock, now);
    duel.saved[id] = structuredClone({
      progress: run.progress,
      clock,
      location: crew.location,
      ready: run.ready,
    });
    duel.capacity[id] = Math.max(
      1,
      duelHeroes(room, duel)
        .filter((h) => h.crewId === id)
        .reduce((n, h) => n + h.hp - 1, 0),
    );
    duel.stakes[id] = 0;
    crew.location = { kind: "room", roomId: duel.id };
  }
  if (duel.npc) duel.capacity.champion = 47;
  room.state.encounters.push({
    id: duel.id,
    definition: node.room,
    crewIds: duel.crewIds,
    enteringPower: {},
    spawnPower: 24,
    bodyHp: duel.npc?.hp ?? 1,
    maxBodyHp: duel.npc?.maxHp ?? 1,
    weakHp: 0,
    maxWeakHp: 0,
    status: "active",
    contribution: {},
    purseAwarded: true,
    rivalry: { winnerCrewId: null },
    shield: 0,
    bossPhase: 1,
    pendingBossPhase: 1,
    attempt: 1,
    nodeId: node.id,
    kind: "battle",
    pilfered: [],
  });
  phase(room, duel, now, false);
}
function finish(room: StoredRoom, duel: Duel, now: number) {
  duel.status = "finished";
  for (const id of crewIds(room, duel)) {
    const saved = duel.saved[id],
      run = room.runs[id],
      crew = room.state.crews.find((c) => c.id === id);
    if (!saved || !crew) throw new Error("Arena continuation missing");
    run.progress = saved.progress;
    crew.location = saved.location;
    enterCrew(room, run, saved.progress.phase, now);
    run.clock = saved.clock;
    run.ready = saved.ready;
  }
  room.state.encounters = room.state.encounters.filter((e) => e.id !== duel.id);
  resumeCrewClocks(room, now);
}
export function cancelDuel(room: StoredRoom, duel: Duel, now: number) {
  finish(room, duel, now);
}
export function progressDuels(room: StoredRoom, now: number, force = false) {
  for (const duel of room.duels) {
    if (duel.status === "offered" || duel.status === "champion-offer") {
      if (duel.status === "offered" && now >= duel.expiresAt) {
        duel.status = duel.npc ? "champion-offer" : "declined";
        duel.votes = {};
        continue;
      }
      const consent =
        (duel.status === "champion-offer" || !duel.npc) &&
        crewIds(room, duel).every((id) => {
          const members = duelHeroes(room, duel).filter((h) => h.crewId === id);
          return members.filter((h) => duel.votes[h.playerId]).length > members.length / 2;
        });
      if (
        consent &&
        !room.discovery &&
        !room.state.trial &&
        !crewIds(room, duel).some((id) => room.runs[id].pauseReasons.length)
      )
        start(room, duel, now);
      continue;
    }
    if (
      duel.status !== "active" ||
      crewIds(room, duel).some((id) => room.runs[id].pauseReasons.length) ||
      (room.discovery && duel.phase === "choice")
    )
      continue;
    const run = room.runs[duel.crewIds[0]],
      ready = duelHeroes(room, duel).every((h) => duel.actions[h.playerId] !== undefined),
      expired = run.clock.deadline !== null && run.clock.deadline <= now;
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
    resolveDuel(room.state, duel);
    if (duel.turn === 3) {
      const [a, b] = duel.crewIds;
      const left = (duel.damage[a] ?? 0) * duel.capacity[a],
        right = (duel.damage[b] ?? 0) * duel.capacity[b];
      duel.winner = left === right ? null : left > right ? a : b;
      for (const id of crewIds(room, duel)) {
        const crew = room.state.crews.find((c) => c.id === id);
        if (!crew) continue;
        crew.economy = goldReward(crew, duel.winner === id ? 12 : 6);
        for (const hero of duelHeroes(room, duel).filter((h) => h.crewId === id))
          hero.inventory = addItem(hero.inventory, {
            id: `arena:${duel.id}:${hero.id}`,
            kind: "draught",
            count: duel.winner === id ? 2 : 1,
          });
        expeditionEvent(
          room.state,
          id,
          { kind: "crew", actor: id, crew },
          `${crew.name}: arena ${duel.winner === id ? "victory · 12" : "result · 6"} gold.`,
          0.85,
          "duel-result",
        );
      }
    }
    phase(room, duel, now, true);
  }
}
export function duelsDue(room: StoredRoom, now: number) {
  return room.duels.some((d) =>
    d.status === "offered"
      ? now >= d.expiresAt ||
        (!d.npc &&
          crewIds(room, d).every(
            (id) =>
              duelHeroes(room, d).filter((h) => h.crewId === id && d.votes[h.playerId]).length >
              duelHeroes(room, d).filter((h) => h.crewId === id).length / 2,
          ))
      : d.status === "champion-offer"
        ? duelHeroes(room, d).filter((h) => d.votes[h.playerId]).length >
          duelHeroes(room, d).length / 2
        : d.status === "active" &&
          !crewIds(room, d).some((id) => room.runs[id].pauseReasons.length) &&
          (!room.discovery || d.phase === "reveal") &&
          ((d.phase === "choice" && duelHeroes(room, d).every((h) => d.actions[h.playerId])) ||
            (room.runs[d.crewIds[0]].clock.deadline ?? Infinity) <= now),
  );
}
