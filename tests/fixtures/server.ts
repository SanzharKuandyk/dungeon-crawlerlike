import { io, type Socket } from "socket.io-client";
import { createGameServer } from "../../src/server/app.js";
import type { StoredRoom } from "../../src/server/room-types.js";
import type { Storage } from "../../src/server/storage.js";
import type { ClientEvents, ServerEvents } from "../../src/shared/protocol.js";

export function memoryStorage() {
  const saved = new Map<string, StoredRoom>();
  let fail = false;
  const storage: Storage = {
    save: async (r) => {
      if (fail) throw new Error("Disk full");
      if (!r.testMode) saved.set(r.state.code, structuredClone(r));
    },
    load: async () => [...saved.values()].map((v) => structuredClone(v)),
  };
  return {
    storage,
    saved,
    setFail: (value: boolean) => {
      fail = value;
    },
  };
}
export async function serverFixture() {
  const memory = memoryStorage();
  let now = Date.now();
  const server = await createGameServer(
    { host: "127.0.0.1", port: 0, testMode: true, production: true, dataDir: "unused" },
    { ui: false, storage: memory.storage, clock: () => now, ticking: false },
  );
  await server.listen();
  const address = server.http.address();
  if (!address || typeof address === "string") throw new Error("Missing port");
  const url = `http://127.0.0.1:${address.port}`;
  const sockets: Socket<ServerEvents, ClientEvents>[] = [];
  async function connect() {
    const socket: Socket<ServerEvents, ClientEvents> = io(url, {
      transports: ["websocket"],
      forceNew: true,
    });
    sockets.push(socket);
    await new Promise<void>((done) => socket.once("connect", done));
    return socket;
  }
  return {
    server,
    url,
    memory,
    connect,
    advance: async (deadline: number) => {
      now = deadline;
      await server.manager.tick(now);
    },
    close: async () => {
      for (const s of sockets) s.disconnect();
      await server.close();
    },
  };
}
