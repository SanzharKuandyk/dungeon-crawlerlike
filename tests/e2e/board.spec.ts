import { expect, test } from "@playwright/test";
import type { BootstrapInput } from "../../src/server/test-mode/create-test-room.js";

test("empty lobby fits the screen and lets the host join as a player in another tab", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/");
  await page.getByRole("button", { name: "Host a match" }).click();
  await expect(page.getByRole("heading", { name: "Waiting for players" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Projector/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start expedition" })).toBeDisabled();
  await expect(page.getByRole("button", { name: /^(Previous|Next) crews$/ })).toHaveCount(0);
  const empty = page.locator(".empty-crews");
  await expect(empty).toBeVisible();
  await page.screenshot({ path: "test-results/empty-host-lobby.png" });
  await page.setViewportSize({ width: 360, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1366, height: 768 });
  const code = page.url().split("/").at(-1) ?? "";
  const projector = await context.newPage();
  await projector.goto(`/#/board/${code}`);
  await expect(projector.getByRole("heading", { name: "Waiting for players" })).toBeVisible();
  await projector.close();
  const playerOpened = page.waitForEvent("popup");
  await page.getByRole("link", { name: "Join as player" }).click();
  const player = await playerOpened;
  await player.setViewportSize({ width: 360, height: 800 });
  await player.getByLabel("Your nickname").fill("Teacher testing");
  await player.getByRole("button", { name: "Join as player" }).click();
  await expect(
    player.getByRole("heading", { name: "Choose your crew", exact: true }),
  ).toBeVisible();
  await expect(player.locator(".class-picker")).toHaveCount(0);
  await player.getByLabel("Or create a crew").fill("Test crew");
  await player.getByRole("button", { name: "Create crew", exact: true }).click();
  await expect(page.getByRole("button", { name: "View Test crew", exact: true })).toBeVisible();
  await expect(
    player.getByRole("heading", { name: "Your crew: Test crew", exact: true }),
  ).toBeVisible();
  await expect(player.getByLabel("Your crew", { exact: true })).toContainText(
    "Teacher testing (you)",
  );
  await expect(player.getByLabel("Or create a crew")).toHaveCount(0);
  await player.getByRole("button", { name: /Healer/ }).click();
  await expect(player.locator(".selected-class")).toHaveText("Selected: Healer");
  await expect(player.getByRole("button", { name: /Healer/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await player.reload();
  await expect(player.locator(".selected-class")).toHaveText("Selected: Healer");
  await expect(
    player.getByRole("heading", { name: "Your crew: Test crew", exact: true }),
  ).toBeVisible();
  expect(await player.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
    true,
  );
  await player.screenshot({ path: "test-results/student-crew-lobby.png", fullPage: true });
  await player.getByRole("button", { name: "Change crew", exact: true }).click();
  await expect(player.getByRole("button", { name: /Your current crew/ })).toBeDisabled();
  await expect(player.getByLabel("Or create a crew")).toBeVisible();
  await player.getByRole("button", { name: "Keep current crew", exact: true }).click();
  await expect(player.getByLabel("Or create a crew")).toHaveCount(0);
  await player.getByRole("button", { name: "Change crew", exact: true }).click();
  await player.getByLabel("Or create a crew").fill("New crew");
  await player.getByRole("button", { name: "Create crew", exact: true }).click();
  await expect(
    player.getByRole("heading", { name: "Your crew: New crew", exact: true }),
  ).toBeVisible();
  await expect(player.getByLabel("Or create a crew")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "View New crew", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start expedition" })).toBeEnabled();
  await page.getByRole("button", { name: "Start expedition" }).click();
  await expect(player.locator(".phone-panel")).toHaveAttribute("data-phase", "route");
});

async function manualPlayground(page: import("@playwright/test").Page, scenario = "fresh") {
  await page.goto("/#/test");
  await page.getByRole("button", { name: "Join test match", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start expedition", exact: true })).toBeEnabled();
  await page.getByText("Test debugger", { exact: true }).click();
  if (scenario !== "fresh") {
    await page.getByLabel("Scenario", { exact: true }).selectOption(scenario);
    await page.getByRole("button", { name: "Load scenario" }).click();
    await expect(page.locator(".phone-panel")).toHaveAttribute("data-phase", "combat");
    await page.getByText("Test debugger", { exact: true }).click();
  }
  await page.getByLabel("Speed", { exact: true }).selectOption("manual");
  await page.getByRole("button", { name: "Manual all characters" }).click();
}

test("teacher removes crews and players while students recover to the correct lobby step", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Host a match" }).click();
  const opened = page.waitForEvent("popup");
  await page.getByRole("link", { name: "Join as player" }).click();
  const student = await opened;
  await student.getByLabel("Your nickname").fill("Alex");
  await student.getByRole("button", { name: "Join as player" }).click();
  await student.getByLabel("Or create a crew").fill("Explorers");
  await student.getByRole("button", { name: "Create crew", exact: true }).click();
  await page.getByRole("button", { name: "View Explorers", exact: true }).click();
  const roster = page.getByRole("dialog", { name: "Manage crews and players" });
  await roster.getByRole("button", { name: "Delete crew", exact: true }).click();
  await roster.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    student.getByRole("heading", { name: "Your crew: Explorers", exact: true }),
  ).toBeVisible();
  await roster.getByRole("button", { name: "Delete crew", exact: true }).click();
  await roster.getByRole("button", { name: "Confirm removal" }).click();
  await expect(
    student.getByRole("heading", { name: "Choose your crew", exact: true }),
  ).toBeVisible();
  await student.reload();
  await expect(
    student.getByRole("heading", { name: "Choose your crew", exact: true }),
  ).toBeVisible();
  await roster.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Manage crews", exact: true }).click();
  await roster.getByRole("button", { name: "Remove Alex", exact: true }).click();
  await roster.getByRole("button", { name: "Confirm removal" }).click();
  await expect(student.getByLabel("Your nickname")).toBeVisible();
  await student.reload();
  await expect(student.getByLabel("Your nickname")).toBeVisible();
  await student.getByLabel("Your nickname").fill("Alex again");
  await student.getByRole("button", { name: "Join as player" }).click();
  await expect(
    student.getByRole("heading", { name: "Choose your crew", exact: true }),
  ).toBeVisible();
  await expect(roster).toContainText("Alex again");
});

test("combat targets are on the scene and four heroes fit desktop and mobile", async ({ page }) => {
  await manualPlayground(page, "split");
  const input = await page.evaluate(
    () => JSON.parse(localStorage.getItem("dungeon-test-bootstrap") ?? "null") as BootstrapInput,
  );
  const response = await page.request.post("/api/test", { data: input });
  const { code } = (await response.json()) as { code: string };
  await page.evaluate(
    ({ code, secret }) => localStorage.setItem(`siege-session:${code}:player`, secret),
    { code, secret: input.players[6].bootstrapSecret },
  );
  await page.goto(`/#/room/${code}`);
  await expect(page.locator(".combat-console")).toBeVisible();
  const takeover = page.getByRole("button", { name: "Take control", exact: true });
  if (await takeover.isVisible()) await takeover.click();
  const change = page.getByRole("button", { name: "Change", exact: true });
  if (await change.isVisible()) await change.click();
  await page.getByRole("button", { name: "Protect", exact: true }).click();
  await expect(page.locator(".scene-target[data-hero-id]:enabled")).toHaveCount(4);
  await page
    .locator(".scene-targets")
    .getByRole("button", { name: /Explorer 4.2/ })
    .click();
  await page.getByRole("button", { name: /(?:Ready|Play turn) · Protect Explorer 4.2/ }).click();
  await expect(page.locator(".own-order button")).toHaveAccessibleName(/Protect Explorer 4.2/);
  await page.getByRole("button", { name: "Change", exact: true }).click();
  await page.getByRole("button", { name: "Attack", exact: true }).click();
  await page.getByRole("button", { name: /(?:Ready|Play turn) · Attack/ }).click();
  await expect(page.locator(".own-order button")).toHaveAccessibleName(/Attack/);
  await page.getByRole("button", { name: /^Backpack/ }).click();
  await expect(page.getByRole("dialog", { name: "Backpack" })).toBeVisible();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 360, height: 740 },
  ]) {
    await page.setViewportSize(viewport);
    await page.screenshot({ path: `test-results/combat-${viewport.width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      await page
        .locator(".confirm-action")
        .evaluate((el) => el.getBoundingClientRect().bottom <= innerHeight),
    ).toBe(true);
    await expect(page.locator(".phone-panel canvas")).toHaveCount(1);
  }
});

test("host and projector show every crew in rows and preserve details across resizing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await manualPlayground(page);
  await page.getByRole("button", { name: "Start expedition", exact: true }).click();
  await page.getByRole("button", { name: "Next phase" }).click();
  await page.getByRole("button", { name: "Next phase" }).click();
  const input = await page.evaluate(
    () => JSON.parse(localStorage.getItem("dungeon-test-bootstrap") ?? "null") as BootstrapInput,
  );
  const response = await page.request.post("/api/test", { data: input });
  const { code } = (await response.json()) as { code: string };
  await page.evaluate(
    ({ code, secret }) => localStorage.setItem(`siege-session:${code}:host`, secret),
    { code, secret: input.hostSecret },
  );
  await page.goto(`/#/host/${code}`);
  const board = page.locator(".expedition-board");
  await expect(board.locator(".expedition-heading")).toContainText("Two chapters");
  await expect(board.locator(".board-panel .crew-stage")).toHaveCount(4);
  await expect(board.getByRole("button", { name: /^(Previous|Next) crews$/ })).toHaveCount(0);
  const stages = board.locator(".board-panel .crew-stage");
  const positions = await stages.evaluateAll((nodes) =>
    nodes.map((node) => ({ x: node.getBoundingClientRect().x, y: node.getBoundingClientRect().y })),
  );
  expect(positions[0].y).toBe(positions[1].y);
  expect(positions[2].y).toBeGreaterThan(positions[0].y);
  expect(positions[2].x).toBe(positions[0].x);
  const four = board
    .locator(".crew-stage")
    .filter({ has: page.getByRole("button", { name: "View Crew 4", exact: true }) });
  await four.scrollIntoViewIfNeeded();
  await expect(four.locator("canvas")).toBeVisible();
  const canvas = await four.locator("canvas").elementHandle();
  for (const viewport of [
    { width: 360, height: 800 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(stages).toHaveCount(4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(await canvas?.evaluate((node) => node.isConnected)).toBe(true);
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.screenshot({ path: "test-results/host-crew-grid.png", fullPage: true });
  await board.getByRole("button", { name: "Log", exact: true }).click();
  await expect(board.locator(".event-log")).toBeVisible();
  await expect(board.locator(".crew-grid")).not.toBeVisible();
  await expect(board.locator(".expedition-heading")).toBeVisible();
  await board.getByRole("button", { name: "Dungeon", exact: true }).click();
  await expect(board.getByRole("button", { name: "View Crew 4", exact: true })).toBeVisible();
  await board.getByRole("button", { name: "View Crew 4", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("dialog canvas")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const projector = await page.context().newPage();
  await projector.goto(`/#/board/${code}`);
  await expect(projector.locator(".crew-grid .crew-stage")).toHaveCount(4);
  await expect(projector.getByRole("button", { name: /^(Previous|Next) crews$/ })).toHaveCount(0);
  await projector.close();
});

test("team door highlighting distinguishes the crew result from a personal vote", async ({
  page,
}) => {
  await manualPlayground(page);
  await page.getByRole("button", { name: "Start expedition", exact: true }).click();
  await page.locator(".team-switcher button").nth(6).click();
  const doors = page.locator(".phone-panel .map-node.reachable");
  await doors.first().click();
  await page.getByRole("button", { name: "Ready to travel", exact: true }).click();
  await expect(doors.first()).toHaveClass(/crew-choice/);
  await expect(doors.first()).toHaveClass(/own-vote/);
  await page.locator(".team-switcher button").nth(7).click();
  await expect(doors.first()).toHaveClass(/crew-choice/);
  await expect(doors.first()).not.toHaveClass(/own-vote/);
  await doors.first().click();
  await page.getByRole("button", { name: "Ready to travel", exact: true }).click();
  await expect(doors.first()).toHaveAttribute("aria-label", /2 votes/);
  await page.screenshot({ path: "test-results/team-door-votes.png", fullPage: true });
});
