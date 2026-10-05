import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { io, type Socket } from "socket.io-client";
import type { Ack, ClientEvents, ServerEvents } from "../../src/shared/protocol.js";
import { fixture, identity, noOverflow } from "../fixtures/layout-fixture.js";

test("battle controls fit phones, tablets and desktop with grounded four-member crews", async ({
  page,
  browser,
  baseURL,
}) => {
  if (!baseURL) throw new Error("Missing server URL");
  const { data, input } = await fixture(page, baseURL);
  const player = await identity(
    browser,
    baseURL,
    data.code,
    input.players[6].bootstrapSecret,
    "player",
  );
  try {
    await expect(player.page.locator(".phone-panel")).toHaveAttribute("data-phase", "combat");
    await expect(player.page.locator(".phone-panel canvas")).toHaveCount(1);
    for (const viewport of [
      { width: 1366, height: 768 },
      { width: 768, height: 1024 },
      { width: 844, height: 390 },
      { width: 667, height: 375 },
      { width: 412, height: 915 },
      { width: 950, height: 600 },
      { width: 360, height: 640 },
      { width: 360, height: 800 },
    ]) {
      await player.page.setViewportSize(viewport);
      await noOverflow(player.page);
      await expect(player.page.locator(".confirm-action")).toBeInViewport();
      const build = player.page.locator(".scene-build").first();
      await build.focus();
      const buildBox = await build.boundingBox();
      expect(buildBox?.width).toBe(44);
      expect(buildBox?.height).toBe(44);
      const scene = await player.page.locator(".phone-panel canvas").boundingBox();
      expect(scene?.height).toBeGreaterThan(100);
      await expect
        .poll(() =>
          player.page.evaluate(() => {
            const canvas = document.querySelector(".phone-panel canvas") as HTMLCanvasElement;
            const r = canvas.getBoundingClientRect();
            const scale = Math.min(r.width / canvas.width, r.height / canvas.height);
            const ground = canvas.height === 1000 ? 350 : 436;
            const actorFoot = r.top + (r.height - canvas.height * scale) / 2 + ground * scale;
            const label = document
              .querySelector(".hero-actor-hud .actor-name")
              ?.getBoundingClientRect();
            return label ? Math.abs(label.top - actorFoot) : Infinity;
          }),
        )
        .toBeLessThan(2);
      const confirm = player.page.locator(".confirm-action");
      const rect = await confirm.boundingBox();
      expect(rect?.height).toBeGreaterThanOrEqual(44);
      if (viewport.width > viewport.height && viewport.height < 500) {
        expect((rect?.y ?? 0) + (rect?.height ?? 0)).toBeLessThanOrEqual(viewport.height);
        expect(
          await player.page.evaluate(() => document.documentElement.scrollHeight <= innerHeight),
        ).toBe(true);
      }
      await player.page.screenshot({ path: `test-results/layout-player-${viewport.width}.png` });
    }
    await player.page.getByRole("button", { name: /(?:Ready|Play turn) · Attack/ }).click();
    await expect(player.page.locator(".confirmed")).toContainText("Ready");
    await player.page.getByRole("button", { name: "Change", exact: true }).click();
    await player.page.getByRole("button", { name: "Block", exact: true }).click();
    await expect(player.page.locator(".action-targets")).not.toBeVisible();
  } finally {
    await player.context.close();
  }
  const solo = await identity(
    browser,
    baseURL,
    data.code,
    input.players[0].bootstrapSecret,
    "player",
  );
  try {
    await solo.page.setViewportSize({ width: 667, height: 375 });
    await solo.page.getByRole("button", { name: "Hit & Block", exact: true }).click();
    await expect(
      solo.page.getByRole("button", { name: /(?:Ready|Play turn) · Hit & Block.*barrier/ }),
    ).toBeEnabled();
    await noOverflow(solo.page);
    expect(
      await solo.page.evaluate(() => document.documentElement.scrollHeight <= innerHeight),
    ).toBe(true);
    await solo.page.screenshot({ path: "test-results/layout-solo-skill.png" });
  } finally {
    await solo.context.close();
  }
});

test("host toolbar and crew cards share consistent spacing at desktop and tablet widths", async ({
  page,
  browser,
  baseURL,
}) => {
  if (!baseURL) throw new Error("Missing server URL");
  const { data, input } = await fixture(page, baseURL);
  const host = await identity(browser, baseURL, data.code, input.hostSecret, "host");
  try {
    await host.page.getByRole("button", { name: "Dungeon", exact: true }).click();
    for (const viewport of [
      { width: 1366, height: 768 },
      { width: 768, height: 1024 },
      { width: 844, height: 390 },
      { width: 412, height: 915 },
      { width: 950, height: 600 },
      { width: 360, height: 640 },
      { width: 360, height: 800 },
    ]) {
      await host.page.setViewportSize(viewport);
      await noOverflow(host.page);
      await expect(host.page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
      await expect(
        host.page.locator(".board-panel:not([hidden]) .crew-stage").first(),
      ).toBeVisible();
      await host.page.screenshot({ path: `test-results/layout-host-${viewport.width}.png` });
    }
    await host.page.setViewportSize({ width: 1366, height: 768 });
    await host.page.getByRole("button", { name: "Map", exact: true }).click();
    const map = host.page.locator(".map-board-panel .map-viewport");
    const firstCrew = host.page.locator(".map-crew-label").first();
    await firstCrew.click();
    await expect.poll(() => map.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await map.evaluate((element) => {
      element.scrollTop = 0;
    });
    await firstCrew.click();
    await expect.poll(() => map.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await noOverflow(host.page);
    const position = host.page.locator(".map-stop:has(.current-node)");
    await expect(position.locator(".map-markers > span").first()).toBeInViewport();
    await host.page.screenshot({ path: "test-results/layout-host-map.png" });
  } finally {
    await host.context.close();
  }
});

test("map votes and questions remain usable in the responsive player frame", async ({
  page,
  browser,
  baseURL,
}) => {
  if (!baseURL) throw new Error("Missing server URL");
  for (const scenario of ["fresh", "trial-answer"]) {
    const { data, input } = await fixture(page, baseURL, false, scenario);
    const player = await identity(
      browser,
      baseURL,
      data.code,
      input.players[0].bootstrapSecret,
      "player",
    );
    try {
      await expect(player.page.locator(".phone-panel")).toHaveAttribute(
        "data-phase",
        scenario === "fresh" ? "route" : "shared-event",
      );
      for (const viewport of [
        { width: 1366, height: 768 },
        { width: 768, height: 1024 },
        { width: 844, height: 390 },
        { width: 667, height: 375 },
        { width: 412, height: 915 },
        { width: 950, height: 600 },
        { width: 360, height: 640 },
        { width: 360, height: 800 },
      ]) {
        await player.page.setViewportSize(viewport);
        await noOverflow(player.page);
        await expect(player.page.locator(".phase-pane:not([hidden])")).toBeVisible();
        if (scenario === "fresh") {
          const map = player.page.locator(".phone-panel .map-viewport");
          await expect(player.page.locator(".phone-panel .player-context")).toHaveCount(0);
          await expect(
            player.page.getByRole("button", { name: "Locate crew", exact: true }),
          ).toBeVisible();
          await expect(player.page.locator(".map-toolbar")).toContainText("Chapter 1 · 1/12");
          await expect.poll(() => map.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
          expect(await map.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
            true,
          );
          await player.page.getByRole("button", { name: "Locate crew", exact: true }).click();
          const bounds = await map.boundingBox();
          if (viewport.width > viewport.height && viewport.width <= 1100) {
            expect(bounds?.height).toBeGreaterThan(160);
          }
          const hudFits = await player.page.locator(".player-status").evaluate((el) => {
            const panel = el.getBoundingClientRect();
            return [...el.querySelectorAll("button, strong, .crew-readiness")].every((child) => {
              const box = child.getBoundingClientRect();
              return box.left >= panel.left && box.right <= panel.right;
            });
          });
          expect(hudFits).toBe(true);
          await expect(player.page.locator(".map-route-picker .primary")).toBeInViewport();
          const labelsClear = await player.page.locator(".map-canvas").evaluate((el) => {
            const icons = [...el.querySelectorAll(".map-node")].map((node) =>
              node.getBoundingClientRect(),
            );
            return [...el.querySelectorAll(".map-node-label")].every((label) => {
              const r = label.getBoundingClientRect();
              return icons.every(
                (icon) =>
                  r.right <= icon.left ||
                  r.left >= icon.right ||
                  r.bottom <= icon.top ||
                  r.top >= icon.bottom,
              );
            });
          });
          expect(labelsClear).toBe(true);
          for (const node of await player.page.locator(".phone-panel .map-node.reachable").all()) {
            const box = await node.boundingBox();
            expect(box?.y).toBeGreaterThanOrEqual(bounds?.y ?? 0);
            expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(
              (bounds?.y ?? 0) + (bounds?.height ?? 0),
            );
          }
          const toggle = player.page.getByRole("button", {
            name: "Show compact route",
            exact: true,
          });
          if (await toggle.isVisible()) await toggle.click();
          await expect(
            player.page.getByRole("button", { name: "Show route detail", exact: true }),
          ).toBeVisible();
          await player.page.screenshot({ path: `test-results/map-overview-${viewport.width}.png` });
          if (viewport.width > viewport.height && viewport.height < 500) {
            expect(
              await player.page.evaluate(
                () => document.documentElement.scrollHeight <= innerHeight,
              ),
            ).toBe(true);
          }
        }
        if (scenario === "trial-answer" && viewport.width > viewport.height) {
          await player.page.locator(".trial-options button").last().scrollIntoViewIfNeeded();
          const last = await player.page.locator(".trial-options button").last().boundingBox();
          expect((last?.y ?? 0) + (last?.height ?? 0)).toBeLessThanOrEqual(viewport.height);
        }
        await player.page.screenshot({
          path: `test-results/layout-${scenario}-${viewport.width}.png`,
        });
      }
      if (scenario === "fresh") {
        const overview = player.page.getByRole("button", {
          name: "Show route detail",
          exact: true,
        });
        await expect(overview.locator("svg")).toBeVisible();
        expect(
          await overview.evaluate(
            (el) => getComputedStyle(el).color !== getComputedStyle(el).backgroundColor,
          ),
        ).toBe(true);
        const map = player.page.locator(".phone-panel .map-viewport");
        const start = await map.evaluate((element) => element.scrollTop);
        await player.page.locator(".phone-panel .map-node.reachable").first().click();
        await expect(player.page.locator(".phone-panel .map-node.own-vote")).toHaveCount(1);
        await expect(player.page.locator(".map-inspection")).toContainText("Selected");
        await player.page.locator(".phone-panel .map-node.reachable").last().click();
        await expect(player.page.locator(".phone-panel .map-node.reachable").last()).toHaveClass(
          /own-vote/,
        );
        expect(await map.evaluate((element) => element.scrollTop)).toBeCloseTo(start, 0);
        const first = await player.page.locator(".map-stop[data-floor='1']").first().boundingBox();
        const boss = await player.page.locator(".map-stop[data-floor='12']").first().boundingBox();
        expect(boss?.y).toBeLessThan(first?.y ?? 0);
        await map.evaluate((element) => {
          element.scrollTop = 0;
        });
        await expect(player.page.locator(".phone-panel .map-node.guardian")).toBeInViewport();
        await player.page.screenshot({ path: "test-results/layout-map-guardian.png" });
      } else {
        await player.page.locator(".phone-panel .trial-options button").last().click();
        await expect(player.page.locator(".trial-panel")).toContainText("Answer locked");
      }
    } finally {
      await player.context.close();
    }
  }
});

test("map browsing survives 50 snapshots and a movement update", async ({
  page,
  browser,
  baseURL,
}) => {
  if (!baseURL) throw new Error("Missing server URL");
  const { data, input } = await fixture(page, baseURL, false);
  const student = await identity(
    browser,
    baseURL,
    data.code,
    input.players[6].bootstrapSecret,
    "player",
  );
  const host: Socket<ServerEvents, ClientEvents> = io(baseURL);
  try {
    let snapshots = 0;
    page.on("websocket", (socket) =>
      socket.on("framereceived", ({ payload }) => {
        if (String(payload).includes("room:snapshot")) snapshots++;
      }),
    );
    await page.goto(`/#/board/${data.code}`);
    await page.getByRole("button", { name: "Map", exact: true }).click();
    const map = page.locator(".map-board-panel .map-viewport");
    await map.evaluate((el) => {
      el.scrollTop = 200;
    });
    const position = await map.evaluate((el) => el.scrollTop);
    const routes = student.page.locator(".phone-panel .map-node.reachable");
    for (let i = 0; i < 50; i++) {
      const choice = routes.first();
      const edit = student.page.getByRole("button", { name: "Change", exact: true });
      if (await edit.count()) await edit.click();
      await choice.click();
      await student.page.getByRole("button", { name: "Ready to travel", exact: true }).click();
      await expect(choice).toHaveClass(/own-vote/);
      await expect.poll(() => map.evaluate((el) => el.scrollTop)).toBe(position);
      await student.page.waitForTimeout(120);
    }
    await expect.poll(() => snapshots).toBeGreaterThanOrEqual(50);
    await new Promise<void>((resolve) =>
      host.connected ? resolve() : host.once("connect", resolve),
    );
    const resumed = await new Promise<Parameters<Ack>[0]>((resolve) =>
      host.emit("session:resume", { code: data.code, token: input.hostSecret }, resolve),
    );
    expect(resumed.ok).toBe(true);
    const synchronized = await new Promise<
      Parameters<Parameters<ClientEvents["session:sync"]>[1]>[0]
    >((resolve) => host.emit("session:sync", { pending: [] }, resolve));
    if (!synchronized.ok) throw new Error(synchronized.message);
    const view = synchronized.value.view;
    const advanced = await new Promise<Parameters<Ack>[0]>((resolve) =>
      host.emit(
        "test:control",
        {
          requestId: randomUUID(),
          matchId: view.id,
          phaseId: view.phaseId,
          command: { kind: "advance" },
        },
        resolve,
      ),
    );
    expect(advanced.ok).toBe(true);
    await expect(student.page.locator(".phone-panel")).toHaveAttribute("data-phase", "arrival");
    await expect.poll(() => map.evaluate((el) => el.scrollTop)).toBe(position);
  } finally {
    host.disconnect();
    await student.context.close();
  }
});
