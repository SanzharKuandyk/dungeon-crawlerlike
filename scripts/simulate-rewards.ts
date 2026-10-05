import { randomBytes } from "node:crypto";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { io, type Socket } from "socket.io-client";
import { enterNode } from "../src/game/progression/encounters.js";
import { createCrewResult } from "../src/game/progression/results.js";
import { createGameServer } from "../src/server/app.js";
import { enterCrew } from "../src/server/crew-clock.js";
import { advanceCrew } from "../src/server/crew-transitions.js";
import {
  advanceQuestion,
  beginQuestion,
  queueSharedEvent,
} from "../src/server/shared-event-coordinator.js";
import { fileStorage } from "../src/server/storage.js";
import type { ActionResult, ClientEvents, Receipt, ServerEvents } from "../src/shared/protocol.js";

const secret = () => randomBytes(32).toString("hex");
const directory = await mkdtemp(join(tmpdir(), "dungeon-v5-claims-"));
const disk = fileStorage(directory),
  saves: number[] = [],
  timings: number[] = [];
const failures: Record<string, number> = {};
let now = 1_800_000_000_000;
const server = await createGameServer(
  { host: "127.0.0.1", port: 0, testMode: true, production: true, dataDir: directory },
  {
    ui: false,
    ticking: false,
    clock: () => now,
    storage: {
      load: disk.load,
      save: async (room) => {
        const t = performance.now();
        await disk.save(room);
        saves.push(performance.now() - t);
      },
    },
  },
);
const sockets: Socket<ServerEvents, ClientEvents>[] = [];
async function connect() {
  const s: Socket<ServerEvents, ClientEvents> = io(url, {
    transports: ["websocket"],
    forceNew: true,
  });
  sockets.push(s);
  await new Promise<void>((done) => s.once("connect", done));
  return s;
}
async function ack(send: (done: (r: ActionResult<Receipt>) => void) => void, measured = false) {
  const t = performance.now();
  const result = await new Promise<ActionResult<Receipt>>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("ACK timeout")), 8000);
    send((r) => {
      clearTimeout(timeout);
      resolve(r);
    });
  });
  if (measured) timings.push(performance.now() - t);
  if (!result.ok) {
    failures[result.code] = (failures[result.code] ?? 0) + 1;
    throw new Error(result.message);
  }
  return result.value;
}
await server.listen();
const address = server.http.address();
if (!address || typeof address === "string") throw new Error("Port missing");
const url = `http://127.0.0.1:${address.port}`;
const started = performance.now();
try {
  const key = secret(),
    created = await server.manager.create(key, false, "dungeon-v5"),
    host = await connect();
  const room = () => {
    const r = server.manager.rooms.get(created.code);
    if (!r) throw new Error("Room missing");
    return r;
  };
  const env = (id?: string) => ({
    requestId: secret(),
    matchId: room().state.id,
    phaseId:
      id && !room().state.trial && !room().state.siege
        ? (room().state.crewProgress[room().state.players.find((p) => p.id === id)?.crewId ?? ""]
            ?.phaseId ?? room().state.phaseId)
        : room().state.phaseId,
  });
  await ack((done) => host.emit("session:resume", { code: created.code, token: key }, done));
  const players: {
    socket: Socket<ServerEvents, ClientEvents>;
    id: string;
    crewId: string;
    token: string;
  }[] = [];
  for (let crew = 0; crew < 15; crew++) {
    let crewId = "";
    for (let member = 0; member < 4; member++) {
      const token = secret();
      const socket = await connect(),
        joined = await ack((done) =>
          socket.emit(
            "session:join",
            {
              code: created.code,
              name: `Crew ${crew + 1} member ${member + 1}`,
              bootstrapSecret: token,
            },
            done,
          ),
        );
      const id = joined.playerId;
      if (!id) throw new Error("Player missing");
      if (!member) {
        await ack((done) =>
          socket.emit("crew:create", { ...env(), name: `Crew ${crew + 1}` }, done),
        );
        crewId = room().state.players.find((p) => p.id === id)?.crewId ?? "";
      } else await ack((done) => socket.emit("crew:join", { ...env(), crewId }, done));
      players.push({ socket, id, crewId, token });
    }
  }
  await ack((done) => host.emit("host:control", { ...env(), command: { kind: "start" } }, done));
  await server.manager.transaction(created.code, (r) => {
    r.speed = "manual";
    r.state.learningEnabled = false;
    const node = r.state.chapterMaps[0].nodes.find((n) => n.kind === "treasure");
    if (!node) throw new Error("Cache missing");
    for (const crew of r.state.crews) {
      enterNode(r.state, crew.id, node.id);
      createCrewResult(r.state, crew.id, "cache", "encounter");
      enterCrew(r, r.runs[crew.id], { kind: "result" }, now);
    }
  });
  const claimInputs = players.map(({ id }) => {
    const hero = room().state.heroes.find((h) => h.playerId === id);
    if (!hero) throw new Error("Hero missing");
    const offer = room().state.rewardOffers.find((o) => o.ownerHeroId === hero.id);
    if (!offer) throw new Error("Offer missing");
    return {
      ...env(id),
      inventoryRevision: hero.inventory.revision,
      claim: {
        offerId: offer.id,
        optionId: offer.options[0].id,
        disposition: "equip" as const,
        replacementItemId: null,
      },
    };
  });
  await Promise.all(
    players.map(({ socket }, i) =>
      ack((done) => socket.emit("reward:claim", claimInputs[i], done), true),
    ),
  );
  await Promise.all(
    players.map(({ socket }, i) =>
      ack((done) => socket.emit("reward:claim", claimInputs[i], done), true),
    ),
  );
  await Promise.all(
    players.map(({ socket, id }) =>
      ack((done) => socket.emit("result:ready", env(id), done), true),
    ),
  );
  await server.manager.transaction(created.code, (r) => {
    // Pin this temporary workload's event; random classroom maps need not contain a coin.
    r.state.chapterMaps = structuredClone(r.state.chapterMaps);
    const node = r.state.chapterMaps[0].nodes.find((n) => n.kind === "event");
    if (!node) throw new Error("Coin event missing");
    node.eventId = "coin-fountain";
    for (const crew of r.state.crews) {
      crew.economy.gold = 24;
      enterNode(r.state, crew.id, node.id);
      enterCrew(r, r.runs[crew.id], { kind: "arrival" }, now);
      advanceCrew(r, r.runs[crew.id], now);
    }
  });
  await Promise.all(
    players.map(({ socket, id }) =>
      ack(
        (done) =>
          socket.emit(
            "event:choose",
            {
              ...env(id),
              choice: { kind: "coin", side: "heads", prize: "gold" },
            },
            done,
          ),
        true,
      ),
    ),
  );
  await server.manager.transaction(created.code, (r) => {
    now += 10_000;
    for (const run of Object.values(r.runs)) advanceCrew(r, run, now);
    r.state.learningEnabled = true;
    queueSharedEvent(r, "trial-1", r.state.crews[0].id);
    for (const run of Object.values(r.runs)) advanceCrew(r, run, now);
    beginQuestion(r, now);
    advanceQuestion(r, now);
  });
  const trialId = room().state.trial?.id;
  const tileId = room().state.trial?.tiles[0]?.id;
  if (!trialId || !tileId) throw new Error("Trial missing");
  await Promise.all(
    players.map(({ socket, id }) =>
      ack((done) => socket.emit("trial:vote", { ...env(id), trialId, tileId }, done), true),
    ),
  );
  now += 10_000;
  await server.manager.transaction(created.code, (r) => advanceQuestion(r, now));
  await Promise.all(
    players.map(({ socket, id }) =>
      ack(
        (done) => socket.emit("trial:wager", { ...env(id), trialId, wager: "steady" }, done),
        true,
      ),
    ),
  );
  now += 10_000;
  await server.manager.transaction(created.code, (r) => advanceQuestion(r, now));
  const questionId = room().state.trial?.phase;
  if (!questionId || !("questionId" in questionId)) throw new Error("Question missing");
  await Promise.all(
    players.map(({ socket, id }) =>
      ack(
        (done) =>
          socket.emit(
            "trial:answer",
            { ...env(id), trialId, questionId: questionId.questionId, choice: 0 },
            done,
          ),
        true,
      ),
    ),
  );
  now += 10_000;
  await server.manager.transaction(created.code, (r) => advanceQuestion(r, now));
  const units = Object.values(room().state.trial?.totals ?? {});
  if (new Set(units).size !== 1) throw new Error("Equivalent answers scored differently");
  await ack(
    (done) =>
      host.emit(
        "host:control",
        { ...env(), command: { kind: "question-skip", questionId: trialId } },
        done,
      ),
    true,
  );
  await Promise.all(
    players.map(async (player) => {
      player.socket.disconnect();
      player.socket = await connect();
      await ack(
        (done) =>
          player.socket.emit("session:resume", { code: created.code, token: player.token }, done),
        true,
      );
    }),
  );
  await server.manager.transaction(created.code, (r) => {
    const node = r.state.chapterMaps[0].nodes.find((n) => n.kind === "battle");
    if (!node) throw new Error("Battle missing");
    for (const crew of r.state.crews) {
      enterNode(r.state, crew.id, node.id);
      enterCrew(r, r.runs[crew.id], { kind: "combat" }, now);
    }
  });
  await Promise.all(
    players.map(({ socket, id, crewId }) => {
      const hero = room().state.heroes.find((h) => h.playerId === id);
      const enemy = room().state.encounters.find(
        (e) => e.id === room().runs[crewId].progress.encounterId,
      )?.enemies[0];
      if (!hero || !enemy) throw new Error("Combat missing");
      return ack(
        (done) =>
          socket.emit(
            "hero:plan",
            {
              ...env(id),
              plan: {
                kind: "hero",
                actions: [{ kind: "attack", enemyId: enemy.id }],
                activation: null,
                inventoryRevision: hero.inventory.revision,
              },
            },
            done,
          ),
        true,
      );
    }),
  );
  await server.manager.transaction(created.code, (r) => {
    now += 10_000;
    for (const run of Object.values(r.runs)) advanceCrew(r, run, now);
  });
  const persisted = (await disk.load()).find((r) => r.state.code === created.code);
  const claimed = room().state.rewardOffers.filter((o) => o.status === "claimed").length;
  const consistent =
    claimed === 60 &&
    persisted?.state.rewardOffers.filter((o) => o.status === "claimed").length === 60 &&
    room().state.heroes.every(
      (h) => Object.values(h.inventory.equipment).filter(Boolean).length === 1,
    ) &&
    Object.values(room().runs).every((r) => r.progress.phase.kind === "combat-reveal");
  if (!consistent) throw new Error("Claims, equipment or readiness inconsistent");
  const quantile = (a: number[], p: number) => {
    const ordered = [...a].sort((a, b) => a - b);
    return Number(ordered[Math.min(ordered.length - 1, Math.floor(ordered.length * p))].toFixed(2));
  };
  const report = {
    clients: 60,
    crews: 15,
    measuredAcks: timings.length,
    ackMs: {
      median: quantile(timings, 0.5),
      p95: quantile(timings, 0.95),
      max: quantile(timings, 1),
    },
    saveMs: { median: quantile(saves, 0.5), p95: quantile(saves, 0.95), max: quantile(saves, 1) },
    maximumQueueDepth: server.manager.queueMetrics().maximumDepth,
    rejections: failures,
    claimed,
    workloads: [
      "claim",
      "duplicate claim",
      "result readiness",
      "coin",
      "trial vote",
      "wager",
      "answer",
      "host skip",
      "reconnect",
      "combat plan",
    ],
    trialScoreConsistent: new Set(units).size === 1,
    consistent,
    elapsedMs: Number((performance.now() - started).toFixed(2)),
    persistedDirectory: directory,
  };
  await mkdir("test-results", { recursive: true });
  await writeFile("test-results/reward-load.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  for (const s of sockets) s.disconnect();
  await server.close();
}
