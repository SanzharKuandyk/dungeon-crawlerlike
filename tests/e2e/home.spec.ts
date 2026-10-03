import { expect, test } from "@playwright/test";

test("entry page stays compact and hosts in one click without a key", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("Host recovery key")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Join room", exact: true })).toBeDisabled();
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 360, height: 800 },
    { width: 667, height: 375 },
  ]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const cards = page.locator(".home-card");
    expect(await cards.nth(0).evaluate((el) => getComputedStyle(el).padding)).toBe(
      await cards.nth(1).evaluate((el) => getComputedStyle(el).padding),
    );
    expect(
      await page
        .getByRole("button", { name: "Host a match" })
        .evaluate((el) => el.getBoundingClientRect().height),
    ).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: `test-results/home-${viewport.width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  const hosting = page.getByRole("button", { name: "Host a match", exact: true });
  await hosting.hover();
  expect(await hosting.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(255, 255, 255)");
  const request = page.waitForRequest(
    (r) => r.url().endsWith("/api/rooms") && r.method() === "POST",
  );
  await hosting.click();
  expect((await request).postDataJSON()).not.toHaveProperty("installationKey");
  await expect(page.getByRole("heading", { name: "Waiting for players" })).toBeVisible();
});

test("room-code entry opens the student join screen", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Host a match", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Waiting for players" })).toBeVisible();
  const code = page.url().split("/").at(-1);
  if (!code) throw new Error("Missing code");
  await page.goto("/");
  await page.getByLabel("Room code", { exact: true }).fill(code.toLowerCase());
  await page.getByRole("button", { name: "Join room", exact: true }).click();
  await expect(page.getByLabel("Your nickname")).toBeVisible();
});
