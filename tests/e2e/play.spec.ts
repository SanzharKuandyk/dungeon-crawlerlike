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
  await page.getByRole("button", { name: /Wanderer/ }).click();
  await page.locator(".team-switcher button").nth(1).click();
  await page.getByRole("button", { name: /Physician/ }).click();
  await page.locator(".team-switcher button").nth(0).click();
  await expect(page.getByRole("button", { name: /Wanderer/ })).toHaveClass(/chosen/);
  await page.getByRole("button", { name: "Start expedition", exact: true }).click();
  await expect(page.locator(".phone-panel")).toHaveAttribute("data-phase", "route");
  await page.getByRole("button", { name: "View Crew 1", exact: true }).click();
  const canvas = await page.locator("canvas").elementHandle();
  if (!canvas) throw new Error("Missing dungeon scene");
  for (let i = 0; i < 10; i++) {
    await page.locator(".team-switcher button").nth(i).click();
    await expect(page.locator(".selected-identity small")).toContainText("ready");
    await page
      .locator(".route-options button")
      .nth(i < 3 ? 0 : 1)
      .click();
  }
  await page.getByRole("button", { name: "Next phase" }).click();
  await expect(page.locator(".phone-panel")).toHaveAttribute("data-phase", "arrival");
  await page.getByRole("button", { name: "Next phase" }).click();
  await expect(page.locator(".phone-panel")).toHaveAttribute("data-phase", "combat");
  await page.locator(".team-switcher button").nth(0).click();
  await page.locator(".phone-panel").getByRole("button", { name: "Attack", exact: true }).click();
  await page
    .locator(".phone-panel")
    .getByRole("button", { name: /Confirm · Attack/ })
    .click();
  await expect(page.locator(".phone-panel .confirmed")).toContainText("Attack");
  await page.locator(".team-switcher button").nth(1).click();
  await page.locator(".phone-panel").getByRole("button", { name: "Loot", exact: true }).click();
  await page
    .locator(".phone-panel")
    .getByRole("button", { name: /Confirm · Loot/ })
    .click();
  await expect(page.locator(".phone-panel .confirmed")).toContainText("Loot");
  await page.getByRole("button", { name: "Disconnect selected" }).click();
  await expect(page.locator(".selected-identity small")).toContainText("reconnecting");
  await page.getByRole("button", { name: "Reconnect selected" }).click();
  await expect(page.locator(".selected-identity small")).toContainText("ready");
  await expect(page.locator(".phone-panel .confirmed")).toContainText("Loot");
  expect(await canvas.evaluate((node) => node.isConnected)).toBe(true);
  await page.screenshot({ path: "test-results/dungeon-playground.png", fullPage: true });
  expect(errors).toEqual([]);
});
test("one Start automatically finishes a five-depth expedition with a persistent arena", async ({
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
  const canvas = await page.locator("canvas").elementHandle();
  if (!canvas) throw new Error("Missing arena");
  let questionSeen = false;
  for (let i = 0; i < 720; i++) {
    if (await page.locator(".phone-panel .results").count()) break;
    if ((await page.locator(".phone-panel").getAttribute("data-phase")) === "question")
      questionSeen = true;
    await page.waitForTimeout(250);
  }
  await expect(page.locator(".phone-panel .results")).toContainText("Expedition complete");
  await expect(page.locator(".phone-panel")).toHaveAttribute("data-depth", "5");
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
  await page.locator(".team-switcher button").nth(1).click();
  await expect(page.locator(".phone-panel")).toContainText("Spirit");
  await page
    .locator(".phone-panel")
    .getByRole("button", { name: /Confirm Ward/ })
    .click();
  await page.getByLabel("Scenario", { exact: true }).selectOption("question");
  await page.getByRole("button", { name: "Load scenario" }).click();
  await expect(page.locator(".phone-panel")).toHaveAttribute("data-phase", "question");
  await page.getByText("Test debugger", { exact: true }).click();
  await page.getByLabel("Speed", { exact: true }).selectOption("manual");
  await page.getByRole("button", { name: "Manual all characters" }).click();
  await page.getByRole("button", { name: "Reveal current answer" }).click();
  await expect(page.locator(".debugger")).toContainText("Correct choice:");
  const text = await page.locator(".debugger").innerText();
  const choice = "ABCD".indexOf(text.match(/Correct choice: ([ABCD])/)?.[1] ?? "A");
  await page.locator(".phone-panel .answers button").nth(choice).click();
  await expect(page.locator(".phone-panel .quiz-card")).toContainText("Answer received");
  await page.getByRole("button", { name: "Next phase" }).click();
  await expect(page.locator(".phone-panel")).toHaveAttribute("data-phase", "explanation");
  await page.getByRole("button", { name: "Next phase" }).click();
  await expect(page.locator(".phone-panel")).toHaveAttribute("data-phase", "equipment");
  await page.locator(".phone-panel").getByRole("button", { name: /^Ward/ }).click();
  await page.getByRole("button", { name: "Next phase" }).click();
  await expect(page.locator(".phone-panel")).toHaveAttribute("data-phase", "return");
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
      await p.getByLabel("Your nickname").fill(`Student ${i}`);
      await p.getByRole("button", { name: "Join as player" }).click();
      if (i === 0 || i === 4) {
        await p.getByLabel("Or create a crew").fill(i === 0 ? "Four players" : "Solo");
        await p.getByRole("button", { name: "Create crew", exact: true }).click();
      } else await p.getByRole("button", { name: /Four players/ }).click();
      await expect(p.locator(".banner").filter({ hasText: "You joined" })).toBeVisible();
    }
    const projector = await hostContext.newPage();
    await projector.goto(`/#/board/${code}`);
    await projector.getByRole("button", { name: "View Four players", exact: true }).click();
    await expect(projector.locator("canvas")).toBeVisible();
    await host.getByRole("button", { name: "Start expedition", exact: true }).click();
    for (const p of pages) {
      await expect(p.locator(".phone-panel")).toHaveAttribute("data-phase", "route");
      await p
        .locator(".route-options button")
        .filter({ hasText: /low risk/i })
        .click();
    }
    await expect(pages[0].locator(".phone-panel")).toHaveAttribute("data-phase", "combat", {
      timeout: 35000,
    });
    const p = pages[0];
    await p.getByRole("button", { name: "Attack", exact: true }).click();
    await p.getByRole("button", { name: /Confirm · Attack/ }).click();
    await expect(p.locator(".confirmed")).toContainText("Attack");
    await p.context().setOffline(true);
    await expect(p.locator(".banner")).toContainText("reconnecting");
    await p.context().setOffline(false);
    await expect(p.locator(".confirmed")).toContainText("Attack");
    await p.reload();
    await expect(p.locator(".phone-panel")).toContainText("Student 0");
    await expect(p.locator(".confirmed")).toContainText("Attack");
    expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await p.screenshot({ path: "test-results/dungeon-mobile.png", fullPage: true });
    await host.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(projector.locator(".timer")).toContainText("Paused");
    await host.getByRole("button", { name: "Resume", exact: true }).click();
    await expect(projector.locator(".timer")).not.toContainText("Paused");
    await projector.screenshot({ path: "test-results/dungeon-projector.png", fullPage: true });
  } finally {
    for (const c of contexts) await c.close();
  }
});
