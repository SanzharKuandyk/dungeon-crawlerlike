import { createServer } from "node:http";
import { resolve } from "node:path";
import express from "express";
import { Server } from "socket.io";
import type { ClientEvents, ServerEvents } from "../shared/protocol.js";
import type { Config } from "./config.js";
import { loadContent } from "./content.js";
import { attachHttp } from "./http.js";
import { createRoomManager } from "./room-manager.js";
import { attachSockets } from "./sockets.js";
import { fileStorage, type Storage } from "./storage.js";
export async function createGameServer(
  config: Config,
  options: { ui?: boolean; storage?: Storage; clock?: () => number; ticking?: boolean } = {},
) {
  const content = await loadContent();
  const manager = createRoomManager(
    options.storage ?? fileStorage(config.dataDir),
    content,
    options.clock,
  );
  await manager.restore();
  const app = express();
  app.use(express.json({ limit: "16kb" }));
  // Private paths must also be denied when the file does not exist.
  app.use((request, response, next) => {
    let path: string;
    try {
      path = decodeURIComponent(request.path).replaceAll("\\", "/");
    } catch {
      response.sendStatus(400);
      return;
    }
    if (/^\/(?:content|data|\.git|\.codex)(?:\/|$)|^\/src\/server(?:\/|$)/i.test(path)) {
      response.sendStatus(403);
      return;
    }
    next();
  });
  const http = createServer(app);
  const io = new Server<ClientEvents, ServerEvents>(http, { maxHttpBufferSize: 16384 });
  attachHttp(app, manager, config);
  attachSockets(io, manager, options.clock ?? Date.now);
  let vite: { close: () => Promise<void> } | undefined;
  if (options.ui !== false) {
    if (config.production) {
      app.use(express.static(resolve("dist/client")));
      app.get("/{*path}", (_request, response) =>
        response.sendFile(resolve("dist/client/index.html")),
      );
    } else {
      const { createServer: createViteServer } = await import("vite");
      const dev = await createViteServer({
        server: { middlewareMode: true, hmr: { server: http } },
        appType: "spa",
      });
      vite = dev;
      app.use(dev.middlewares);
    }
  }
  let ticking = false;
  const timer =
    options.ticking === false
      ? undefined
      : setInterval(() => {
          if (ticking) return;
          ticking = true;
          void manager.tick((options.clock ?? Date.now)()).finally(() => {
            ticking = false;
          });
        }, 100);
  return {
    app,
    http,
    io,
    manager,
    async listen() {
      await new Promise<void>((done, reject) => {
        http.once("error", reject);
        http.listen(config.port, config.host, () => {
          http.off("error", reject);
          done();
        });
      });
    },
    async close() {
      clearInterval(timer);
      await vite?.close();
      await new Promise<void>((done) => io.close(() => done()));
      await manager.drain();
    },
  };
}
