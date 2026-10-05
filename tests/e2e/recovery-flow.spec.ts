import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { io, type Socket } from "socket.io-client";
import type { Ack, ClientEvents, ServerEvents } from "../../src/shared/protocol.js";
import type { RoomView } from "../../src/shared/view-types.js";
import { fixture, identity } from "../fixtures/layout-fixture.js";

for (const method of ["rescue"] as const) {
  test(`${method} revival lets a wiped solo crew retry and fight`, async ({
    page,
    browser,
    baseURL,
  }) => {
    if (!baseURL) throw new Error("URL required");
    const { data, input } = await fixture(page, baseURL, false, "rescue");
    const host: Socket<ServerEvents, ClientEvents> = io(baseURL, { forceNew: true });
    const actor = await identity(
      browser,
      baseURL,
      data.code,
      input.players[0].bootstrapSecret,
      "player",
    );
    const ack = (send: (done: Ack) => void) =>
      new Promise<Parameters<Ack>[0]>((resolve) => send(resolve));
    async function sync() {
      return new Promise<RoomView>((resolve, reject) =>
        host.emit("session:sync", { pending: [] }, (r) =>
          r.ok ? resolve(r.value.view) : reject(new Error(r.message)),
        ),
      );
    }
    async function advance() {
      const view = await sync();
      const result = await ack((done) =>
        host.emit(
          "test:control",
          {
            requestId: randomUUID(),
            matchId: view.id,
            phaseId: view.phaseId,
            command: { kind: "advance" },
          },
          done,
        ),
      );
      expect(result.ok).toBe(true);
    }
    async function resultToNext() {
      await expect(actor.page.locator(".phone-panel")).toHaveAttribute("data-phase", "camp-reveal");
      await advance();
      await expect(actor.page.locator(".phone-panel")).toHaveAttribute("data-phase", "result");
      await actor.page.getByRole("button", { name: "Ready to travel", exact: true }).click();
      await advance();
    }
    try {
      await actor.page.setViewportSize({ width: 360, height: 800 });
      if (!host.connected) await new Promise<void>((resolve) => host.once("connect", resolve));
      expect(
        (
          await ack((done) =>
            host.emit("session:resume", { code: data.code, token: input.hostSecret }, done),
          )
        ).ok,
      ).toBe(true);
      const initial = await sync();
      const crewId = initial.players.find((p) => p.id === data.players[0].playerId)?.crewId;
      if (!crewId) throw new Error("Missing solo crew");
      const wallet = () => sync().then((v) => v.crews.find((c) => c.id === crewId)?.economy);
      await actor.page.getByRole("button", { name: "Retry / recovery", exact: true }).click();
      await actor.page.getByRole("button", { name: "Accept rescue", exact: true }).click();
      await actor.page.getByRole("button", { name: "Ready", exact: true }).click();
      await advance();
      await resultToNext();
      const economy = { gold: 12, rescueDebt: 24 };
      expect(await wallet()).toEqual(economy);
      await actor.page.reload();
      await expect(actor.page.locator(".phone-panel")).toHaveAttribute("data-phase", "camp");
      await actor.page.getByRole("button", { name: "Retry / recovery", exact: true }).click();
      await expect(
        actor.page.getByRole("button", { name: "Accept rescue", exact: true }),
      ).toHaveCount(0);
      await actor.page.getByRole("button", { name: "Retry", exact: true }).click();
      await actor.page.getByRole("button", { name: "Ready", exact: true }).click();
      await advance();
      await resultToNext();
      await expect(actor.page.locator(".phone-panel")).toHaveAttribute("data-phase", "combat");
      expect(await wallet()).toEqual(economy);
      await actor.page.getByRole("button", { name: "Attack", exact: true }).click();
      await actor.page.getByRole("button", { name: /Play turn · Attack/ }).click();
      await advance();
      await expect(actor.page.locator(".phone-panel")).toHaveAttribute(
        "data-phase",
        "combat-reveal",
      );
      await actor.page.screenshot({ path: `test-results/recovered-${method}-combat.png` });
    } finally {
      host.disconnect();
      await actor.context.close();
    }
  });
}
