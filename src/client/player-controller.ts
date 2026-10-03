import type { CampChoice, EquipmentChoice, HeroAction } from "../shared/command-types.js";
import type { ClassId } from "../shared/content-types.js";
import type { DuelAction } from "../shared/duel-types.js";
import type { GameEvent } from "../shared/event-types.js";
import type { ClientSession } from "./session.js";

export function playerController(session: ClientSession) {
  return {
    get ready() {
      return session.ready;
    },
    history: (before: number) =>
      new Promise<GameEvent[]>((resolve) => {
        if (!session.ready) return resolve([]);
        const timer = setTimeout(() => resolve([]), 5000);
        session.socket.emit("history:read", { before }, (result) => {
          clearTimeout(timer);
          resolve(result.ok ? result.value : []);
        });
      }),
    reconnect: (takeover = false) => {
      if (!session.socket.connected) session.socket.connect();
      else session.reconnect(takeover);
    },
    challenge: (targetCrewId: string) =>
      session.command((env, ack) =>
        session.socket.emit("pvp:challenge", { ...env, targetCrewId }, ack),
      ),
    duelVote: (duelId: string, accept: boolean) =>
      session.command((env, ack) =>
        session.socket.emit("pvp:vote", { ...env, duelId, accept }, ack),
      ),
    duelAction: (duelId: string, action: DuelAction) =>
      session.command((env, ack) =>
        session.socket.emit("pvp:action", { ...env, duelId, action }, ack),
      ),
    edit: () => session.command((env, ack) => session.socket.emit("decision:edit", env, ack)),
    chooseClass: (classId: ClassId) =>
      session.command((env, ack) => session.socket.emit("hero:class", { ...env, classId }, ack)),
    route: (roomId: string) =>
      session.command((env, ack) => session.socket.emit("route:vote", { ...env, roomId }, ack)),
    action: (action: HeroAction) =>
      session.command((env, ack) => session.socket.emit("hero:action", { ...env, action }, ack)),
    withdraw: (withdraw: boolean) =>
      session.command((env, ack) =>
        session.socket.emit("crew:withdraw", { ...env, withdraw }, ack),
      ),
    camp: (choice: CampChoice) =>
      session.command((env, ack) => session.socket.emit("camp:vote", { ...env, choice }, ack)),
    answer: (questionId: string, choice: number, pact: "careful" | "blood" = "careful") =>
      session.command((env, ack) =>
        session.socket.emit("learning:answer", { ...env, questionId, choice, pact }, ack),
      ),
    equipment: (item: EquipmentChoice) =>
      session.command((env, ack) => session.socket.emit("equipment:choose", { ...env, item }, ack)),
  };
}
export type PlayerController = ReturnType<typeof playerController>;
