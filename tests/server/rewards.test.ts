import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { enterNode } from "../../src/game/progression/encounters.js";
import { createCrewResult } from "../../src/game/progression/results.js";
import { enterCrew } from "../../src/server/crew-clock.js";
import { fillMissingChoice } from "../../src/server/crew-decisions.js";
import { createRoomManager } from "../../src/server/room-manager.js";
import type { ActionResult, Receipt } from "../../src/shared/protocol.js";
import type { PlayerRoomView } from "../../src/shared/view-types.js";
import { content } from "../fixtures/match.js";
import { serverFixture } from "../fixtures/server.js";

const secret = () => randomBytes(32).toString("hex");
const ack = (send: (done: (r: ActionResult<Receipt>) => void) => void) =>
  new Promise<ActionResult<Receipt>>(send);
it("durable personal rewards survive failed saves, retries, restart and result readiness", async () => {
  const f = await serverFixture();
  try {
    const hostSecret = secret(),
      created = await f.server.manager.create(hostSecret, false, "dungeon-v5");
    const host = await f.connect(),
      a = await f.connect(),
      b = await f.connect();
    const room = () => {
      const r = f.server.manager.rooms.get(created.code);
      if (!r) throw new Error("Room missing");
      return r;
    };
    const env = (id?: string) => ({
      requestId: secret(),
      matchId: room().state.id,
      phaseId: id
        ? (room().state.crewProgress[room().state.players.find((p) => p.id === id)?.crewId ?? ""]
            ?.phaseId ?? room().state.phaseId)
        : room().state.phaseId,
    });
    await ack((done) =>
      host.emit("session:resume", { code: created.code, token: hostSecret }, done),
    );
    const joined = await ack((done) =>
      a.emit("session:join", { code: created.code, name: "Mira", bootstrapSecret: secret() }, done),
    );
    const other = await ack((done) =>
      b.emit("session:join", { code: created.code, name: "Ash", bootstrapSecret: secret() }, done),
    );
    if (!joined.ok || !other.ok || !joined.value.playerId || !other.value.playerId)
      throw new Error("Join failed");
    const id = joined.value.playerId,
      otherId = other.value.playerId;
    await ack((done) => a.emit("crew:create", { ...env(), name: "Seekers" }, done));
    const crewId = room().state.crews[0].id;
    await ack((done) => b.emit("crew:join", { ...env(), crewId }, done));
    await ack((done) => host.emit("host:control", { ...env(), command: { kind: "start" } }, done));
    await f.server.manager.transaction(created.code, (r) => {
      r.state.learningEnabled = false;
      const node = r.state.chapterMaps[0].nodes.find((n) => n.kind === "treasure");
      if (!node) throw new Error("Cache missing");
      enterNode(r.state, crewId, node.id);
      createCrewResult(r.state, crewId, "cache", "encounter");
      enterCrew(r, r.runs[crewId], { kind: "result" }, Date.now());
    });
    // Synchronization projections keep other heroes' offers private.
    const projected = f.server.manager.snapshot({
      code: created.code,
      tokenHash: null,
      session: { role: "player", playerId: id },
      readOnly: false,
    }) as PlayerRoomView;
    expect(projected.rewards).toHaveLength(1);
    expect(
      JSON.stringify(
        f.server.manager.snapshot({
          code: created.code,
          tokenHash: null,
          session: null,
          readOnly: false,
        }),
      ),
    ).not.toContain("rewardSeed");
    expect(
      JSON.stringify(
        f.server.manager.snapshot({
          code: created.code,
          tokenHash: null,
          session: { role: "host", playerId: null },
          readOnly: false,
        }),
      ),
    ).not.toContain("ownerHeroId");
    expect(await ack((done) => a.emit("result:ready", env(id), done))).toMatchObject({
      ok: false,
      code: "INVALID",
    });
    const hero = room().state.heroes.find((h) => h.playerId === id);
    if (!hero) throw new Error("Hero missing");
    const offer = projected.rewards[0];
    const input = {
      ...env(id),
      inventoryRevision: hero.inventory.revision,
      claim: {
        offerId: offer.id,
        optionId: offer.options[0].id,
        disposition: "equip" as const,
        replacementItemId: null,
      },
    };
    f.memory.setFail(true);
    expect(await ack((done) => a.emit("reward:claim", input, done))).toMatchObject({
      ok: false,
      code: "SAVE_FAILED",
    });
    expect(room().state.rewardOffers[0].status).toBe("pending");
    f.memory.setFail(false);
    await ack((done) => host.emit("host:control", { ...env(), command: { kind: "resume" } }, done));
    const claimed = await ack((done) => a.emit("reward:claim", input, done));
    expect(claimed.ok).toBe(true);
    expect(await ack((done) => a.emit("reward:claim", input, done))).toEqual(claimed);
    expect(
      await ack((done) =>
        a.emit("reward:claim", { ...input, claim: { ...input.claim, disposition: "keep" } }, done),
      ),
    ).toMatchObject({ ok: false, code: "CONFLICT" });
    expect(await ack((done) => a.emit("result:ready", env(id), done))).toMatchObject({ ok: true });
    expect(room().runs[crewId].progress.phase.kind).toBe("result");
    const before = structuredClone(room());
    const recovered = createRoomManager(f.memory.storage, content, () => Date.now() + 999000);
    await recovered.restore();
    const restored = recovered.rooms.get(created.code);
    expect(restored?.pauseReasons).toContain("server-restart");
    expect(restored?.state.rewardOffers).toEqual(before.state.rewardOffers);
    expect(restored?.state.heroes).toEqual(before.state.heroes.map((h) => h));
    expect(restored?.runs[crewId].ready).toContain(id);
    expect(restored?.processed).toEqual(before.processed);
    expect(await ack((done) => a.emit("decision:edit", env(id), done))).toMatchObject({ ok: true });
    expect(room().runs[crewId].ready).not.toContain(id);
    const otherOffer = room().state.rewardOffers.find(
      (o) => o.ownerHeroId === room().state.heroes.find((h) => h.playerId === otherId)?.id,
    );
    if (!otherOffer) throw new Error("Offer missing");
    expect(
      await ack((done) =>
        b.emit(
          "reward:claim",
          {
            ...env(otherId),
            inventoryRevision: 0,
            claim: {
              offerId: otherOffer.id,
              optionId: null,
              // @ts-expect-error Verify obsolete clients cannot defer rewards.
              disposition: "defer",
              replacementItemId: null,
            },
          },
          done,
        ),
      ),
    ).toMatchObject({ ok: false });
    expect(room().state.rewardOffers.find((o) => o.id === otherOffer.id)).toMatchObject({
      status: "pending",
      deferred: false,
    });
    // Absence still preserves offers; returning players must choose before manually readying.
    await f.server.manager.transaction(created.code, (r) => {
      fillMissingChoice(r, r.runs[crewId], otherId);
      r.runs[crewId].ready = r.runs[crewId].ready.filter((p) => p !== otherId);
    });
    expect(await ack((done) => b.emit("result:ready", env(otherId), done))).toMatchObject({
      ok: false,
      code: "INVALID",
    });
    await ack((done) =>
      b.emit(
        "reward:claim",
        {
          ...env(otherId),
          inventoryRevision: 0,
          claim: {
            offerId: otherOffer.id,
            optionId: null,
            disposition: "leave",
            replacementItemId: null,
          },
        },
        done,
      ),
    );
    await ack((done) => a.emit("result:ready", env(id), done));
    await ack((done) => b.emit("result:ready", env(otherId), done));
    expect(room().runs[crewId].progress.phase.kind).toBe("route");
    expect(room().state.rewardOffers.find((o) => o.id === otherOffer.id)).toMatchObject({
      status: "declined",
      deferred: true,
    });
    expect(room().state.rewardOffers.filter((o) => o.status === "claimed")).toHaveLength(1);
  } finally {
    await f.close();
  }
});
