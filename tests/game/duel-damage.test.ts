import { expect, it } from "vitest";
import { resolveDuel } from "../../src/game/resolve-duel.js";
import type { Duel } from "../../src/shared/duel-types.js";
import { fixture } from "../fixtures/match.js";

it("displayed damage equals actual nonlethal loss and resolution cannot repeat", () => {
  const state = fixture(2, [4, 1]);
  const defender = state.heroes[4];
  defender.hp = 5;
  const duel: Duel = {
    id: "duel",
    nodeId: "node",
    crewIds: ["c0", "c1"],
    status: "active",
    expiresAt: 0,
    remaining: null,
    votes: {},
    turn: 1,
    phase: "choice",
    actions: {},
    stakes: {},
    damage: {},
    capacity: {},
    winner: null,
    saved: {},
  };
  for (const hero of state.heroes.slice(0, 4))
    duel.actions[hero.playerId] = { kind: "feint", targetHeroId: defender.id };
  resolveDuel(state, duel);
  expect(defender.hp).toBe(1);
  const damage = state.crewProgress.c0.events.reduce(
    (sum, event) =>
      sum + (event.kind === "effect" && event.effect.type === "hit" ? event.effect.damage : 0),
    0,
  );
  expect(damage).toBe(4);
  expect(duel.damage.c0).toBe(4);
  expect(() => resolveDuel(state, duel)).toThrow("already");
});

it("solo strike overflow reaches other rivals and guard is consumed only once", () => {
  const state = fixture(2, [1, 4]);
  const [solo, ...rivals] = state.heroes;
  const duel: Duel = {
    id: "duel",
    nodeId: "node",
    crewIds: ["c0", "c1"],
    status: "active",
    expiresAt: 0,
    remaining: null,
    votes: {},
    turn: 1,
    phase: "choice",
    actions: {},
    stakes: {},
    damage: {},
    capacity: {},
    winner: null,
    saved: {},
  };
  duel.actions[solo.playerId] = { kind: "strike", targetHeroId: rivals[0].id };
  for (const rival of rivals)
    duel.actions[rival.playerId] = { kind: "strike", targetHeroId: solo.id };
  resolveDuel(state, duel);
  expect(rivals.map((hero) => hero.hp)).toEqual([1, 1, 10, 12]);
  expect(solo.hp).toBe(24);
  expect(duel.damage).toEqual({ c0: 24, c1: 24 });

  const guarded = fixture(2, [1, 4]);
  duel.actions = {};
  duel.damage = {};
  for (const rival of guarded.heroes.slice(1))
    duel.actions[rival.playerId] = { kind: "strike", targetHeroId: guarded.heroes[0].id };
  resolveDuel(guarded, duel);
  expect(guarded.heroes[0].hp).toBe(48);
  const blocked = guarded.crewProgress.c0.events.reduce(
    (sum, event) =>
      sum + (event.kind === "effect" && event.effect.type === "hit" ? event.effect.blocked : 0),
    0,
  );
  expect(blocked).toBe(24);
});
