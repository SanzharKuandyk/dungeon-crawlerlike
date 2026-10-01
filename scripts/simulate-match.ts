import { randomBytes } from "node:crypto";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { io, type Socket } from "socket.io-client";
import { botAction } from "../src/client/test-mode/bots.js";
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
        resolve(r);
      });
    });
    latencies.push(performance.now() - t);
    if (!result.ok) {
      failures++;
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
    const current = () => {
      const r = server.manager.rooms.get(created.code);
      if (!r) throw new Error("Missing room");
      return r;
    };
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
      view: RoomView | null;
    }[] = [];
    for (let i = 0; i < count; i++) {
      if (i % 16 === 0) console.log(`Joining ${i}/${count}`);
      const socket = await connect();
      const player = { socket, playerId: "", view: null as RoomView | null };
      socket.on("room:snapshot", (v) => {
        player.view = v;
      });
      const receipt = await ack((done) =>
        socket.emit(
          "session:join",
          { code: created.code, name: `Load ${i}`, bootstrapSecret: secret() },
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
    await ack((done) => host.emit("host:control", { ...envelope(), action: "start" }, done));
    let phases = 0;
    while (current().state.status === "running") {
      const state = current().state;
      phaseLabel = `depth ${state.depth}, ${state.phase.kind}, phase ${state.phaseId}`;
      if (phases % 5 === 0) console.log(`${count} clients: ${phaseLabel}`);
      await Promise.all(
        players.map(async (p) => {
          const v = server.manager.snapshot({
            code: created.code,
            tokenHash: null,
            session: { role: "player", playerId: p.playerId },
            readOnly: false,
          }) as PlayerRoomView;
          const env = envelope();
          if (state.phase.kind === "route" && v.hero?.status === "alive") {
            const destination = v.offeredRooms.find((r) => r.risk === "low");
            if (destination)
              await ack((done) =>
                p.socket.emit("route:vote", { ...env, roomId: destination.id }, done),
              );
          } else if (state.phase.kind === "combat") {
            await ack((done) =>
              p.socket.emit("hero:action", { ...env, action: botAction(v) }, done),
            );
          } else if (state.phase.kind === "camp" && v.hero?.status === "alive") {
            await ack((done) => p.socket.emit("camp:vote", { ...env, choice: "rest" }, done));
          } else if (state.phase.kind === "question" && v.question) {
            const q = state.content.questions.find((q) => q.id === v.question?.id);
            if (!q) throw new Error("Missing active question");
            await ack((done) =>
              p.socket.emit(
                "learning:answer",
                { ...env, questionId: q.id, choice: q.correctIndex },
                done,
              ),
            );
          } else if (
            state.phase.kind === "equipment" &&
            v.hero?.status === "alive" &&
            v.quizResults.some((r) => r.crewId === v.hero?.crewId && r.tier !== "none")
          ) {
            await ack((done) => p.socket.emit("equipment:choose", { ...env, item: "ward" }, done));
          }
        }),
      );
      const deadline = current().deadline;
      if (deadline === null) throw new Error("Missing automatic deadline");
      now = deadline;
      await server.manager.tick(now);
      if (++phases > 180) throw new Error("Phase loop");
    }
    await new Promise((done) => setTimeout(done, 150));
    const final = current().state;
    if (final.depth !== 5 || !final.winners.length)
      throw new Error("Expedition failed to reach extraction");
    const scores = final.crews.map((c) => c.securedTreasure);
    for (const p of players) {
      if (
        p.view?.status !== "finished" ||
        JSON.stringify(p.view.crews.map((c) => c.securedTreasure)) !== JSON.stringify(scores)
      )
        throw new Error("Final snapshots disagree");
    }
    return {
      clients: count,
      crews: count / 4,
      depths: final.depth,
      phases,
      acknowledged,
      failedRequests: failures,
      elapsedSeconds: Number(((performance.now() - started) / 1000).toFixed(2)),
      acknowledgmentMs: timings(latencies),
      saveMs: timings(saves),
      completed: true,
      consistentScores: true,
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
for (const count of requested ? [Number(requested)] : [32, 128]) {
  const result = await simulate(count);
  reports.push(result);
  console.log(JSON.stringify(result, null, 2));
}
await mkdir("test-results", { recursive: true });
await writeFile(
  "test-results/load-result.json",
  JSON.stringify({ measuredAt: new Date().toISOString(), reports }, null, 2),
);
