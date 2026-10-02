import type { MatchState } from "../shared/game-types.js";
import type { PublicRoomView, RoomView } from "../shared/view-types.js";
import { legalActions } from "./action-options.js";
import { activeQuestion } from "./learning.js";
import { rivalryDoor } from "./rivalry.js";
import { winningCamp, winningRoute } from "./voting.js";
export type ViewOptions = {
  deadline: number | null;
  remaining: number | null;
  phaseStartedAt: number;
  phaseDuration: number;
  serverNow: number;
  speed: "manual" | "normal" | "fast";
  storageError: string | null;
  testMode: boolean;
  readOnly: boolean;
};
export function projectRoom(
  s: MatchState,
  playerId: string | null,
  isHost: boolean,
  options: ViewOptions,
  sharedView?: PublicRoomView,
): RoomView {
  const { testMode, readOnly, ...clock } = options;
  const presenting = ["arrival", "combat-reveal", "camp-reveal", "extraction", "return"].includes(
    s.phase.kind,
  );
  const locked = s.quizLocked && ["explanation", "equipment", "return"].includes(s.phase.kind);
  const q = ["question", "explanation", "equipment", "return"].includes(s.phase.kind)
    ? activeQuestion(s)
    : null;
  const question = q
    ? { id: q.id, topic: q.topic, prompt: q.prompt, choices: [...q.choices], source: q.source }
    : null;
  const cached = sharedView;
  const base: PublicRoomView = cached
    ? { ...cached, ...clock }
    : {
        role: "projector",
        id: s.id,
        code: s.code,
        revision: s.revision,
        status: s.status,
        depth: s.depth,
        turn: s.turn,
        globalTurn: s.globalTurn,
        rivalryRoomIds: s.offeredRooms.filter((r) => rivalryDoor(s, r)).map((r) => r.id),
        phase: { ...s.phase },
        phaseId: s.phaseId,
        heroes: structuredClone(s.heroes),
        crews: structuredClone(s.crews),
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
        events: presenting ? structuredClone(s.events) : [],
        history: structuredClone(s.history.slice(-50)),
        before: presenting ? structuredClone(s.before) : null,
        winners: [...s.winners],
        learningEnabled: s.learningEnabled,
        ...clock,
        question,
        correctChoice: locked && q ? q.correctIndex : null,
        explanation: locked && q ? q.explanation : null,
        quizCause: s.quizCause,
        quizResults: locked ? structuredClone(s.quizResults) : [],
        participation: s.crews.map((c) => {
          const members = s.players.filter((p) => p.crewId === c.id);
          const eligible = ["route", "camp"].includes(s.phase.kind)
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
            answered: members.filter((p) => s.answers[p.id] !== undefined).length,
          };
        }),
      };
  if (isHost) return { ...base, role: "host", testMode, readOnly };
  const self = s.players.find((p) => p.id === playerId);
  if (!self) return base;
  const hero = s.heroes.find((h) => h.playerId === self.id) ?? null;
  return {
    ...base,
    role: "player",
    self: { ...self },
    hero: structuredClone(hero),
    readOnly,
    classNotice: self.classNotice,
    crewInputs: s.players
      .filter((p) => self.crewId !== null && p.crewId === self.crewId)
      .map((p) => ({
        playerId: p.id,
        name: p.name,
        action: s.actions[p.id] ?? null,
        route: s.routeVotes[p.id] ?? null,
        camp: s.campVotes[p.id] ?? null,
        withdraw: s.withdrawVotes[p.id] ?? false,
      })),
    legalActions: hero && s.phase.kind === "combat" ? legalActions(s, hero) : [],
    selectedAction: s.actions[self.id] ?? null,
    winningRoute: self.crewId && s.status !== "lobby" ? winningRoute(s, self.crewId) : null,
    winningCamp: self.crewId ? winningCamp(s, self.crewId) : null,
    answerChoice: s.answers[self.id] ?? null,
    equipmentChoice: s.equipmentChoices[self.id] ?? null,
  };
}
