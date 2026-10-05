import { expect, test } from "@playwright/test";

async function playground(page: import("@playwright/test").Page) {
  await page.goto("/#/test");
  await page.getByRole("button", { name: "Join test match", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start expedition", exact: true })).toBeEnabled();
  await page.getByText("Test debugger", { exact: true }).click();
}
test("all ten characters have independent lobby choices and combat controls", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await playground(page);
  await page.getByLabel("Speed", { exact: true }).selectOption("manual");
  await page.getByRole("button", { name: "Manual all characters" }).click();
  await expect(page.locator(".team-switcher button")).toHaveCount(10);
  await page.locator(".team-switcher button").nth(0).click();
  await page.getByRole("button", { name: /Fighter/ }).click();
  await page.locator(".team-switcher button").nth(1).click();
  await page.getByRole("button", { name: /Healer/ }).click();
  await page.locator(".team-switcher button").nth(0).click();
  await expect(page.getByRole("button", { name: /Fighter/ })).toHaveClass(/chosen/);
  await page.getByRole("button", { name: "Start expedition", exact: true }).click();
  await expect(page.locator(".phone-panel")).toHaveAttribute("data-phase", "route");
  await page.getByRole("button", { name: "View Crew 1", exact: true }).click();
  const canvas = await page.locator(".phone-panel canvas").elementHandle();
  if (!canvas) throw new Error("Missing dungeon scene");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  for (let i = 0; i < 10; i++) {
    await page.locator(".team-switcher button").nth(i).click();
    await expect(page.locator(".selected-identity small")).toContainText("ready");
    await page.locator(".phone-panel .map-node.reachable").first().click();
  }
  await page.getByRole("button", { name: "Next phase" }).click();
  await expect(page.locator(".phone-panel")).toHaveAttribute("data-phase", "arrival");
  await page.getByRole("button", { name: "Next phase" }).click();
  await expect(page.locator(".phone-panel")).toHaveAttribute("data-phase", "combat");
  await page.locator(".team-switcher button").nth(0).click();
  await page.locator(".phone-panel").getByRole("button", { name: "Attack", exact: true }).click();
  await page
    .locator(".phone-panel")
    .getByRole("button", { name: /(?:Ready|Play turn) · Attack/ })
    .click();
  await expect(page.locator(".phone-panel .own-order button")).toHaveAccessibleName(/Attack/);
  await page.locator(".team-switcher button").nth(1).click();
  await page.locator(".phone-panel").getByRole("button", { name: "Block", exact: true }).click();
  await page
    .locator(".phone-panel")
    .getByRole("button", { name: /(?:Ready|Play turn) · Block/ })
    .click();
  await expect(page.locator(".phone-panel .own-order button")).toHaveAccessibleName(/Block/);
  await page.getByRole("button", { name: "Disconnect selected" }).click();
  await expect(page.locator(".selected-identity small")).toContainText("reconnecting");
  await page.getByRole("button", { name: "Reconnect selected" }).click();
  await expect(page.locator(".selected-identity small")).toContainText("ready");
  await expect(page.locator(".phone-panel .own-order button")).toHaveAccessibleName(/Block/);
  expect(await canvas.evaluate((node) => node.isConnected)).toBe(true);
  await page.screenshot({ path: "test-results/dungeon-playground.png", fullPage: true });
  expect(errors).toEqual([]);
});
test("one Start automatically finishes a finite expedition with a persistent arena", async ({
  page,
}) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await playground(page);
  await page.getByLabel("Speed", { exact: true }).selectOption("fast");
  await page.getByRole("button", { name: "Auto all characters" }).click();
  await page.getByRole("button", { name: "Start expedition", exact: true }).click();
  await page.getByRole("button", { name: "View Crew 1", exact: true }).click();
  const canvas = await page.locator(".phone-panel canvas").elementHandle();
  if (!canvas) throw new Error("Missing arena");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  let questionSeen = false;
  for (let i = 0; i < 720; i++) {
    if (await page.locator(".phone-panel .results").count()) break;
    if ((await page.locator(".phone-panel").getAttribute("data-phase")) === "shared-event")
      questionSeen = true;
    await page.waitForTimeout(250);
  }
  await expect(page.locator(".phone-panel .results")).toContainText("Expedition complete");
  expect(questionSeen).toBe(true);
  expect(await canvas.evaluate((node) => node.isConnected)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: "test-results/dungeon-finished.png", fullPage: true });
});
test("spirits, private questions, equipment and scenario resets use the same controls", async ({
  page,
}) => {
  await playground(page);
  await page.getByLabel("Scenario", { exact: true }).selectOption("critical");
  await page.getByRole("button", { name: "Load scenario" }).click();
  await expect(page.locator(".phone-panel")).toHaveAttribute("data-phase", "combat");
  await page.getByText("Test debugger", { exact: true }).click();
  await page.getByLabel("Speed", { exact: true }).selectOption("manual");
  await page.locator(".team-switcher button").nth(2).click();
  await expect(page.locator(".phone-panel")).toContainText("Spirit");
  await page
    .locator(".phone-panel")
    .getByRole("button", { name: "Shield ally", exact: true })
    .click();
  await page.getByLabel("Scenario", { exact: true }).selectOption("trial-answer");
  await page.getByRole("button", { name: "Load scenario" }).click();
  await expect(page.locator(".phone-panel")).toHaveAttribute("data-phase", "shared-event");
  await expect(page.locator(".phone-panel .trial-problem")).toContainText(
    /Subway Surfers|Angry Birds|Candy Crush|Clash Royale|Brawl Stars/,
  );
  await expect(page.locator(".phone-panel .trial-panel")).not.toContainText("DEV FIXTURE");
  await page.getByText("Test debugger", { exact: true }).click();
  await page.getByLabel("Speed", { exact: true }).selectOption("manual");
  await page.getByRole("button", { name: "Manual all characters" }).click();
  await page.getByRole("button", { name: "Reveal current answer" }).click();
  await expect(page.locator(".debugger")).toContainText("Correct choice:");
  const text = await page.locator(".debugger").innerText();
  const choice = "ABCD".indexOf(text.match(/Correct choice: ([ABCD])/)?.[1] ?? "A");
  await page.locator(".phone-panel .trial-options button").nth(choice).click();
  await expect(page.locator(".phone-panel .trial-panel")).toContainText("Answer locked");
  await page.getByRole("button", { name: "Next phase" }).click();
  await expect(page.locator(".phone-panel")).toHaveAttribute("data-phase", "shared-event");
  await expect(page.locator(".phone-panel .trial-options button")).toHaveCount(4);
  await expect(page.locator(".phone-panel .trial-options button.correct")).toHaveCount(1);
  await expect(page.locator(".phone-panel .trial-panel")).toContainText("MGD_5_week.pptx");
  await page.getByRole("button", { name: "Next phase" }).click();
  await expect(page.locator(".phone-panel .trial-board")).toBeVisible();
  await page.screenshot({ path: "test-results/dungeon-question.png", fullPage: true });
});
test("separate host, five phones and projector support crew controls and recovery", async ({
  browser,
}) => {
  const hostContext = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const contexts = [hostContext];
  try {
    const host = await hostContext.newPage();
    await host.goto("/");
    await host.getByRole("button", { name: "Host a match" }).click();
    await expect(host.getByRole("heading", { name: /Room [A-Z0-9]{6}/ })).toBeVisible();
    const code = host.url().split("/").at(-1) ?? "";
    const pages = [];
    for (let i = 0; i < 5; i++) {
      const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
      contexts.push(context);
      const p = await context.newPage();
      pages.push(p);
      await p.goto(`/#/room/${code}`);
      await p.getByLabel("Your nickname").fill(i === 0 ? "Alexandra Longsurname" : `Student ${i}`);
      await p.getByRole("button", { name: "Join as player" }).click();
      if (i === 0 || i === 4) {
        await p.getByLabel("Or create a crew").fill(i === 0 ? "The Wandering Scholars" : "Solo");
        await p.getByRole("button", { name: "Create crew", exact: true }).click();
      } else await p.getByRole("button", { name: /The Wandering Scholars/ }).click();
      await expect(
        p.getByRole("heading", {
          name: `Your crew: ${i === 4 ? "Solo" : "The Wandering Scholars"}`,
          exact: true,
        }),
      ).toBeVisible();
      await expect(p.getByLabel("Or create a crew")).toHaveCount(0);
    }
    const projector = await hostContext.newPage();
    await projector.goto(`/#/board/${code}`);
    await projector
      .getByRole("button", { name: "View The Wandering Scholars", exact: true })
      .click();
    await expect(projector.locator("dialog canvas")).toBeVisible();
    await host.getByRole("button", { name: "Start expedition", exact: true }).click();
    for (const p of pages) {
      await expect(p.locator(".phone-panel")).toHaveAttribute("data-phase", "route");
      await p.locator(".phone-panel .map-node.reachable").first().click();
      await p.getByRole("button", { name: "Ready to travel", exact: true }).click();
    }
    await expect(pages[0].locator(".phone-panel")).toHaveAttribute("data-phase", "combat", {
      timeout: 35000,
    });
    const p = pages[0];
    await p.getByRole("button", { name: "Attack", exact: true }).click();
    await p.getByRole("button", { name: /(?:Ready|Play turn) · Attack/ }).click();
    await expect(p.locator(".own-order button")).toHaveAccessibleName(/Attack/);
    await p.context().setOffline(true);
    await expect(p.locator(".banner")).toContainText("reconnecting");
    await p.context().setOffline(false);
    await expect(p.locator(".own-order button")).toHaveAccessibleName(/Attack/);
    await p.reload();
    await expect(p.locator(".phone-panel")).toContainText("Alexandra Longsurname");
    await expect(p.locator(".own-order button")).toHaveAccessibleName(/Attack/);
    expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await p.screenshot({ path: "test-results/dungeon-mobile.png", fullPage: true });
    const largerText = await p.addStyleTag({
      content:
        "button, .player-heading strong, .player-vitals strong { font-size:18px !important; }",
    });
    for (const viewport of [
      { width: 360, height: 800 },
      { width: 667, height: 375 },
      { width: 844, height: 390 },
    ]) {
      await p.setViewportSize(viewport);
      expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(p.getByRole("button", { name: "Change", exact: true })).toBeInViewport();
      await p.screenshot({ path: `.Codex/ui-v4/long-name-larger-text-${viewport.width}.png` });
    }
    await largerText.evaluate((el) => el.parentNode?.removeChild(el));

    await host.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(projector.locator(".expedition-heading h1")).toContainText("paused");
    await host.getByRole("button", { name: "Resume", exact: true }).click();
    await expect(projector.locator(".expedition-heading h1")).not.toContainText("paused");
    await projector.screenshot({ path: "test-results/dungeon-projector.png", fullPage: true });
  } finally {
    for (const c of contexts) await c.close();
  }
});

test("a consensual duel renders both crews and returns to the dungeon after three exchanges", async ({
  page,
}) => {
  await playground(page);
  await page.getByLabel("Scenario", { exact: true }).selectOption("duel");
  await page.getByRole("button", { name: "Load scenario" }).click();
  await expect(page.locator(".phone-panel .duel-controls")).toContainText("exchange 1/3");
  await page.locator(".phone-panel .duel-controls select").selectOption({ index: 1 });
  await page
    .locator(".phone-panel")
    .getByRole("button", { name: /^Strike/ })
    .click();
  await expect(page.locator(".phone-panel .duel-controls")).toContainText("Confirmed: strike");
  await page.getByText("Test debugger", { exact: true }).click();
  for (let i = 0; i < 6; i++) {
    await page.getByRole("button", { name: "Next phase", exact: true }).click();
    await expect(page.getByRole("button", { name: "Next phase", exact: true })).toBeEnabled();
  }
  await expect(page.locator(".phone-panel .duel-controls")).toHaveCount(0);
  await expect(page.locator(".phone-panel canvas")).toHaveCount(1);
  await page.screenshot({ path: "test-results/duel-return.png", fullPage: true });
});
