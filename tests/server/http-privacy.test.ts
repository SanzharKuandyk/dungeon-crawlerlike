import { expect, it } from "vitest";
import { createGameServer } from "../../src/server/app.js";
import { memoryStorage } from "../fixtures/server.js";

it("development serves the interface but never question solutions, saves or temporary notes", async () => {
  const server = await createGameServer(
    { host: "127.0.0.1", port: 0, testMode: false, production: false, dataDir: "unused" },
    { ticking: false, storage: memoryStorage().storage },
  );
  try {
    await server.listen();
    const address = server.http.address();
    if (!address || typeof address === "string") throw new Error("Missing port");
    const base = `http://127.0.0.1:${address.port}`;
    expect((await fetch(base)).status).toBe(200);
    expect((await fetch(`${base}/src/client/main.ts`)).status).toBe(200);
    for (const path of [
      "content/learning/week-4.json",
      "content/learning/trials.reviewed.json",
      ".Codex/task_plan.md",
      "src/server/content.ts",
      ".git/HEAD",
    ])
      expect((await fetch(`${base}/${path}`)).status).toBe(403);
    expect((await fetch(`${base}/api/test`, { method: "POST" })).status).toBe(404);
  } finally {
    await server.close();
  }
});
