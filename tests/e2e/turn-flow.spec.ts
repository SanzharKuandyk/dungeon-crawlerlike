import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { io, type Socket } from "socket.io-client";
import type { Ack, ClientEvents, ServerEvents } from "../../src/shared/protocol.js";
import { fixture, identity, noOverflow } from "../fixtures/layout-fixture.js";

test("crew sees committed actions, can change readiness, and resolves together", async ({
  page,
  browser,
  baseURL,
}) => {
  if (!baseURL) throw new Error("Missing server URL");
  const { data, input } = await fixture(page, baseURL);
  const host: Socket<ServerEvents, ClientEvents> = io(baseURL);
  const first = await identity(
    browser,
    baseURL,
    data.code,
    input.players[1].bootstrapSecret,
    "player",
  );
  const second = await identity(
    browser,
    baseURL,
    data.code,
    input.players[2].bootstrapSecret,
    "player",
  );
  try {
    await new Promise<void>((resolve) =>
      host.connected ? resolve() : host.once("connect", resolve),
    );
    const auth = await new Promise<Parameters<Ack>[0]>((resolve) =>
      host.emit("session:resume", { code: data.code, token: input.hostSecret }, resolve),
    );
    expect(auth.ok).toBe(true);
    const sync = await new Promise<Parameters<Parameters<ClientEvents["session:sync"]>[1]>[0]>(
      (resolve) => host.emit("session:sync", { pending: [] }, resolve),
    );
    if (!sync.ok) throw new Error(sync.message);
    const speed = await new Promise<Parameters<Ack>[0]>((resolve) =>
      host.emit(
        "test:control",
        {
          requestId: randomUUID(),
          matchId: sync.value.view.id,
          phaseId: sync.value.view.phaseId,
          command: { kind: "speed", speed: "normal" },
        },
        resolve,
      ),
    );
    expect(speed.ok).toBe(true);
    await expect(first.page.locator(".turn-status")).toContainText("all ready");
    await first.page.getByRole("button", { name: "Block", exact: true }).click();
    await first.page.getByRole("button", { name: /Ready · Block/ }).click();
    await expect(second.page.locator(".crew-orders button").first()).toHaveAccessibleName(/Block/);
    await expect(first.page.locator(".turn-ready")).toHaveText("1/2");
    await expect(first.page.locator(".phone-panel")).toHaveAttribute("data-phase", "combat");
    await first.page.getByRole("button", { name: "Change", exact: true }).click();
    await expect(second.page.locator(".turn-ready")).toHaveText("0/2");
    await first.page.getByRole("button", { name: /Ready · Block/ }).click();
    await second.page.getByRole("button", { name: "Seal", exact: true }).click();
    await second.page.setViewportSize({ width: 1366, height: 768 });
    await second.page.screenshot({ path: ".Codex/ui/turn-choice-desktop.png" });
    await second.page.getByRole("button", { name: /Ready · Attack seal/ }).click();
    await expect(first.page.locator(".phone-panel")).toHaveAttribute("data-phase", "combat-reveal");
    await expect(second.page.locator(".battle-outcome")).toBeVisible();
    await expect(second.page.locator(".confirm-action")).toHaveCount(0);
    await expect(second.page.locator(".battle-outcome li").first()).toBeVisible();
    await expect(
      second.page.getByRole("button", { name: "Seal broken", exact: true }),
    ).toBeVisible();
    await second.page.screenshot({ path: ".Codex/ui/turn-reveal-desktop.png" });
    await second.page.getByRole("button", { name: "Seal broken", exact: true }).click();
    await expect(second.page.getByText(/Your crew disabled the seal's attack bonus/)).toBeVisible();
    await second.page.keyboard.press("Escape");
    await expect(second.page.locator(".phone-panel")).toHaveAttribute("data-phase", "combat", {
      timeout: 20000,
    });
    await expect(second.page.locator(".turn-heading > strong")).toHaveText("Turn 2");
    await expect(second.page.locator(".turn-ready")).toHaveText("0/2");
    await noOverflow(second.page);
  } finally {
    host.disconnect();
    await first.context.close();
    await second.context.close();
  }
});

test("condition chips explain penalties without covering phone controls", async ({
  page,
  browser,
  baseURL,
}) => {
  if (!baseURL) throw new Error("Missing server URL");
  const { data, input } = await fixture(page, baseURL, true, "injuries");
  const player = await identity(
    browser,
    baseURL,
    data.code,
    input.players[0].bootstrapSecret,
    "player",
  );
  try {
    await player.page.getByRole("button", { name: "Arm injury", exact: true }).click();
    await expect(
      player.page.getByText("25% less outgoing damage. Persists until treated at a recovery stop."),
    ).toBeVisible();
    await player.page.keyboard.press("Escape");
    for (const viewport of [
      { width: 1366, height: 768 },
      { width: 667, height: 375 },
      { width: 360, height: 800 },
    ]) {
      await player.page.setViewportSize(viewport);
      await noOverflow(player.page);
      await expect(player.page.locator(".hero-effects")).toContainText("−25%");
      await expect(player.page.locator(".confirm-action")).toBeInViewport();
      const button = await player.page.locator(".confirm-action").boundingBox();
      expect((button?.y ?? 0) + (button?.height ?? 0)).toBeLessThanOrEqual(viewport.height);
      const bars = await player.page.locator(".enemy-bars").boundingBox();
      expect((bars?.y ?? 0) + (bars?.height ?? 0)).toBeLessThanOrEqual(viewport.height);
      await player.page.screenshot({ path: `.Codex/ui/turn-effects-${viewport.width}.png` });
    }
  } finally {
    await player.context.close();
  }
});
