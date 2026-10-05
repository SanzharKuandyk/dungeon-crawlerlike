import type { CampChoice, HeroAction } from "../shared/command-types.js";
import type { ClassId } from "../shared/content-types.js";
import type { DuelAction } from "../shared/duel-types.js";
import type { GameEvent } from "../shared/event-types.js";
import type { ClientSession } from "./session.js";

export function playerController(session: ClientSession) {
  return {
    upgrade: (offerId: string, targetItemId: string, inventoryRevision: number) =>
      session.command((env, ack) =>
        session.socket.emit(
          "shop:upgrade",
          { ...env, offerId, targetItemId, inventoryRevision },
          ack,
        ),
      ),
    event: (choice: import("../shared/exploration-types.js").ExplorationChoice) =>
      session.command((env, ack) => session.socket.emit("event:choose", { ...env, choice }, ack)),
    siege: (role: import("../shared/siege-types.js").SiegeRole) =>
      session.command((env, ack) =>
        session.socket.emit("siege:choose", { ...env, siegeId: "siege-1", role }, ack),
      ),
    claimReward: (
      claim: import("../shared/reward-types.js").RewardClaim,
      inventoryRevision: number,
    ) =>
      session.command((env, ack) =>
        session.socket.emit("reward:claim", { ...env, claim, inventoryRevision }, ack),
      ),
    resultReady: () => session.command((env, ack) => session.socket.emit("result:ready", env, ack)),
    get pending() {
      return session.pendingCount;
    },
    get error() {
      return session.error;
    },
    get ready() {
      return session.ready;
    },
    inventory: (
      command: import("../shared/inventory-types.js").InventoryCommand,
      inventoryRevision: number,
    ) =>
      session.command((env, ack) =>
        session.socket.emit("inventory:command", { ...env, command, inventoryRevision }, ack),
      ),
    buy: (offerId: string, inventoryRevision: number) =>
      session.command((env, ack) =>
        session.socket.emit("shop:buy", { ...env, offerId, inventoryRevision }, ack),
      ),
    treat: (treatment: import("../shared/inventory-types.js").Treatment) =>
      session.command((env, ack) => session.socket.emit("camp:treat", { ...env, treatment }, ack)),
    rescue: () =>
      session.command((env, ack) =>
        session.socket.emit("crew:recover", { ...env, command: { kind: "request-help" } }, ack),
      ),
    revive: (targetHeroId: string, payment: "gold" | "debt") =>
      session.command((env, ack) =>
        session.socket.emit(
          "crew:recover",
          { ...env, command: { kind: "revive", targetHeroId, payment } },
          ack,
        ),
      ),
    trialVote: (trialId: string, tileId: string) =>
      session.command((env, ack) =>
        session.socket.emit("trial:vote", { ...env, trialId, tileId }, ack),
      ),
    wager: (trialId: string, wager: import("../shared/trial-types.js").WagerLevel) =>
      session.command((env, ack) =>
        session.socket.emit("trial:wager", { ...env, trialId, wager }, ack),
      ),
    trialAnswer: (trialId: string, questionId: string, choice: number) =>
      session.command((env, ack) =>
        session.socket.emit("trial:answer", { ...env, trialId, questionId, choice }, ack),
      ),
    blessing: (
      trialId: string,
      offerId: string,
      replace: import("../shared/condition-types.js").BlessingKind | null = null,
    ) =>
      session.command((env, ack) =>
        session.socket.emit("trial:blessing", { ...env, trialId, offerId, replace }, ack),
      ),
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
    arenaQueue: () => session.command((env, ack) => session.socket.emit("pvp:queue", env, ack)),
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
      session.command((env, ack) => {
        const hero = session.view && "hero" in session.view ? session.view.hero : null;
        const plan: import("../shared/turn-plans.js").TurnPlan =
          action.kind === "ward" || action.kind === "observe"
            ? { kind: "spirit", action }
            : {
                kind: "hero",
                actions: [action],
                activation: null,
                inventoryRevision: hero?.inventory.revision ?? 0,
              };
        session.socket.emit("hero:plan", { ...env, plan }, ack);
      }),
    plan: (plan: import("../shared/turn-plans.js").TurnPlan) =>
      session.command((env, ack) => session.socket.emit("hero:plan", { ...env, plan }, ack)),
    withdraw: (withdraw: boolean) =>
      session.command((env, ack) =>
        session.socket.emit("crew:withdraw", { ...env, withdraw }, ack),
      ),
    camp: (choice: CampChoice) =>
      session.command((env, ack) => session.socket.emit("camp:vote", { ...env, choice }, ack)),
  };
}
export type PlayerController = ReturnType<typeof playerController>;
