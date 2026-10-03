import type { ArenaState, Crew, Hero, RoomEncounter } from "../shared/game-types.js";
import type { RoomView } from "../shared/view-types.js";
import { crewView } from "./crew-view.js";

const copyHero = (h: Hero): Hero => ({ ...h, equipment: h.equipment ? { ...h.equipment } : null });
const copyCrew = (c: Crew): Crew => ({
  ...c,
  playerIds: [...c.playerIds],
  location: { ...c.location },
});
const copyEncounter = (e: RoomEncounter): RoomEncounter => ({
  ...e,
  definition: { ...e.definition },
  crewIds: [...e.crewIds],
  enteringPower: { ...e.enteringPower },
  contribution: { ...e.contribution },
});
const copyArena = (a: ArenaState): ArenaState => ({
  heroes: a.heroes.map(copyHero),
  crews: a.crews.map(copyCrew),
  encounters: a.encounters.map(copyEncounter),
});

export function phaseInstruction(view: RoomView) {
  if (view.status === "lobby") return "Awaiting descent";
  if (view.status === "paused") return "Expedition paused";
  if (view.status === "finished") return "Expedition complete";
  if (view.independent && view.role !== "player" && !view.quizActive) return "The expedition";
  const names = {
    route: view.role === "player" ? "Choose the next room" : "Crews are choosing rooms",
    arrival: "The doors open",
    combat:
      view.role === "player" ? "Choose your character’s action" : "All characters are choosing",
    "combat-reveal": "Actions revealed",
    "combat-recap": "The dust settles",
    "floor-result": "Depth complete",
    "question-intro": "An inscription is revealed",
    question: "Decipher the inscription",
    explanation: "Inscription decoded",
    equipment: "Choose equipment",
    return: "Equipment ready",
    camp: view.role === "player" ? "At the campfire" : "Crews are choosing at camp",
    "camp-reveal": "Camp decisions revealed",
    extraction: "The survivors return",
  };
  return names[view.phase.kind];
}
export function presentation(
  view: RoomView,
  serverNow: number,
  _reduced = false,
): {
  arena: ArenaState;
  actor: string | null;
  message: string;
  cursor: number;
  roomId: string | null;
} {
  if (
    view.independent &&
    view.role !== "player" &&
    !view.quizActive &&
    view.crewRuns.length &&
    !view.crewRuns.some((run) => run.phaseId === view.phaseId)
  ) {
    const arena = copyArena(view);
    for (const run of view.crewRuns) {
      const local = { ...crewView(view, run.crewId), independent: false };
      const shown = presentation(local, serverNow);
      arena.heroes = arena.heroes.map((hero) =>
        hero.crewId === run.crewId
          ? (shown.arena.heroes.find((entry) => entry.id === hero.id) ?? hero)
          : hero,
      );
      arena.crews = arena.crews.map((crew) =>
        crew.id === run.crewId
          ? (shown.arena.crews.find((entry) => entry.id === crew.id) ?? crew)
          : crew,
      );
      arena.encounters = arena.encounters.map((encounter) =>
        encounter.crewIds.includes(run.crewId)
          ? (shown.arena.encounters.find((entry) => entry.id === encounter.id) ?? encounter)
          : encounter,
      );
    }
    return { arena, actor: null, message: phaseInstruction(view), cursor: Infinity, roomId: null };
  }
  const reveal =
    ["arrival", "combat-reveal", "camp-reveal", "extraction", "return"].includes(view.phase.kind) &&
    view.before !== null;
  const final: ArenaState = { heroes: view.heroes, crews: view.crews, encounters: view.encounters };
  if (!reveal || !view.before)
    return {
      arena: final,
      actor: null as string | null,
      message: phaseInstruction(view),
      cursor: Infinity,
      roomId: null as string | null,
    };
  const elapsed =
    view.status === "paused"
      ? view.phaseDuration - (view.remaining ?? view.phaseDuration)
      : Math.max(0, serverNow - view.phaseStartedAt);
  const fraction = Math.min(1, elapsed / view.phaseDuration);
  const arena = copyArena(view.before);
  let actor: string | null = null,
    roomId: string | null = null,
    message = phaseInstruction(view),
    cursor = (view.events[0]?.sequence ?? 1) - 1;
  for (const e of view.events) {
    if (e.at > fraction) continue;
    cursor = Math.max(cursor, e.sequence);
    actor = e.actor;
    roomId = e.roomId;
    message = e.message;
    if (e.kind === "hero") {
      const i = arena.heroes.findIndex((h) => h.id === e.hero.id);
      if (i >= 0) arena.heroes[i] = copyHero(e.hero);
    }
    if (e.kind === "crew") {
      const i = arena.crews.findIndex((c) => c.id === e.crew.id);
      if (i >= 0) arena.crews[i] = copyCrew(e.crew);
    }
    if (e.kind === "enemy") {
      const i = arena.encounters.findIndex((v) => v.id === e.encounter.id);
      if (i >= 0) arena.encounters[i] = copyEncounter(e.encounter);
      else arena.encounters.push(copyEncounter(e.encounter));
    }
  }
  return { arena, actor, roomId, message, cursor };
}
