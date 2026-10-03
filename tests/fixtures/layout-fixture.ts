import { randomBytes, randomUUID } from "node:crypto";
import { type Browser, expect, type Page } from "@playwright/test";
import { io, type Socket } from "socket.io-client";
import type { Ack, ClientEvents, ServerEvents, TestBootstrap } from "../../src/shared/protocol.js";
import type { RoomView } from "../../src/shared/view-types.js";

const secret = () => randomBytes(32).toString("hex");

export async function fixture(page: Page, baseURL: string, combat = true, scenario = "fresh") {
  const input = {
    hostSecret: secret(),
    scenario,
    players: Array.from({ length: 10 }, (_, i) => ({
      clientId: `layout-${i}`,
      bootstrapSecret: secret(),
    })),
  };
  const response = await page.request.post("/api/test", { data: input });
  expect(response.ok()).toBe(true);
  const data: TestBootstrap = await response.json();
  const host: Socket<ServerEvents, ClientEvents> = io(baseURL);
  try {
    const snapshot = new Promise<RoomView>((resolve) => host.once("room:snapshot", resolve));
    await new Promise<void>((resolve) => host.on("connect", resolve));
    await new Promise<void>((resolve, reject) =>
      host.emit("session:resume", { code: data.code, token: input.hostSecret }, (result) =>
        result.ok ? resolve() : reject(new Error(result.message)),
      ),
    );
    const view = await snapshot;
    const result = await new Promise<Parameters<Ack>[0]>((resolve) =>
      host.emit(
        "test:control",
        {
          requestId: randomUUID(),
          matchId: view.id,
          phaseId: view.phaseId,
          command: { kind: "speed", speed: "manual" },
        },
        resolve,
      ),
    );
    expect(result.ok).toBe(true);
    for (const action of scenario !== "fresh"
      ? []
      : combat
        ? (["start", "advance", "advance"] as const)
        : (["start"] as const)) {
      const current = await new Promise<RoomView>((resolve, reject) =>
        host.emit("session:sync", { pending: [] }, (result) =>
          result.ok ? resolve(result.value.view) : reject(new Error(result.message)),
        ),
      );
      const env = { requestId: randomUUID(), matchId: current.id, phaseId: current.phaseId };
      const result = await new Promise<Parameters<Ack>[0]>((resolve) => {
        if (action === "start")
          host.emit("host:control", { ...env, command: { kind: "start" } }, resolve);
        else host.emit("test:control", { ...env, command: { kind: "advance" } }, resolve);
      });
      expect(result.ok).toBe(true);
    }
  } finally {
    host.disconnect();
  }
  return { data, input };
}

export async function identity(
  browser: Browser,
  baseURL: string,
  code: string,
  token: string,
  role: string,
) {
  const context = await browser.newContext();
  await context.addInitScript(
    ({ code, token, role }) => {
      localStorage.setItem(`siege-session:${code}:${role}`, token);
      sessionStorage.setItem("siege-rotation-hint", "dismissed");
    },
    { code, token, role },
  );
  const page = await context.newPage();
  await page.goto(`${baseURL}/#/${role === "host" ? "host" : "room"}/${code}`);
  return { context, page };
}

export async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
