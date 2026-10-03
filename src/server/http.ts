import type { Express } from "express";
import { hostRecoverySchema } from "../shared/host-validation.js";
import { bootstrapSchema, secretSchema } from "../shared/validation.js";
import type { Config } from "./config.js";
import { CommandError } from "./errors.js";
import { requireHostAccess } from "./host-access.js";
import { recoverHost } from "./recovery.js";
import { createLimits } from "./request-limits.js";
import type { RoomManager } from "./room-manager.js";
import { hashToken } from "./sessions.js";
import { createTestRoom } from "./test-mode/create-test-room.js";

export function attachHttp(
  app: Express,
  manager: RoomManager,
  config: Config,
  installationKey: string,
  clock: () => number,
) {
  const limits = createLimits();
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
      if (![...manager.rooms.values()].some((r) => r.creationKeyHash === hashToken(parsed.data)))
        limits.window("creation", 5, 60000, clock());
      response.status(201).json(await manager.create(parsed.data));
    } catch (error) {
      if (error instanceof CommandError) {
        response
          .status(error.code === "UNAUTHORIZED" ? 403 : error.code === "RATE_LIMITED" ? 429 : 410)
          .json({ code: error.code, message: error.message, retryAfterMs: error.retryAfterMs });
        return;
      }
      response
        .status(503)
        .json({ message: "Cannot create a room. Check the save folder and disk space." });
    }
  });
  app.post("/api/host/recover", async (request, response) => {
    try {
      const input = hostRecoverySchema.parse(request.body);
      requireHostAccess(installationKey, input.installationKey);
      limits.window("host-recovery", 5, 60000, clock());
      await manager.transaction(input.code, (room) => recoverHost(room, input, clock()));
      response.json({ code: input.code, hostToken: input.bootstrapSecret });
    } catch (error) {
      response
        .status(error instanceof CommandError && error.code === "RATE_LIMITED" ? 429 : 403)
        .json({
          code: error instanceof CommandError ? error.code : "INVALID",
          message: error instanceof CommandError ? error.message : "Invalid recovery request.",
        });
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
