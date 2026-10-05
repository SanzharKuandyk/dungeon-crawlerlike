import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { io, type Socket } from "socket.io-client";
import type { Ack, ClientEvents, ServerEvents } from "../../src/shared/protocol.js";
import type { RoomView } from "../../src/shared/view-types.js";
import { fixture, identity, noOverflow } from "../fixtures/layout-fixture.js";

async function advance(url: string, code: string, token: string) {
  const socket: Socket<ServerEvents, ClientEvents> = io(url);
  try {
    await new Promise<void>((resolve) => socket.once("connect", resolve));
    const auth = await new Promise<Parameters<Ack>[0]>((resolve) =>
      socket.emit("session:resume", { code, token, takeover: true }, resolve),
    );
    expect(auth.ok).toBe(true);
    const view = await new Promise<RoomView>((resolve, reject) =>
      socket.emit("session:sync", { pending: [] }, (result) =>
        result.ok ? resolve(result.value.view) : reject(new Error(result.message)),
      ),
    );
    const result = await new Promise<Parameters<Ack>[0]>((resolve) =>
      socket.emit(
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
    if (!result.ok) throw new Error(`${result.code}: ${result.message}`);
  } finally {
    socket.disconnect();
  }
}

test("living ally revives the same hero and the short phone can reach recovery", async ({
  page,
  browser,
  baseURL,
}) => {
  if (!baseURL) throw new Error("URL required");
  const { data, input } = await fixture(page, baseURL, false, "revival");
  const dead = await identity(
    browser,
    baseURL,
    data.code,
    input.players[1].bootstrapSecret,
    "player",
  );
  const ally = await identity(
    browser,
    baseURL,
    data.code,
    input.players[2].bootstrapSecret,
    "player",
  );
  try {
    await dead.page.setViewportSize({ width: 360, height: 640 });
    await dead.page
      .getByRole("button", { name: "Request revival", exact: true })
      .scrollIntoViewIfNeeded();
    await dead.page.getByRole("button", { name: "Request revival", exact: true }).click();
    await expect(dead.page.getByRole("button", { name: "Teammates notified" })).toBeVisible();
    await expect(dead.page.getByRole("button", { name: "Revive ally", exact: true })).toHaveCount(
      0,
    );
    await ally.page.setViewportSize({ width: 360, height: 640 });
    const revive = ally.page.locator(".ally-recovery button").first();
    await expect(revive).toContainText("asked for help");
    await revive.scrollIntoViewIfNeeded();
    await revive.click();
    await expect(ally.page.getByRole("dialog")).toContainText("Pay 12 shared gold");
    await expect(
      ally.page.getByRole("button", { name: "Revive ally", exact: true }),
    ).toBeInViewport();
    await ally.page.getByRole("button", { name: "Revive ally", exact: true }).click();
    await expect(dead.page.locator(".ally-recovery")).toHaveCount(0);
    await expect(dead.page.locator(".player-vitals")).toContainText("12/24");
    await dead.page.reload();
    await expect(dead.page.locator(".player-vitals")).toContainText("12/24");
    await noOverflow(dead.page);
  } finally {
    await dead.context.close();
    await ally.context.close();
  }
});

test("Haste commits two visible actions and populated builds remain inspectable", async ({
  page,
  browser,
  baseURL,
}) => {
  if (!baseURL) throw new Error("URL required");
  const { data, input } = await fixture(page, baseURL, false, "combo");
  const actor = await identity(
    browser,
    baseURL,
    data.code,
    input.players[6].bootstrapSecret,
    "player",
  );
  try {
    await mkdir(".Codex/ui-v5", { recursive: true });
    for (const size of [
      { width: 360, height: 800 },
      { width: 360, height: 640 },
      { width: 667, height: 375 },
      { width: 844, height: 390 },
      { width: 768, height: 1024 },
      { width: 1366, height: 768 },
    ]) {
      await actor.page.setViewportSize(size);
      await noOverflow(actor.page);
      await expect(actor.page.locator(".confirm-action")).toBeInViewport();
      await actor.page.screenshot({ path: `.Codex/ui-v5/combo-${size.width}.png` });
    }
    await actor.page.setViewportSize({ width: 360, height: 800 });
    const canvas = await actor.page.locator("canvas").elementHandle();
    const footer = actor.page.locator(".battle-console > .decision-footer");
    const before = await footer.boundingBox();
    const enemy = actor.page.locator(".scene-target[data-enemy-id]").nth(1);
    await enemy.click();
    await expect(enemy).toHaveAttribute("aria-pressed", "true");
    await expect(actor.page.locator(".order-preview")).toContainText("Supporter");
    await expect(actor.page.locator(".turn-ready")).toHaveText("0/4");
    await actor.page.locator(".scene-build").first().click();
    await expect(actor.page.getByRole("dialog")).toContainText("Last Stand");
    await expect(actor.page.getByRole("dialog")).toContainText("Shaken");
    await actor.page.keyboard.press("Escape");
    await actor.page.getByRole("button", { name: /Haste · once/ }).click();
    await actor.page.getByRole("button", { name: "Blast", exact: true }).click();
    await actor.page.getByRole("button", { name: "Action 2", exact: true }).click();
    expect((await footer.boundingBox())?.y).toBe(before?.y);
    expect(await canvas?.evaluate((el) => el === document.querySelector("canvas"))).toBe(true);
    await actor.page.getByRole("button", { name: "Attack", exact: true }).click();
    await actor.page.locator(".confirm-action").click();
    await expect(
      actor.page.locator(".crew-orders").getByRole("button", { name: /Blast.*→ Attack/ }),
    ).toBeVisible();
    await advance(baseURL, data.code, input.hostSecret);
    await expect(actor.page.locator(".phone-panel")).toHaveAttribute("data-phase", "combat-reveal");
    await advance(baseURL, data.code, input.hostSecret);
    await advance(baseURL, data.code, input.hostSecret);
    await expect(actor.page.locator(".phone-panel")).toHaveAttribute("data-phase", "combat");
    await expect(actor.page.getByRole("button", { name: /Haste · once/ })).toHaveCount(0);
  } finally {
    await actor.context.close();
  }
});

test("coin commitments are observable and siege returns crews to their saved encounter", async ({
  page,
  browser,
  baseURL,
}) => {
  if (!baseURL) throw new Error("URL required");
  for (const scenario of ["coin", "siege"]) {
    const { data, input } = await fixture(page, baseURL, false, scenario);
    const actor = await identity(
      browser,
      baseURL,
      data.code,
      input.players[0].bootstrapSecret,
      "player",
    );
    const host = await identity(browser, baseURL, data.code, input.hostSecret, "host");
    try {
      await actor.page.setViewportSize({ width: 360, height: 800 });
      await host.page.setViewportSize({ width: 1366, height: 768 });
      if (scenario === "coin") {
        await actor.page
          .getByRole("button", { name: "Toss heads · 12 stake", exact: true })
          .click();
        await actor.page.getByRole("button", { name: "Commit choice", exact: true }).click();
        await expect(host.page.locator(".crew-exploration").first()).toContainText(
          "heads · 12 stake · gold",
        );
        await advance(baseURL, data.code, input.hostSecret);
        await expect(actor.page.locator(".coin-outcome")).toContainText(/Won|Lost/);
        await host.page.screenshot({ path: ".Codex/ui-v5/host-coin.png" });
        await actor.page.screenshot({ path: ".Codex/ui-v5/coin-360.png" });
      } else {
        await expect(actor.page.getByRole("region", { name: "Class siege" })).toBeVisible();
        await actor.page.getByRole("button", { name: "attack · +24", exact: true }).click();
        await expect(host.page.locator(".shared-activity")).toContainText("attack");
        await actor.page.screenshot({ path: ".Codex/ui-v5/siege-360.png" });
        for (let n = 0; n < 7; n++) await advance(baseURL, data.code, input.hostSecret);
        await expect(actor.page.getByRole("region", { name: "Class siege" })).toHaveCount(0);
        await expect(actor.page.locator(".phone-panel")).toHaveAttribute("data-phase", "combat");
        await expect(actor.page.locator(".phone-panel canvas")).toHaveCount(1);
      }
      await noOverflow(actor.page);
      await noOverflow(host.page);
    } finally {
      await actor.context.close();
      await host.context.close();
    }
  }
});
