import type { MatchState } from "../shared/game-types.js";
import type { PublicRoomView, RoomView } from "../shared/view-types.js";
import { legalActions } from "./action-options.js";
import { campAvailable, reachableNodes } from "./expedition-map.js";
import { projectTrial } from "./trials/projections.js";

import { winningCamp, winningRoute } from "./voting.js";

export type ViewOptions = {
  pauseReasons?: PublicRoomView["pauseReasons"];
  pvpEnabled?: boolean;
  deadline: number | null;
  remaining: number | null;
  phaseStartedAt: number;
  phaseDuration: number;
  serverNow: number;
  speed: "manual" | "normal" | "fast";
  storageError: string | null;
  moderation?: import("../shared/view-types.js").HostRoomView["moderation"];
  operations?: import("../shared/view-types.js").HostRoomView["operations"];
  testMode: boolean;
  readOnly: boolean;
  duels?: PublicRoomView["duels"];
  crewRuns?: PublicRoomView["crewRuns"];
  independent?: boolean;
  quizActive?: boolean;
  intermissionPending?: boolean;
  hostReconnectUntil?: number | null;
  closed?: boolean;
  inactivityFallback?: boolean;
  readyPlayers?: string[];
};
export function projectRoom(
  s: MatchState,
  playerId: string | null,
  isHost: boolean,
  options: ViewOptions,
  sharedView?: PublicRoomView,
): RoomView {
  const { testMode, readOnly, readyPlayers, operations, moderation, ...clock } = options;
  const presenting = ["arrival", "combat-reveal", "camp-reveal", "extraction", "return"].includes(
    s.phase.kind,
  );
  const cached = sharedView;
  const base: PublicRoomView = cached
    ? { ...cached, ...clock }
    : {
        role: "projector",
        chapterMaps: structuredClone(s.chapterMaps),
        trial: projectTrial(s),
        trialContentReady: !s.trialPack.fixture,
        skillStress: { skirmish: s.content.balance?.skirmishStress ?? 2 },
        id: s.id,
        code: s.code,
        revision: s.revision,
        status: s.status,
        depth: s.depth,
        turn: s.turn,
        globalTurn: s.globalTurn,
        phase: { ...s.phase },
        phaseId: s.phaseId,
        heroes: s.heroes.map(publicHero),
        crews: s.crews.map((c) => ({ ...structuredClone(c), shop: null })),
        encounters: structuredClone(s.encounters),
        players: s.players.map(({ id, name, crewId, connected, classId }) => ({
          id,
          name,
          crewId,
          connected,
          classId,
        })),
        classes: structuredClone(s.content.classes),
        offeredRooms: structuredClone(s.offeredRooms),
        expeditionMap: structuredClone(s.expeditionMap ?? null),
        events: presenting ? s.events.map(publicEvent) : [],
        history: s.history.slice(-50).map(publicEvent),
        before:
          presenting && s.before
            ? {
                ...s.before,
                heroes: s.before.heroes.map(publicHero),
                crews: s.before.crews.map((c) => ({ ...c, shop: null })),
              }
            : null,
        winners: [...s.winners],
        learningEnabled: s.learningEnabled,
        pauseReasons: options.pauseReasons ?? [],
        pvpEnabled: options.pvpEnabled ?? true,
        crewRuns: options.crewRuns ?? [],
        duels: options.duels ?? [],
        independent: options.independent ?? false,
        quizActive: options.quizActive ?? s.trial !== null,
        intermissionPending: options.intermissionPending ?? false,
        hostReconnectUntil: options.hostReconnectUntil ?? null,
        closed: options.closed ?? false,
        inactivityFallback: options.inactivityFallback ?? true,
        ...clock,
        participation: s.crews.map((c) => {
          const members = s.players.filter((p) => p.crewId === c.id);
          const eligible =
            s.phase.kind === "camp" && !campAvailable(s, c)
              ? []
              : ["route", "camp"].includes(s.phase.kind)
                ? members.filter((p) =>
                    s.heroes.some((h) => h.playerId === p.id && h.status === "alive"),
                  )
                : members;
          return {
            crewId: c.id,
            total: eligible.length,
            ready: eligible.filter((p) =>
              s.phase.kind === "route"
                ? s.routeVotes[p.id] !== undefined
                : s.phase.kind === "camp"
                  ? s.campVotes[p.id] !== undefined
                  : s.actions[p.id] !== undefined,
            ).length,
            answered: members.filter((p) => s.trial?.answers[p.id] !== undefined).length,
          };
        }),
      };
  if (isHost)
    return {
      ...base,
      role: "host",
      testMode,
      readOnly,
      operations: operations ?? [],
      moderation: moderation ?? { crews: [] },
    };
  const self = s.players.find((p) => p.id === playerId);
  if (!self) return base;
  const hero = s.heroes.find((h) => h.playerId === self.id) ?? null;
  return {
    ...base,
    role: "player",
    self: { ...self },
    result:
      s.phase.kind === "result"
        ? structuredClone(s.crewProgress[self.crewId ?? ""]?.result ?? null)
        : null,
    rewards: s.rewardOffers
      .filter((o) => o.ownerHeroId === hero?.id && o.status === "pending")
      .map((o) => structuredClone(o)),
    lastTurn: ["combat-reveal"].includes(s.phase.kind)
      ? null
      : structuredClone(s.crewProgress[self.crewId ?? ""]?.lastTurn ?? null),
    transaction: structuredClone(s.transactions[self.id] ?? null),
    restAvailable: !s.crewProgress[self.crewId ?? ""]?.restedNodeIds.includes(
      s.crewProgress[self.crewId ?? ""]?.nodeId ?? "",
    ),
    shop: (() => {
      const shop = s.crews.find((c) => c.id === self.crewId)?.shop;
      if (!shop || !hero) return null;
      return {
        ...shop,
        offers: { [hero.id]: shop.offers[hero.id] ?? [] },
        allowances: { [hero.id]: shop.allowances[hero.id] ?? 0 },
      };
    })(),
    trialInput: {
      vote: s.trial?.votes[self.id] ?? null,
      wager: s.trial?.wagers[self.id] ?? null,
      answer: s.trial?.answers[self.id] ?? null,
      offers: s.trial?.offers[self.id] ?? [],
      choice: s.trial?.choices[self.id] ?? null,
      crewResults:
        s.trial?.phase.kind === "reveal"
          ? s.trial.results.filter(
              (r) => s.players.find((p) => p.id === r.playerId)?.crewId === self.crewId,
            )
          : [],
    },
    hero: structuredClone(hero),
    readOnly,
    classNotice: self.classNotice,
    crewInputs: s.players
      .filter((p) => self.crewId !== null && p.crewId === self.crewId)
      .map((p) => ({
        playerId: p.id,
        name: p.name,
        ready: readyPlayers?.includes(p.id) ?? false,
        action: s.crewProgress[self.crewId ?? ""]?.actions[p.id] ?? null,
        route: s.crewProgress[self.crewId ?? ""]?.routeVotes[p.id] ?? null,
        camp: s.crewProgress[self.crewId ?? ""]?.campVotes[p.id] ?? null,
        withdraw: s.crewProgress[self.crewId ?? ""]?.withdrawVotes[p.id] ?? false,
      })),
    legalActions: hero && s.phase.kind === "combat" ? legalActions(s, hero) : [],
    selectedAction: s.crewProgress[self.crewId ?? ""]?.actions[self.id] ?? null,
    winningRoute: self.crewId && s.status !== "lobby" ? winningRoute(s, self.crewId) : null,
    reachableNodeIds: self.crewId ? reachableNodes(s, self.crewId).map((node) => node.id) : [],
    recoveryAvailable: s.crewProgress[self.crewId ?? ""]?.recovering ?? false,
    canCamp: s.crews.some((crew) => crew.id === self.crewId && campAvailable(s, crew)),
    winningCamp: self.crewId ? winningCamp(s, self.crewId) : null,
    decisionReady: readyPlayers?.includes(self.id) ?? false,
  };
}

export function publicHero(hero: import("../shared/game-types.js").Hero) {
  const { inventory, pendingBlessings: _offers, ...visible } = hero;
  return {
    ...structuredClone(visible),
    pendingBlessings: [],
    inventory: {
      revision: inventory.revision,
      equipment: structuredClone(inventory.equipment),
      backpack: [],
      overflow: [],
    },
  };
}
export function publicEvent(event: import("../shared/event-types.js").GameEvent) {
  if (event.kind === "hero") return { ...event, hero: publicHero(event.hero) };
  if (event.kind === "crew")
    return { ...event, crew: { ...structuredClone(event.crew), shop: null } };
  return structuredClone(event);
}

export function publicArena(arena: import("../shared/game-types.js").ArenaState | null) {
  return arena
    ? {
        ...arena,
        heroes: arena.heroes.map(publicHero),
        crews: arena.crews.map((c) => ({ ...structuredClone(c), shop: null })),
      }
    : null;
}
