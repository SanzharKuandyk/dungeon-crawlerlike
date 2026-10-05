import { legalActions } from "../game/action-options.js";
import { crewState } from "../game/crew-state.js";
import { projectRoom, publicArena, publicEvent, type ViewOptions } from "../game/projections.js";
import { clockView } from "./clocks.js";
import { eligibleMembers, playerRun } from "./crew-decisions.js";
import { reject } from "./errors.js";
import { hostCapabilities } from "./host-capabilities.js";
import type { Binding, StoredRoom } from "./room-types.js";
import { questionActive } from "./shared-event-coordinator.js";

export function createRoomProjector(rooms: Map<string, StoredRoom>, clock: () => number) {
  const publicViews = new WeakMap<
    StoredRoom["state"],
    { revision: number; view: import("../shared/view-types.js").PublicRoomView }
  >();
  const runsCache = new WeakMap<
    StoredRoom,
    { revision: number; runs: import("../shared/crew-run-types.js").CrewRunView[] }
  >();
  return function snapshot(binding: Binding) {
    const room = rooms.get(binding.code);
    if (!room) reject("NOT_FOUND", "Room not found.");
    let cachedRuns = runsCache.get(room);
    if (!cachedRuns || cachedRuns.revision !== room.state.revision) {
      cachedRuns = {
        revision: room.state.revision,
        runs: Object.values(room.runs).map((run) => ({
          crewId: run.crewId,
          clock: run.clock,
          suspended: run.suspended,
          pauseReasons: run.pauseReasons,
          finished: run.finished,
          depth: run.progress.depth,
          turn: run.progress.turn,
          phase: run.progress.phase,
          phaseId: run.progress.phaseId,
          before: [
            "arrival",
            "combat-reveal",
            "combat-recap",
            "camp-reveal",
            "event-reveal",
            "extraction",
            "return",
          ].includes(run.progress.phase.kind)
            ? publicArena(run.progress.before)
            : null,
          events: [
            "arrival",
            "combat-reveal",
            "combat-recap",
            "camp-reveal",
            "event-reveal",
            "extraction",
            "return",
          ].includes(run.progress.phase.kind)
            ? run.progress.events.map(publicEvent)
            : [],
          memberCount: eligibleMembers(room, run).length,
          readyCount: run.ready.filter((id) => eligibleMembers(room, run).includes(id)).length,
        })),
      };
      runsCache.set(room, cachedRuns);
    }
    const projectedRuns = cachedRuns.runs;
    const options: ViewOptions = {
      duels: room.duels
        .filter((duel) => ["offered", "active", "champion-offer"].includes(duel.status))
        .map((duel) => ({
          npc: duel.npc,
          id: duel.id,
          nodeId: duel.nodeId,
          crewIds: duel.crewIds,
          status: duel.status,
          expiresAt: duel.expiresAt,
          turn: duel.turn,
          phase: duel.phase,
          stakes: duel.stakes,
          damage: duel.phase === "reveal" ? {} : duel.damage,
          winner: null,
          ownVote: binding.session?.playerId
            ? (duel.votes[binding.session.playerId] ?? null)
            : null,
          ownAction: binding.session?.playerId
            ? (duel.actions[binding.session.playerId] ?? null)
            : null,
          consent: duel.crewIds.map((id) => {
            const heroes = room.state.heroes.filter(
              (hero) => hero.crewId === id && hero.status === "alive",
            );
            return {
              crewId: id,
              yes: heroes.filter((hero) => duel.votes[hero.playerId]).length,
              needed: Math.floor(heroes.length / 2) + 1,
            };
          }),
          readyCount: Object.keys(duel.actions).length,
          memberCount: room.state.heroes.filter(
            (hero) => duel.crewIds.includes(hero.crewId) && hero.status === "alive",
          ).length,
        })),
      deadline: room.deadline,
      remaining: room.remaining,
      phaseStartedAt: room.phaseStartedAt,
      phaseDuration: room.phaseDuration,
      serverNow: clock(),
      speed: room.speed,
      storageError: room.storageError,
      testMode: room.testMode,
      moderation: hostCapabilities(room),
      operations: room.state.players.map((p) => ({
        playerId: p.id,
        controlling: p.connected,
        absentMs: p.connected ? 0 : Math.max(0, clock() - (room.absentSince[p.id] ?? clock())),
      })),
      readOnly: binding.readOnly,
      independent: room.state.rulesVersion === "dungeon-v5",
      quizActive: questionActive(room),
      intermissionPending: room.discovery !== null,
      hostReconnectUntil:
        room.lifecycle.kind === "live" && room.lifecycle.hostDisconnectedAt !== null
          ? room.lifecycle.hostDisconnectedAt + 90000
          : null,
      pauseReasons: room.pauseReasons,
      pvpEnabled: room.pvpEnabled,
      closed: room.lifecycle.kind === "closed",
      inactivityFallback: room.inactivityFallback,
      crewRuns: projectedRuns,
    };
    let cached = publicViews.get(room.state);
    if (!cached || cached.revision !== room.state.revision) {
      const view = projectRoom(room.state, null, false, options);
      if (view.role !== "projector") throw new Error("Invalid public projection");
      cached = { revision: room.state.revision, view };
      publicViews.set(room.state, cached);
    }
    const run =
      binding.session?.role === "player" ? playerRun(room, binding.session.playerId) : undefined;
    if (run && !questionActive(room)) {
      const duel = room.duels.find(
        (duel) => duel.status === "active" && duel.crewIds.includes(run.crewId),
      );
      const visibleCrews = duel?.crewIds ?? [run.crewId];
      const scoped = crewState(room.state, run, true);
      const localBase = {
        ...cached.view,
        ...clockView(run.clock),
        depth: scoped.depth,
        turn: scoped.turn,
        globalTurn: scoped.globalTurn,
        phase: scoped.phase,
        phaseId: scoped.phaseId,
        before: [
          "arrival",
          "combat-reveal",
          "combat-recap",
          "camp-reveal",
          "event-reveal",
          "extraction",
          "return",
        ].includes(run.progress.phase.kind)
          ? publicArena(run.progress.before)
          : null,
        events: [
          "arrival",
          "combat-reveal",
          "combat-recap",
          "camp-reveal",
          "event-reveal",
          "extraction",
          "return",
        ].includes(run.progress.phase.kind)
          ? run.progress.events.map(publicEvent)
          : [],
        offeredRooms: scoped.offeredRooms,
        expeditionMap: scoped.expeditionMap ?? null,
        heroes: cached.view.heroes.filter((hero) => visibleCrews.includes(hero.crewId)),
        encounters: cached.view.encounters.filter((encounter) =>
          encounter.crewIds.includes(run.crewId),
        ),
        crewRuns: cached.view.crewRuns.map((entry) =>
          entry.crewId === run.crewId ? entry : { ...entry, before: null, events: [] },
        ),
      };
      const view = projectRoom(
        scoped,
        binding.session?.playerId ?? null,
        false,
        {
          ...options,
          ...clockView(run.clock),
          crewRuns: localBase.crewRuns,
          readyPlayers: run.ready,
        },
        localBase,
      );
      if (view.role === "player" && view.hero && view.phase.kind === "combat")
        view.legalActions = legalActions(crewState(room.state, run), view.hero);
      if (run.pauseReasons.length) view.status = "paused";
      view.participation = (options.crewRuns ?? []).map((r) => ({
        crewId: r.crewId,
        total: r.memberCount,
        ready: r.readyCount,
        answered: 0,
      }));
      return view;
    }
    const projected = projectRoom(
      room.state,
      binding.session?.playerId ?? null,
      binding.session?.role === "host",
      options,
      cached.view,
    );
    if (run && projected.role === "player") {
      projected.heroes = projected.heroes.filter((hero) => hero.crewId === run.crewId);
      projected.encounters = projected.encounters.filter((encounter) =>
        encounter.crewIds.includes(run.crewId),
      );
      projected.crewRuns = projected.crewRuns.map((entry) => ({
        ...entry,
        before: null,
        events: [],
      }));
      if (projected.before)
        projected.before = {
          crews: projected.before.crews.filter((crew) => crew.id === run.crewId),
          heroes: projected.before.heroes.filter((hero) => hero.crewId === run.crewId),
          encounters: projected.before.encounters.filter((encounter) =>
            encounter.crewIds.includes(run.crewId),
          ),
        };
    }
    return projected;
  };
}
