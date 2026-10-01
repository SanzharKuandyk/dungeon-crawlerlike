import type { Express } from "express";
import { bootstrapSchema, secretSchema } from "../shared/validation.js";
import type { Config } from "./config.js";
import type { RoomManager } from "./room-manager.js";
import { createTestRoom } from "./test-mode/create-test-room.js";
export function attachHttp(app: Express, manager: RoomManager, config: Config) {
  app.get("/api/health", (_request, response) =>
    response.json({ ok: true, testMode: config.testMode }),
  );
  app.post("/api/rooms", async (request, response) => {
    const parsed = secretSchema.safeParse(request.body?.bootstrapSecret);
    if (!parsed.success) {
      response.status(400).json({ message: "Invalid room creation key." });
      return;
    }
    try {
      response.status(201).json(await manager.create(parsed.data));
    } catch {
      response
        .status(503)
        .json({ message: "Cannot create a room. Check the save folder and disk space." });
    }
  });
  if (config.testMode)
    app.post("/api/test", async (request, response) => {
      const origin = request.headers.origin;
      try {
        if (origin && new URL(origin).host !== request.headers.host) {
          response.status(403).json({ message: "Test mode is local only." });
          return;
        }
        const input = bootstrapSchema.parse(request.body);
        response.json(await createTestRoom(manager, input));
      } catch {
        response
          .status(400)
          .json({ message: "Cannot bootstrap test room. Check the supplied local keys." });
      }
    });
  app.all("/api/{*path}", (_request, response) =>
    response.status(404).json({ message: "Endpoint not found." }),
  );
}
