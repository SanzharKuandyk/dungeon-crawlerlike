import { expect, it } from "vitest";
import { presentation } from "../../src/client/event-presenter.js";
import { projectRoom } from "../../src/game/projections.js";
import { resolveCombat } from "../../src/game/resolve-combat.js";
import { fixture } from "../fixtures/match.js";

const options = {
  deadline: 10000,
  remaining: null,
  phaseStartedAt: 0,
  phaseDuration: 10000,
  serverNow: 0,
  speed: "normal" as const,
  storageError: null,
  testMode: false,
  readOnly: false,
};
it("health and treasure remain at the start state until their narrated effects", () => {
  const s = fixture(1);
  s.actions["p0-0"] = { kind: "loot" };
  const r = resolveCombat(s).state;
  r.phase = { kind: "combat-reveal" };
  const v = projectRoom(r, "p0-0", false, options);
  expect(presentation(v, 0).arena.heroes[0].hp).toBe(48);
  expect(presentation(v, 5000).arena.heroes[0].hp).toBe(48);
  expect(presentation(v, 6500).arena.heroes[0].hp).toBe(36);
  expect(presentation(v, 6500).arena.crews[0].carriedTreasure).toBe(0);
  expect(presentation(v, 10000).arena).toEqual({
    heroes: r.heroes,
    crews: r.crews,
    encounters: r.encounters,
  });
  expect(r.events.map((e) => e.at)).toEqual([...r.events].map((e) => e.at).sort((a, b) => a - b));
});
it("reconnecting seeks without replaying and a pause freezes the presentation", () => {
  const s = fixture(1);
  s.actions["p0-0"] = { kind: "loot" };
  const r = resolveCombat(s).state;
  r.phase = { kind: "combat-reveal" };
  const v = projectRoom(r, null, false, options);
  expect(presentation(v, 9000).arena.crews[0].carriedTreasure).toBe(2);
  v.status = "paused";
  v.remaining = 5000;
  expect(presentation(v, 99999).arena.heroes[0].hp).toBe(48);
  expect(presentation(v, 99999, true).arena.heroes[0].hp).toBe(48);
});
it("waiting camp characters do not consume Salve or receive free healing", () => {
  const s = fixture(2);
  s.crews[0].location = { kind: "camp" };
  s.heroes[0].hp = 12;
  s.heroes[0].equipment = { kind: "salve", charges: 2 };
  const r = resolveCombat(s).state;
  expect(r.heroes[0].hp).toBe(12);
  expect(r.heroes[0].equipment?.charges).toBe(2);
});

it("presentation copies accept reactive proxies without changing their source", () => {
  const s = fixture(1);
  s.actions["p0-0"] = { kind: "loot" };
  const r = resolveCombat(s).state;
  r.phase = { kind: "combat-reveal" };
  const v = projectRoom(r, null, false, options);
  if (!v.before) throw new Error("Missing start state");
  v.before = new Proxy(v.before, {});
  v.events = v.events.map((e) => new Proxy(e, {}));
  expect(presentation(v, 10000).arena.heroes[0].hp).toBe(36);
  expect(v.before.heroes[0].hp).toBe(48);
});
it("decision snapshots omit previously presented frames while preserving the event log", () => {
  const r = resolveCombat(fixture(1)).state;
  r.phase = { kind: "question", questionId: "test-question" };
  const v = projectRoom(r, null, false, options);
  expect(v.events).toEqual([]);
  expect(v.before).toBeNull();
  expect(v.history.length).toBeGreaterThan(0);
});
