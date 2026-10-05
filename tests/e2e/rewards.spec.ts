import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { fixture, identity, noOverflow } from "../fixtures/layout-fixture.js";

const sizes = [
  { width: 360, height: 800 },
  { width: 667, height: 375 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1366, height: 768 },
];
test("personal reward, committed equip feedback, crew readiness and reachable footer across devices", async ({
  page,
  browser,
  baseURL,
}) => {
  if (!baseURL) throw new Error("URL required");
  const { data, input } = await fixture(page, baseURL, false, "reward");
  const actor = await identity(
    browser,
    baseURL,
    data.code,
    input.players[0].bootstrapSecret,
    "player",
  );
  try {
    await expect(
      actor.page.getByRole("dialog", { name: "Choose your reward", exact: true }),
    ).toBeVisible();
    const canvas = await actor.page.locator(".phone-panel canvas").elementHandle();
    const choices = await actor.page.locator(".reward-options").innerText();
    await actor.page.getByRole("button", { name: "Close dialog", exact: true }).click();
    await expect(actor.page.getByRole("dialog")).toHaveCount(0);
    await actor.page.getByRole("button", { name: "Choose reward", exact: true }).click();
    await expect(actor.page.locator(".reward-options")).toContainText(
      choices.replace(/\s+/g, " ").trim(),
    );
    expect(
      await canvas?.evaluate((el) => el === document.querySelector(".phone-panel canvas")),
    ).toBe(true);
    await mkdir(".Codex/ui-v4", { recursive: true });
    for (const size of sizes) {
      await actor.page.setViewportSize(size);
      await noOverflow(actor.page);
      await expect(actor.page.locator(".reward-options")).toBeVisible();
      await expect(actor.page.locator(".reward-detail")).toBeVisible();
      const leave = actor.page.getByRole("button", { name: "Leave reward", exact: true });
      await expect(leave).toBeInViewport();
      await expect(
        actor.page.getByRole("button", { name: "Decide later", exact: true }),
      ).toHaveCount(0);
      await expect(
        actor.page.getByRole("button", { name: "Ready to travel", exact: true }),
      ).toHaveCount(0);
      const box = await leave.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      await actor.page.screenshot({
        path: `.Codex/ui-v4/reward-${size.width}.png`,
        fullPage: true,
      });
    }
    await actor.page.setViewportSize(sizes[0]);
    await actor.page.locator(".reward-options button").first().click();
    await expect(actor.page.locator(".item-detail")).toBeVisible();
    await actor.page.getByRole("button", { name: "Equip", exact: true }).click();
    await expect(
      actor.page.locator(".transaction-feedback").filter({ hasText: "Equipped" }),
    ).toBeVisible();
    await expect(actor.page.getByRole("dialog")).toHaveCount(0);
    await actor.page.getByRole("button", { name: "Ready to travel", exact: true }).click();
    await expect(actor.page.getByRole("button", { name: "Change", exact: true })).toBeVisible();
    await actor.page.reload();
    await expect(actor.page.getByRole("button", { name: "Change", exact: true })).toBeVisible();
  } finally {
    await actor.context.close();
  }
});
test("full backpack reward stays pending until explicit replacement", async ({
  page,
  browser,
  baseURL,
}) => {
  if (!baseURL) throw new Error("URL required");
  const { data, input } = await fixture(page, baseURL, false, "reward-full");
  const actor = await identity(
    browser,
    baseURL,
    data.code,
    input.players[0].bootstrapSecret,
    "player",
  );
  try {
    await actor.page.locator(".reward-options button").first().click();
    await actor.page.getByRole("button", { name: "Store in Bag", exact: true }).click();
    await expect(actor.page.getByRole("alert")).toContainText("Backpack full");
    await actor.page.reload();
    await expect(actor.page.locator(".reward-options")).toBeVisible();
    await actor.page.locator(".reward-options button").first().click();
    await actor.page
      .getByLabel("Replace a backpack item if space is needed")
      .selectOption({ index: 1 });
    await actor.page.getByRole("button", { name: "Store in Bag", exact: true }).click();
    await expect(actor.page.locator(".transaction-feedback")).toContainText("Added to Bag");
  } finally {
    await actor.context.close();
  }
});
test("safe stop opens one service and never leaks combat outcome into shopping", async ({
  page,
  browser,
  baseURL,
}) => {
  if (!baseURL) throw new Error("URL required");
  const { data, input } = await fixture(page, baseURL, false, "shop");
  const actor = await identity(
    browser,
    baseURL,
    data.code,
    input.players[0].bootstrapSecret,
    "player",
  );
  try {
    for (const size of sizes) {
      await actor.page.setViewportSize(size);
      await noOverflow(actor.page);
      await expect(actor.page.locator(".combat-hud")).toHaveCount(0);
      await expect(actor.page.locator(".shop-stock")).toHaveCount(0);
    }
    await actor.page.getByRole("button", { name: "Supplies", exact: true }).click();
    for (const size of sizes) {
      await actor.page.setViewportSize(size);
      await noOverflow(actor.page);
      await expect(actor.page.locator(".shop-stock")).toBeVisible();
      await expect(actor.page.locator(".treatment-row")).toHaveCount(0);
      const buy = actor.page.getByRole("button", { name: /Buy/ });
      const before = await buy.boundingBox();
      await actor.page.locator(".shop-stock button").first().click();
      await expect(actor.page.getByRole("region", { name: "Selected item" })).toContainText("Heal");
      const after = await buy.boundingBox();
      expect(after?.y).toBe(before?.y);
      await expect(buy).toBeInViewport();
      await expect(
        actor.page.getByRole("button", { name: "← Services", exact: true }),
      ).toBeInViewport();
      await actor.page.screenshot({ path: `.Codex/ui-v4/compact-shop-${size.width}.png` });
    }
    await actor.page.setViewportSize(sizes[0]);
    const buy = actor.page.getByRole("button", { name: /Buy ·/ });
    const beforePurchase = await buy.boundingBox();
    await buy.click();
    await expect(actor.page.locator(".transaction-feedback")).toContainText("Added to backpack");
    expect((await buy.boundingBox())?.y).toBe(beforePurchase?.y);
    await actor.page.getByRole("button", { name: "← Services", exact: true }).click();
    await actor.page.getByRole("button", { name: "Treatment", exact: true }).click();
    await expect(actor.page.locator(".shop-stock")).toHaveCount(0);
  } finally {
    await actor.context.close();
  }
});
test("development gallery shares focusable controls and scrollable dialog", async ({ page }) => {
  await page.goto("/#/gallery");
  await expect(
    page.getByRole("heading", { name: "Interface states · development only" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open dialog", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("inventory operations stay reachable and swapped equipment returns to the backpack", async ({
  page,
  browser,
  baseURL,
}) => {
  if (!baseURL) throw new Error("URL required");
  const { data, input } = await fixture(page, baseURL, false, "reward-full");
  const actor = await identity(
    browser,
    baseURL,
    data.code,
    input.players[0].bootstrapSecret,
    "player",
  );
  try {
    await actor.page.getByRole("button", { name: "Leave reward", exact: true }).click();
    await actor.page.getByRole("button", { name: "Backpack", exact: true }).click();
    const dialog = actor.page.getByRole("dialog");
    await dialog
      .locator(".backpack-slots")
      .getByRole("button", { name: "Blade", exact: true })
      .first()
      .click();
    for (const size of sizes) {
      await actor.page.setViewportSize(size);
      await noOverflow(actor.page);
      await expect(dialog.getByRole("button", { name: "Equip", exact: true })).toBeInViewport();
      await expect(dialog.getByRole("button", { name: "Done", exact: true })).toBeInViewport();
      await actor.page.screenshot({ path: `.Codex/ui-v4/inventory-${size.width}.png` });
    }
    await actor.page.setViewportSize(sizes[0]);
    await dialog.getByRole("button", { name: "Equip", exact: true }).click();
    await expect(
      dialog.locator(".gear-slots").getByRole("button", { name: "Blade", exact: true }),
    ).toBeVisible();
    await expect(
      dialog.locator(".build-section-label").filter({ hasText: "Backpack" }),
    ).toContainText("5/6");
    await dialog
      .locator(".backpack-slots")
      .getByRole("button", { name: "Blade", exact: true })
      .first()
      .click();
    await expect(dialog.locator(".item-comparison")).toContainText("Currently equipped");
    await dialog.getByRole("button", { name: "Equip", exact: true }).click();
    await expect(dialog.locator(".transaction-feedback")).toContainText(
      "previous item added to backpack",
    );
    await expect(
      dialog.locator(".build-section-label").filter({ hasText: "Backpack" }),
    ).toContainText("5/6");
    await actor.page.reload();
    await actor.page.getByRole("button", { name: "Backpack", exact: true }).click();
    await expect(
      actor.page
        .getByRole("dialog")
        .locator(".gear-slots")
        .getByRole("button", { name: "Blade", exact: true }),
    ).toBeVisible();
    await actor.page.getByRole("button", { name: "Done", exact: true }).click();
    await actor.page.getByRole("button", { name: "Ready to travel", exact: true }).click();
    await actor.page.getByRole("button", { name: "Backpack", exact: true }).click();
    await dialog.locator(".gear-slots").getByRole("button", { name: "Blade", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Unequip", exact: true })).toBeDisabled();
    await expect(dialog.locator(".inventory-lock")).toContainText("You are Ready");
    await dialog.getByRole("button", { name: "Change", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Unequip", exact: true })).toBeEnabled();
    await dialog.getByRole("button", { name: "Unequip", exact: true }).click();
    await expect(dialog.locator(".transaction-feedback")).toContainText("Added to backpack");
    await expect(
      dialog.locator(".gear-slots").getByRole("button", { name: "Empty weapon slot", exact: true }),
    ).toBeDisabled();
  } finally {
    await actor.context.close();
  }
});
test("a spirit requests ally revival and trial reveal retains every answer option", async ({
  page,
  browser,
  baseURL,
}) => {
  if (!baseURL) throw new Error("URL required");
  for (const scenario of ["revival", "trial-reveal"]) {
    const { data, input } = await fixture(page, baseURL, false, scenario);
    const actor = await identity(
      browser,
      baseURL,
      data.code,
      input.players[1].bootstrapSecret,
      "player",
    );
    try {
      if (scenario === "revival") {
        await expect(
          actor.page.getByText("Fallen · a living teammate can revive you here."),
        ).toBeVisible();
        for (const size of sizes) {
          await actor.page.setViewportSize(size);
          await actor.page
            .getByRole("button", { name: "Request revival", exact: true })
            .scrollIntoViewIfNeeded();
          await expect(
            actor.page.getByRole("button", { name: "Request revival", exact: true }),
          ).toBeInViewport();
          await noOverflow(actor.page);
        }
        await actor.page.getByRole("button", { name: "Request revival", exact: true }).click();
        await expect(
          actor.page.getByRole("button", { name: "Teammates notified", exact: true }),
        ).toBeVisible();
      } else {
        for (const size of sizes) {
          await actor.page.setViewportSize(size);
          await noOverflow(actor.page);
          await expect(actor.page.locator(".trial-options button")).toHaveCount(4);
          await expect(actor.page.locator(".enemy-readout")).toHaveCount(0);
          await expect(actor.page.locator(".phone-panel canvas")).toHaveCount(1);
          await actor.page.locator(".trial-options button").last().scrollIntoViewIfNeeded();
          await expect(actor.page.locator(".trial-options button").last()).toBeInViewport();
          await expect(actor.page.locator(".trial-options button.correct")).toBeVisible();
          await actor.page.screenshot({ path: `.Codex/ui-v4/trial-reveal-${size.width}.png` });
        }
      }
    } finally {
      await actor.context.close();
    }
  }
});
