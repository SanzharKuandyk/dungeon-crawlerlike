import { expect, test } from "@playwright/test";
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
      { width: 1024, height: 768 },
      { width: 844, height: 390 },
      { width: 667, height: 375 },
      { width: 360, height: 800 },
    ]) {
      await player.page.setViewportSize(viewport);
      await noOverflow(player.page);
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
    await player.page.getByRole("button", { name: "Weak point", exact: true }).click();
    await player.page.getByRole("button", { name: /Confirm · Attack weak point/ }).click();
    await expect(player.page.locator(".confirmed")).toContainText("Confirmed");
    await player.page.getByRole("button", { name: "Brace", exact: true }).click();
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
    await solo.page.getByRole("button", { name: "Skirmish", exact: true }).click();
    await expect(solo.page.locator(".order-preview")).toContainText("barrier");
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
      { width: 1024, height: 768 },
      { width: 844, height: 390 },
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
  for (const scenario of ["fresh", "question"]) {
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
        scenario === "fresh" ? "route" : "question",
      );
      for (const viewport of [
        { width: 1366, height: 768 },
        { width: 1024, height: 768 },
        { width: 844, height: 390 },
        { width: 667, height: 375 },
        { width: 360, height: 800 },
      ]) {
        await player.page.setViewportSize(viewport);
        await noOverflow(player.page);
        await expect(player.page.locator(".phase-pane:not([hidden])")).toBeVisible();
        if (scenario === "fresh") {
          const map = player.page.locator(".phone-panel .map-viewport");
          await expect(player.page.locator(".phone-panel .player-context")).toHaveCount(0);
          await expect(player.page.locator(".phone-panel .map-toolbar")).toHaveCount(0);
          await expect(player.page.locator(".route-vote-heading")).toContainText("Floor 1/10");
          await expect.poll(() => map.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
          expect(await map.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
            true,
          );
          const bounds = await map.boundingBox();
          for (const node of await player.page.locator(".phone-panel .map-node.reachable").all()) {
            const box = await node.boundingBox();
            expect(box?.y).toBeGreaterThanOrEqual((bounds?.y ?? 0) + 5);
            expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(
              (bounds?.y ?? 0) + (bounds?.height ?? 0),
            );
          }
          if (viewport.width > viewport.height && viewport.height < 500) {
            expect(
              await player.page.evaluate(
                () => document.documentElement.scrollHeight <= innerHeight,
              ),
            ).toBe(true);
          }
        }
        if (scenario === "question" && viewport.width > viewport.height) {
          const last = await player.page.locator(".answers button").last().boundingBox();
          expect((last?.y ?? 0) + (last?.height ?? 0)).toBeLessThanOrEqual(viewport.height);
        }
        await player.page.screenshot({
          path: `test-results/layout-${scenario}-${viewport.width}.png`,
        });
      }
      if (scenario === "fresh") {
        const map = player.page.locator(".phone-panel .map-viewport");
        const start = await map.evaluate((element) => element.scrollTop);
        await player.page.locator(".phone-panel .map-node.reachable").first().click();
        await expect(player.page.locator(".phone-panel .map-node.own-vote")).toHaveCount(1);
        await expect(player.page.locator(".map-inspection")).toContainText("Voted");
        await player.page.locator(".phone-panel .map-node.reachable").last().click();
        await expect(player.page.locator(".phone-panel .map-node.reachable").last()).toHaveClass(
          /own-vote/,
        );
        expect(await map.evaluate((element) => element.scrollTop)).toBeCloseTo(start, 0);
        const first = await player.page.locator(".map-stop[data-floor='1']").first().boundingBox();
        const boss = await player.page.locator(".map-stop[data-floor='10']").first().boundingBox();
        expect(boss?.y).toBeLessThan(first?.y ?? 0);
        await map.evaluate((element) => {
          element.scrollTop = 0;
        });
        await expect(player.page.locator(".phone-panel .map-node.guardian")).toBeInViewport();
        await player.page.screenshot({ path: "test-results/layout-map-guardian.png" });
      } else {
        await player.page.locator(".phone-panel .answers button").last().click();
        await expect(player.page.locator(".quiz-card")).toContainText("Answer received");
      }
    } finally {
      await player.context.close();
    }
  }
});
