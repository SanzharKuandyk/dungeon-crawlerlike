import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { fixture, identity, noOverflow } from "../fixtures/layout-fixture.js";

test("host moderates one crew and privately recovers its character on another device", async ({
  page,
  browser,
  baseURL,
}) => {
  if (!baseURL) throw new Error("No base URL");
  const { data, input } = await fixture(page, baseURL);
  const host = await identity(browser, baseURL, data.code, input.hostSecret, "host");
  const student = await identity(
    browser,
    baseURL,
    data.code,
    input.players[6].bootstrapSecret,
    "player",
  );
  const replacement = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const board = await browser.newContext();
  try {
    await expect(host.page.getByRole("button", { name: "Pause", exact: true })).toBeEnabled();
    await host.page.getByRole("button", { name: "Next crews", exact: true }).click();
    await host.page.getByLabel("Controls for Crew 4", { exact: true }).click();
    await host.page.getByRole("button", { name: "Pause crew", exact: true }).click();
    await expect(
      student.page.getByRole("heading", { name: "Expedition paused", exact: true }),
    ).toBeVisible();
    await expect(host.page.getByRole("button", { name: "Pause", exact: true })).toBeEnabled();
    await host.page.getByRole("button", { name: "Resume crew", exact: true }).click();
    await expect(student.page.locator(".confirm-action")).toBeEnabled();
    await host.page
      .getByRole("button", { name: "Reconnect Explorer 4.1 on another device", exact: true })
      .click();
    const dialog = host.page.getByRole("dialog", { name: "Reconnect player" });
    await dialog.getByRole("button", { name: "Generate recovery code" }).click();
    const code = (await dialog.locator(".recovery-code").innerText()).trim();
    const projector = await board.newPage();
    await projector.goto(`${baseURL}/#/board/${data.code}`);
    await expect(projector.locator("body")).not.toContainText(code);
    const newPhone = await replacement.newPage();
    await newPhone.goto(`${baseURL}/#/room/${data.code}`);
    await newPhone.getByText("Reconnect on a replacement device", { exact: true }).click();
    await newPhone.getByLabel("Recovery code from host").fill(code);
    await newPhone.getByRole("button", { name: "Recover character", exact: true }).click();
    await expect(newPhone.locator(".phone-panel")).toHaveAttribute("data-phase", "combat");
    await expect(newPhone.locator(".phone-panel")).toContainText("Explorer 4.1");
    await noOverflow(newPhone);
    await expect(student.page.locator(".phone-panel")).toHaveCount(0);
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await host.page.setViewportSize({ width: 1366, height: 768 });
    await noOverflow(host.page);
    await host.page.screenshot({ path: "test-results/host-moderation.png" });
  } finally {
    await host.context.close();
    await student.context.close();
    await replacement.close();
    await board.close();
  }
});

test("host recovery rotates access and leaves the expedition paused", async ({
  page,
  browser,
  baseURL,
}) => {
  if (!baseURL) throw new Error("No base URL");
  const { data } = await fixture(page, baseURL);
  await page.goto("/");
  await page.getByText("Recover a hosted room", { exact: true }).click();
  await page
    .getByLabel("Host recovery key", { exact: true })
    .fill((await readFile("data/host-access.key", "utf8")).trim());
  await page.getByLabel("Recover hosted room").fill(data.code);
  await page.getByRole("button", { name: "Recover host access", exact: true }).click();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeEnabled();
  const projector = await browser.newContext();
  try {
    const board = await projector.newPage();
    await board.goto(`${baseURL}/#/board/${data.code}`);
    await expect(board.locator(".board-screen")).toBeVisible();
  } finally {
    await projector.close();
  }
});

test("host cancels an unsettled duel through its crew menu", async ({ page, browser, baseURL }) => {
  if (!baseURL) throw new Error("No base URL");
  const { data, input } = await fixture(page, baseURL, false, "duel");
  const host = await identity(browser, baseURL, data.code, input.hostSecret, "host");
  const student = await identity(
    browser,
    baseURL,
    data.code,
    input.players[0].bootstrapSecret,
    "player",
  );
  try {
    await expect(student.page.locator(".duel-controls")).toBeVisible();
    await host.page.getByLabel("Controls for Crew 1", { exact: true }).click();
    host.page.once("dialog", (dialog) => dialog.accept());
    await host.page.getByRole("button", { name: "Cancel duel", exact: true }).click();
    await expect(student.page.locator(".duel-controls")).toHaveCount(0);
    await expect(student.page.locator(".phone-panel canvas")).toHaveCount(1);
  } finally {
    await host.context.close();
    await student.context.close();
  }
});
