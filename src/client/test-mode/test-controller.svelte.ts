import type { TestBootstrap, TestScenario } from "../../shared/protocol.js";
import type { HostRoomView, PlayerRoomView } from "../../shared/view-types.js";
import { secureSecret } from "../connection.js";
import { notifyError } from "../notify.js";
import { type PlayerController, playerController } from "../player-controller.js";
import { type ConnectionStatus, room } from "../room.svelte.js";
import { type ClientSession, createClientSession } from "../session.js";
import { browserStorage } from "../storage.js";
import { botCamp, botPlan, botPreparation, botRoute } from "./bots.js";

export type TestActor = {
  playerId: string;
  crewId: string;
  clientId: string;
  view: PlayerRoomView | null;
  status: ConnectionStatus;
  pending: number;
  auto: boolean;
};
export function createTestController() {
  const state = $state<{
    actors: TestActor[];
    selected: string;
    host: HostRoomView | null;
    hostReady: boolean;
    busy: boolean;
    answer: number | null;
  }>({ actors: [], selected: "", host: null, hostReady: false, busy: false, answer: null });
  const sessions = new Map<string, ClientSession>(),
    controllers = new Map<string, PlayerController>();
  let host: ClientSession | null = null,
    generation = 0;
  const submitted = new Set<string>();
  function selected() {
    return state.actors.find((a) => a.playerId === state.selected);
  }
  function sync() {
    const a = selected();
    room.view = a?.view ?? null;
    room.status = a?.status ?? "connecting";
    room.pending = a?.pending ?? 0;
    room.controller = controllers.get(state.selected) ?? null;
    if (a?.view) room.clockOffset = a.view.serverNow - Date.now();
  }
  function select(id: string) {
    state.selected = id;
    const a = selected();
    if (a) a.auto = false;
    sync();
  }
  function dispose() {
    generation++;
    for (const s of sessions.values()) s.dispose();
    host?.dispose();
    sessions.clear();
    controllers.clear();
    host = null;
    state.actors = [];
    state.host = null;
    state.answer = null;
    state.hostReady = false;
    submitted.clear();
  }
  async function bootstrap(scenario: TestScenario = "fresh", reset = false) {
    state.busy = true;
    dispose();
    const epoch = generation;
    if (reset) browserStorage.removeItem("dungeon-test-bootstrap");
    const stored = browserStorage.getItem("dungeon-test-bootstrap");
    const input = stored
      ? JSON.parse(stored)
      : {
          hostSecret: secureSecret(),
          scenario,
          players: Array.from({ length: 10 }, (_, i) => ({
            clientId: `actor-${i}`,
            bootstrapSecret: secureSecret(),
          })),
        };
    browserStorage.setItem("dungeon-test-bootstrap", JSON.stringify(input));
    try {
      const response = await fetch("/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error("Cannot create the local playground.");
      const data: TestBootstrap = await response.json();
      if (epoch !== generation) return;
      state.actors = data.players.map((p) => ({
        ...p,
        view: null,
        status: "connecting",
        pending: 0,
        auto: true,
      }));
      state.selected = state.actors[0].playerId;
      state.actors[0].auto = false;
      for (const actor of state.actors) {
        const token = input.players.find(
          (p: { clientId: string }) => p.clientId === actor.clientId,
        ).bootstrapSecret;
        const session = createClientSession({
          code: data.code,
          role: "player",
          storageScope: actor.clientId,
          token,
          onView: (v) => {
            if (epoch !== generation || v.role !== "player") return;
            actor.view = v;
            if (state.selected === actor.playerId) sync();
          },
          onStatus: (s) => {
            if (epoch !== generation) return;
            actor.status = s;
            if (state.selected === actor.playerId) sync();
          },
          onPending: (n) => {
            actor.pending = n;
            if (state.selected === actor.playerId) sync();
          },
        });
        sessions.set(actor.playerId, session);
        controllers.set(actor.playerId, playerController(session));
      }
      host = createClientSession({
        code: data.code,
        role: "host",
        token: input.hostSecret,
        storageScope: "test-host",
        onView: (v) => {
          if (epoch === generation && v.role === "host") {
            if (state.host?.phaseId !== v.phaseId) state.answer = null;
            state.host = v;
          }
        },
        onStatus: (s) => {
          if (epoch === generation) state.hostReady = s === "ready";
        },
      });
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Cannot connect.");
    } finally {
      state.busy = false;
    }
  }
  const timer = setInterval(() => {
    for (const a of state.actors) {
      const v = a.view,
        c = controllers.get(a.playerId);
      if (!a.auto || !c?.ready || !v || v.status !== "running" || a.pending) continue;
      const offer = v.duels.find(
        (duel) =>
          duel.status === "offered" && duel.crewIds.includes(a.crewId) && duel.ownVote === null,
      );
      if (offer && v.hero?.status === "alive") {
        void c.duelVote(offer.id, v.hero.hp >= 2 * v.hero.power);
        continue;
      }
      if (!v.trial && ["result", "route", "camp"].includes(v.phase.kind) && !v.decisionReady) {
        const reward = v.rewards[0];
        if (reward && v.hero) {
          void c.claimReward(
            {
              offerId: reward.id,
              optionId: reward.options[0].id,
              disposition:
                reward.options[0].type === "equipment" && reward.options[0].upgradeItemId
                  ? "upgrade"
                  : v.hero.inventory.backpack.length >= 6
                    ? "leave"
                    : reward.options[0].type === "supplies"
                      ? "keep"
                      : "equip",
              replacementItemId: null,
            },
            v.hero.inventory.revision,
          );
          continue;
        }
      }
      const key = `${a.playerId}:${v.phaseId}`;
      if (submitted.has(key)) continue;
      const preparation = botPreparation(v);
      if (preparation) {
        const task =
          preparation.kind === "rescue"
            ? c.rescue()
            : preparation.kind === "buy"
              ? c.buy(preparation.offerId, v.hero?.inventory.revision ?? 0)
              : preparation.kind === "equip"
                ? c.inventory(
                    { kind: "equip", itemId: preparation.itemId },
                    v.hero?.inventory.revision ?? 0,
                  )
                : preparation.kind === "revive"
                  ? c.revive(preparation.targetHeroId, preparation.payment)
                  : c.treat(preparation.treatment);
        void task;
        continue;
      }
      submitted.add(key);
      let task: Promise<boolean> | undefined;
      if (!v.trial && v.phase.kind === "result") task = c.resultReady();
      if (!v.trial && v.phase.kind === "route" && v.hero?.status === "alive") {
        const destination = botRoute(v);
        if (destination) task = c.route(destination);
      }
      if (!v.trial && v.phase.kind === "combat") {
        const duel = v.duels.find(
          (duel) => duel.status === "active" && duel.crewIds.includes(a.crewId),
        );
        if (duel) {
          const rival = v.heroes.find(
            (hero) => hero.crewId !== a.crewId && hero.status === "alive",
          );
          task = c.duelAction(
            duel.id,
            rival ? { kind: "strike", targetHeroId: rival.id } : { kind: "guard" },
          );
        } else task = c.plan(botPlan(v));
      }
      if (v.siege?.phase === "choice")
        task = c.siege(
          v.hero?.status === "dead"
            ? "supply"
            : (["attack", "protect", "supply"][
                (v.self.name.length + v.siege.round) % 3
              ] as import("../../shared/siege-types.js").SiegeRole),
        );
      if (!v.trial && !v.siege && v.phase.kind === "event") task = c.event({ kind: "leave" });
      if (v.trial) {
        const t = v.trial;
        if (t.phase.kind === "board-vote")
          task = c.trialVote(
            t.id,
            t.tiles.find((tile) => !t.usedValues.includes(tile.value))?.id ?? "",
          );
        if (t.phase.kind === "wager") task = c.wager(t.id, "steady");
        if (t.phase.kind === "answer" && t.question)
          task = c.trialAnswer(t.id, t.question.id, (v.self.name.length + t.questionNumber) % 4);
        if (t.phase.kind === "blessing-choice") {
          const offer = v.trialInput.offers[0];
          task = c.blessing(
            t.id,
            offer?.id ?? "decline",
            v.hero?.conditions.blessings[0]?.kind ?? null,
          );
        }
      } else if (v.phase.kind === "camp") {
        const crew = v.crews.find((x) => x.id === a.crewId);
        if (v.hero?.status === "dead" && crew?.status !== "eliminated") continue;
        task = c.camp(botCamp(v));
      }
      if (task)
        void task.then((ok) => {
          if (!ok) submitted.delete(key);
        });
    }
  }, 400);
  return {
    state,
    select,
    bootstrap,
    get selected() {
      return selected();
    },
    get controller() {
      return controllers.get(state.selected) ?? null;
    },
    control: (
      action: "start" | "pause" | "resume" | "end" | "advance" | "speed",
      speed?: "normal" | "fast" | "manual",
    ) =>
      host?.command((env, ack) =>
        action === "advance" || action === "speed"
          ? host?.socket.emit(
              "test:control",
              {
                ...env,
                command:
                  action === "advance"
                    ? { kind: "advance" }
                    : { kind: "speed", speed: speed ?? "normal" },
              },
              ack,
            )
          : host?.socket.emit("host:control", { ...env, command: { kind: action } }, ack),
      ),
    revealAnswer: () => {
      if (!host?.ready || !host.view) return;
      host.socket.emit(
        "test:answer",
        { requestId: crypto.randomUUID(), matchId: host.view.id, phaseId: host.view.phaseId },
        (r) => {
          if (r.ok) state.answer = r.value.choice;
          else notifyError(r.message);
        },
      );
    },
    disconnect: () => sessions.get(state.selected)?.socket.disconnect(),
    reconnect: () => {
      const s = sessions.get(state.selected);
      s?.socket.connect();
      s?.reconnect();
    },
    destroy: () => {
      clearInterval(timer);
      dispose();
    },
  };
}
