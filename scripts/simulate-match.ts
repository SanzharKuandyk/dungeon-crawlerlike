import { randomBytes } from "node:crypto";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { io, type Socket } from "socket.io-client";
import { botCamp, botPlan, botPreparation, botRoute } from "../src/client/test-mode/bots.js";
import { chapterMap } from "../src/game/progression/maps.js";
import { createGameServer } from "../src/server/app.js";
import { fileStorage } from "../src/server/storage.js";
import type {
  ActionResult,
  ClientEvents,
  Envelope,
  Receipt,
  ServerEvents,
} from "../src/shared/protocol.js";
import type { PlayerRoomView, RoomView } from "../src/shared/view-types.js";

const secret = () => randomBytes(32).toString("hex");
function timings(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (p: number) =>
    Number((sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0).toFixed(2));
  return { median: percentile(0.5), p95: percentile(0.95), maximum: percentile(1) };
}
async function simulate(count: number) {
  const directory = await mkdtemp(join(tmpdir(), "dungeon-load-"));
  const disk = fileStorage(directory),
    saves: number[] = [],
    latencies: number[] = [];
  const rejectedByReason: Record<string, number> = {};
  let now = Date.now(),
    acknowledged = 0,
    failures = 0;
  const server = await createGameServer(
    { port: 0, host: "127.0.0.1", testMode: false, production: true, dataDir: directory },
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
  const clients: Socket<ServerEvents, ClientEvents>[] = [];
  const started = performance.now();
  let phaseLabel = "joining";
  let inspect = () => ({});
  async function ack(send: (done: (r: ActionResult<Receipt>) => void) => void) {
    const t = performance.now();
    const result = await new Promise<ActionResult<Receipt>>((resolve, reject) => {
      const timer = setTimeout(() => {
        failures++;
        console.error(
          JSON.stringify({
            phase: phaseLabel,
            saveMs: timings(saves.slice(-128)),
            acknowledgmentMs: timings(latencies.slice(-128)),
          }),
        );
        reject(new Error(`Acknowledgment timed out during ${phaseLabel}`));
      }, 30000);
      send((r) => {
        clearTimeout(timer);
        setTimeout(() => resolve(r), 20);
      });
    });
    latencies.push(performance.now() - t);
    if (!result.ok) {
      failures++;
      rejectedByReason[result.code] = (rejectedByReason[result.code] ?? 0) + 1;
      console.error(JSON.stringify(inspect()));
      throw new Error(`${result.code}: ${result.message}`);
    }
    acknowledged++;
    return result.value;
  }
  try {
    await server.listen();
    const address = server.http.address();
    if (!address || typeof address === "string") throw new Error("Missing server port");
    const url = `http://127.0.0.1:${address.port}`;
    const hostSecret = secret();
    const created = await server.manager.create(hostSecret);
    await server.manager.transaction(created.code, (r) => {
      r.state.learningEnabled = true;
      r.state.seed = 12345;
      r.state.outcomeSeed = 98765;
      r.state.trialRng = 13579;
      r.state.chapterMaps = ([1, 2] as const).map((c) =>
        chapterMap(r.state.content, r.state.seed, c),
      );
      r.state.expeditionMap = r.state.chapterMaps[0];
    });
    const current = () => {
      const r = server.manager.rooms.get(created.code);
      if (!r) throw new Error("Missing room");
      return r;
    };
    inspect = () => ({
      now,
      roomDeadline: current().deadline,
      trial: current().state.trial?.phase,
      runs: Object.values(current().runs).map((r) => ({
        phase: r.progress.phase,
        crew: r.crewId,
        clock: r.clock,
        ready: r.ready.length,
      })),
    });
    const envelope = (): Envelope => ({
      requestId: secret(),
      matchId: current().state.id,
      phaseId: current().state.phaseId,
    });
    async function connect() {
      const socket: Socket<ServerEvents, ClientEvents> = io(url, {
        forceNew: true,
        transports: ["websocket"],
      });
      clients.push(socket);
      await new Promise<void>((done) => socket.once("connect", done));
      return socket;
    }
    const host = await connect();
    await ack((done) =>
      host.emit("session:resume", { code: created.code, token: hostSecret }, done),
    );
    const players: {
      socket: Socket<ServerEvents, ClientEvents>;
      playerId: string;
      token: string;
      view: RoomView | null;
    }[] = [];
    for (let i = 0; i < count; i++) {
      if (i % 16 === 0) console.log(`Joining ${i}/${count}`);
      const socket = await connect();
      const player = { socket, playerId: "", token: secret(), view: null as RoomView | null };
      socket.on("room:snapshot", (v) => {
        player.view = v;
      });
      socket.on("room:closed", (v) => {
        player.view = v;
      });
      const receipt = await ack((done) =>
        socket.emit(
          "session:join",
          { code: created.code, name: `Load ${i}`, bootstrapSecret: player.token },
          done,
        ),
      );
      if (!receipt.playerId) throw new Error("Missing player identity");
      player.playerId = receipt.playerId;
      players.push(player);
      if (i % 4 === 0)
        await ack((done) =>
          socket.emit("crew:create", { ...envelope(), name: `Crew ${i / 4}` }, done),
        );
      else
        await ack((done) =>
          socket.emit(
            "crew:join",
            { ...envelope(), crewId: current().state.crews[Math.floor(i / 4)].id },
            done,
          ),
        );
    }
    await ack((done) =>
      host.emit("host:control", { ...envelope(), command: { kind: "start" } }, done),
    );
    let phases = 0;
    let reconnectCount = 0;
    let previousProgress = "",
      stalled = 0;
    while (current().state.status === "running") {
      if (phases === 10 && reconnectCount === 0) {
        for (const player of players) player.socket.disconnect();
        await new Promise((done) => setTimeout(done, 50));
        await server.manager.drain();
        await Promise.all(
          players.map(async (player) => {
            const connected = new Promise<void>((done) => player.socket.once("connect", done));
            player.socket.connect();
            await connected;
            await ack((done) =>
              player.socket.emit(
                "session:resume",
                { code: created.code, token: player.token },
                done,
              ),
            );
            reconnectCount++;
          }),
        );
      }
      const state = current().state;
      phaseLabel = `depth ${state.depth}, ${state.phase.kind}, phase ${state.phaseId}`;
      if (phases % 15 === 0)
        console.log(
          `${count} clients: ${phaseLabel} · ${Object.values(current().runs)
            .map(
              (r) =>
                `${r.progress.chapter}/${r.progress.depth}/${r.progress.turn}/${r.progress.phase.kind}:${r.ready.length}`,
            )
            .join(",")}`,
        );
      const progress = JSON.stringify([
        current().state.phaseId,
        ...Object.values(current().runs).map((r) => [r.progress.phaseId, r.finished]),
      ]);
      stalled = progress === previousProgress ? stalled + 1 : 0;
      previousProgress = progress;
      if (stalled > 3)
        console.log(
          JSON.stringify({
            now,
            deadline: current().deadline,
            timers: Object.values(current().runs).map((r) => ({
              finished: r.finished,
              phase: r.progress.phase,
              clock: r.clock,
              reasons: r.pauseReasons,
            })),
          }),
        );
      if (stalled > 6) throw new Error("Server phase did not advance; see clock diagnostics.");
      // Finish shopping and recovery before any member confirms a crew decision.
      await Promise.all(
        players.map(async (p) => {
          let prepared = server.manager.snapshot({
            code: created.code,
            tokenHash: null,
            session: { role: "player", playerId: p.playerId },
            readOnly: false,
          }) as PlayerRoomView;
          const env = { ...envelope(), phaseId: prepared.phaseId };
          for (let i = 0; i < 12; i++) {
            const operation = botPreparation(prepared);
            if (!operation) break;
            const input = { ...env, requestId: secret() };
            await ack((done) => {
              if (operation.kind === "rescue")
                p.socket.emit(
                  "crew:recover",
                  { ...input, command: { kind: "request-help" } },
                  done,
                );
              else if (operation.kind === "buy")
                p.socket.emit(
                  "shop:buy",
                  {
                    ...input,
                    offerId: operation.offerId,
                    inventoryRevision: prepared.hero?.inventory.revision ?? 0,
                  },
                  done,
                );
              else if (operation.kind === "equip")
                p.socket.emit(
                  "inventory:command",
                  {
                    ...input,
                    command: { kind: "equip", itemId: operation.itemId },
                    inventoryRevision: prepared.hero?.inventory.revision ?? 0,
                  },
                  done,
                );
              else if (operation.kind === "revive")
                p.socket.emit(
                  "crew:recover",
                  {
                    ...input,
                    command: {
                      kind: "revive",
                      targetHeroId: operation.targetHeroId,
                      payment: operation.payment,
                    },
                  },
                  done,
                );
              else p.socket.emit("camp:treat", { ...input, treatment: operation.treatment }, done);
            });
            prepared = server.manager.snapshot({
              code: created.code,
              tokenHash: null,
              session: { role: "player", playerId: p.playerId },
              readOnly: false,
            }) as PlayerRoomView;
          }
        }),
      );
      await Promise.all(
        players.map(async (p) => {
          const v = server.manager.snapshot({
            code: created.code,
            tokenHash: null,
            session: { role: "player", playerId: p.playerId },
            readOnly: false,
          }) as PlayerRoomView;
          const env = { ...envelope(), phaseId: v.phaseId };
          const run = current().runs[v.hero?.crewId ?? ""];
          if (run?.finished && !v.quizActive) return;
          if (v.decisionReady && !v.quizActive) return;
          if (v.trial) {
            const t = v.trial;
            if (t.phase.kind === "board-vote")
              await ack((done) =>
                p.socket.emit(
                  "trial:vote",
                  {
                    ...env,
                    trialId: t.id,
                    tileId: t.tiles.find((tile) => !t.usedValues.includes(tile.value))?.id ?? "",
                  },
                  done,
                ),
              );
            else if (t.phase.kind === "wager")
              await ack((done) =>
                p.socket.emit("trial:wager", { ...env, trialId: t.id, wager: "steady" }, done),
              );
            else if (t.phase.kind === "answer" && t.question)
              await ack((done) =>
                p.socket.emit(
                  "trial:answer",
                  {
                    ...env,
                    trialId: t.id,
                    questionId: t.question?.id ?? "",
                    choice: (players.indexOf(p) + t.questionNumber) % 4,
                  },
                  done,
                ),
              );
            else if (t.phase.kind === "blessing-choice" && v.trialInput.offers.length)
              await ack((done) =>
                p.socket.emit(
                  "trial:blessing",
                  {
                    ...env,
                    trialId: t.id,
                    offerId: v.trialInput.offers[0].id,
                    replace: v.hero?.conditions.blessings[0]?.kind ?? null,
                  },
                  done,
                ),
              );
          } else if (v.phase.kind === "route" && v.hero?.status === "alive") {
            const destination = botRoute(v);
            if (destination)
              await ack((done) =>
                p.socket.emit("route:vote", { ...env, roomId: destination }, done),
              );
          } else if (v.phase.kind === "combat")
            await ack((done) => p.socket.emit("hero:plan", { ...env, plan: botPlan(v) }, done));
          else if (v.phase.kind === "camp") {
            if (
              v.hero?.status === "dead" &&
              v.crews.find((c) => c.id === v.self.crewId)?.status !== "eliminated"
            )
              return;
            await ack((done) =>
              p.socket.emit(
                "camp:vote",
                {
                  ...env,
                  requestId: secret(),
                  choice: botCamp(v),
                },
                done,
              ),
            );
          }
        }),
      );
      if (current().state.status !== "running") break;
      const deadlines = [
        current().deadline,
        ...Object.values(current().runs)
          .filter(
            (run) =>
              !run.finished &&
              !run.pauseReasons.length &&
              !(
                current().discovery && ["route", "combat", "camp"].includes(run.progress.phase.kind)
              ),
          )
          .map((run) => run.clock.deadline),
      ].filter((value): value is number => value !== null && value >= now);
      const deadline = Math.min(...deadlines);
      if (!Number.isFinite(deadline)) throw new Error("Missing automatic deadline");
      now = deadline;
      await server.manager.tick(now);
      if (++phases > 1200) throw new Error("Phase loop");
    }
    const final = current().state;
    if (!Object.values(current().runs).every((run) => run.finished) || !final.winners.length)
      throw new Error("Expedition failed to reach extraction");
    const scores = final.crews.map((c) => [
      c.bossesDefeated,
      c.completedNodeIds.length,
      c.trialScoreUnits,
    ]);
    const deliveryStarted = performance.now();
    while (
      players.some((p) => !p.view || p.view.revision < final.revision) &&
      performance.now() - deliveryStarted < 10000
    )
      await new Promise((done) => setTimeout(done, 25));
    const finalDeliveryMs = Number((performance.now() - deliveryStarted).toFixed(2));
    for (const p of players) {
      if (
        p.view?.status !== "finished" ||
        JSON.stringify(
          p.view.crews.map((c) => [c.bossesDefeated, c.completedNodeIds.length, c.trialScoreUnits]),
        ) !== JSON.stringify(scores)
      )
        throw new Error(
          `Final snapshots disagree for ${p.playerId}: received revision ${p.view?.revision}, expected ${final.revision}, status ${p.view?.status}`,
        );
    }
    return {
      clients: count,
      reconnectCount,
      delayedAcknowledgmentMs: 20,
      crews: count / 4,
      deepestRoom: Math.max(...Object.values(current().runs).map((run) => run.progress.depth)),
      phases,
      acknowledged,
      failedRequests: failures,
      rejectedByReason,
      maximumQueueDepth: server.manager.queueMetrics().maximumDepth,
      elapsedSeconds: Number(((performance.now() - started) / 1000).toFixed(2)),
      acknowledgmentMs: timings(latencies),
      saveMs: timings(saves),
      completed: true,
      extractedCrews: final.crews.filter((crew) => crew.status === "active").length,
      eliminatedCrews: final.crews.filter((crew) => crew.status === "eliminated").length,
      consistentScores: true,
      finalDeliveryMs,
      winners: final.winners.length,
      scores,
      saveDirectory: directory,
    };
  } finally {
    for (const c of clients) c.disconnect();
    await server.close();
  }
}
const reports = [];
const requested = process.env.DUNGEON_LOAD_CLIENTS;
for (const count of requested ? [Number(requested)] : [32, 60, 128]) {
  const result = await simulate(count);
  reports.push(result);
  console.log(JSON.stringify(result, null, 2));
  await mkdir("test-results", { recursive: true });
  await writeFile(
    "test-results/load-result.json",
    JSON.stringify({ measuredAt: new Date().toISOString(), reports }, null, 2),
  );
}
