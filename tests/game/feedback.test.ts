import { expect, it } from "vitest";
import { presentation } from "../../src/client/event-presenter.js";
import { projectRoom } from "../../src/game/projections.js";
import { resolveCombat } from "../../src/game/resolve-combat.js";
import { fixture } from "../fixtures/match.js";

it("a broken Sentinel seal interrupts the published heavy strike before it hits", () => {
  const state = fixture(1);
  state.rulesVersion = "dungeon-v2";
  state.turn = 2;
  state.actions[state.players[0].id] = { kind: "attack", part: "weak-point" };
  const result = resolveCombat(state).state;
  expect(result.heroes[0].hp).toBe(state.heroes[0].hp);
  expect(result.encounters[0].weakHp).toBe(0);
  expect(
    result.events.some((event) => event.kind === "effect" && event.effect.type === "interrupt"),
  ).toBe(true);
  expect(
    result.events.filter((event) => event.kind === "effect" && event.effect.type === "hit"),
  ).toHaveLength(1);
});

it("healing names the caster and recipient and records only actual recovery", () => {
  const state = fixture(1, [2]);
  const [source, target] = state.heroes;
  source.classId = "physician";
  target.hp -= 3;
  state.actions[source.playerId] = { kind: "mend", targetHeroId: target.id };
  const result = resolveCombat(state).state;
  expect(
    result.events.find((event) => event.kind === "effect" && event.effect.type === "heal"),
  ).toMatchObject({
    actor: source.id,
    effect: { type: "heal", target: target.id, amount: 3 },
  });
});

it("health changes at impact, including reduced motion and reconnect seeks", () => {
  const state = fixture(1);
  state.actions[state.players[0].id] = { kind: "attack", part: "body" };
  const resolved = resolveCombat(state).state;
  resolved.phase = { kind: "combat-reveal" };
  const view = projectRoom(resolved, state.players[0].id, false, {
    deadline: 6000,
    remaining: null,
    phaseStartedAt: 1000,
    phaseDuration: 5000,
    serverNow: 1000,
    speed: "normal",
    storageError: null,
    testMode: false,
    readOnly: false,
  });
  expect(presentation(view, 2000).arena.heroes[0].hp).toBe(48);
  expect(presentation(view, 2999).arena.encounters[0].bodyHp).toBe(48);
  expect(presentation(view, 3000).arena.encounters[0].bodyHp).toBe(24);
  expect(presentation(view, 4000).arena.heroes[0].hp).toBe(36);
  expect(presentation(view, 4000, true).arena).toEqual(presentation(view, 4000).arena);
  expect(presentation(view, 5999).arena.heroes[0].hp).toBe(resolved.heroes[0].hp);
});
