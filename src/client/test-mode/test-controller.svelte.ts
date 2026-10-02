import type { TestBootstrap, TestScenario } from "../../shared/protocol.js";
import type { HostRoomView, PlayerRoomView } from "../../shared/view-types.js";
import { secureSecret } from "../connection.js";
import { notifyError } from "../notify.js";
import { type PlayerController, playerController } from "../player-controller.js";
import { type ConnectionStatus, room } from "../room.svelte.js";
import { type ClientSession, createClientSession } from "../session.js";
import { botAction } from "./bots.js";
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
    if (reset) localStorage.removeItem("dungeon-test-bootstrap");
    const stored = localStorage.getItem("dungeon-test-bootstrap");
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
    localStorage.setItem("dungeon-test-bootstrap", JSON.stringify(input));
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
      const key = `${a.playerId}:${v.phaseId}`;
      if (submitted.has(key)) continue;
      submitted.add(key);
      let task: Promise<boolean> | undefined;
      if (v.phase.kind === "route" && v.hero?.status === "alive") {
        const offered = v.offeredRooms.filter(
          (room) => !v.expeditionMap || v.reachableNodeIds.includes(room.id),
        );
        const index = state.actors
          .filter((x, i, all) => all.findIndex((y) => y.crewId === x.crewId) === i)
          .findIndex((x) => x.crewId === a.crewId);
        task = c.route(
          offered.find((r) => r.risk === ["low", "medium", "high", "low"][index])?.id ??
            offered[0].id,
        );
      }
      if (v.phase.kind === "combat") task = c.action(botAction(v));
      if (v.phase.kind === "camp" && v.canCamp && v.hero?.status === "alive") {
        const crew = v.crews.find((x) => x.id === a.crewId);
        const wounded = v.heroes
          .filter((h) => h.crewId === a.crewId && h.status === "alive")
          .some((h) => h.hp <= 2 * h.power);
        task = c.camp(wounded && (crew?.carriedTreasure ?? 0) < 12 ? "rest" : "secure");
      }
      if (v.phase.kind === "question" && v.question && v.answerChoice === null)
        task = c.answer(v.question.id, (v.self.name.length + v.depth) % 4);
      if (
        v.phase.kind === "equipment" &&
        v.hero?.status === "alive" &&
        v.quizResults.some((r) => r.crewId === a.crewId && r.tier !== "none")
      )
        task = c.equipment(v.hero.stress >= 3 ? "lantern" : "ward");
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
        host?.socket.emit("host:control", { ...env, action, speed }, ack),
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
