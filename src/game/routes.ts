import type { Hero, MatchState } from "../shared/game-types.js";
import { beginEvents, crewEvent, enemyEvent, finalizeEvents, lockResolution } from "./events.js";
import { shuffled } from "./random.js";
import { winningRoute } from "./voting.js";
export function offerRooms(s: MatchState) {
  s.offeredRooms = shuffled(
    s.content.rooms.filter((r) => r.depth === s.depth),
    s.seed + s.depth,
  );
  s.routeVotes = {};
  s.encounters = [];
  s.before = null;
  s.events = [];
}
export function encounterFor(s: MatchState, h: Hero) {
  const c = s.crews.find((c) => c.id === h.crewId);
  return c?.location.kind === "room"
    ? s.encounters.find((e) => e.id === (c.location.kind === "room" ? c.location.roomId : ""))
    : undefined;
}
export function fighting(s: MatchState, h: Hero) {
  return h.status === "alive" && encounterFor(s, h)?.status === "active";
}
export function resolveRoutes(s: MatchState) {
  lockResolution(s);
  beginEvents(s);
  for (const c of s.crews.filter((c) => c.status === "active")) {
    c.location = { kind: "room", roomId: winningRoute(s, c.id) };
    crewEvent(
      s,
      c,
      `${c.name} enters ${s.offeredRooms.find((r) => r.id === (c.location.kind === "room" ? c.location.roomId : ""))?.name}.`,
      0.2,
      "arrival",
    );
  }
  s.encounters = s.offeredRooms.flatMap((definition) => {
    const crews = s.crews.filter(
      (c) =>
        c.location.kind === "room" && c.location.roomId === definition.id && c.status === "active",
    );
    if (!crews.length) return [];
    const enteringPower = Object.fromEntries(
      crews.map((c) => [
        c.id,
        s.heroes
          .filter((h) => h.crewId === c.id && h.status === "alive")
          .reduce((n, h) => n + h.power, 0),
      ]),
    );
    const spawnPower = Object.values(enteringPower).reduce((n, v) => n + v, 0);
    const bodyHp = spawnPower * { sentinel: 4, seer: 5, devourer: 6 }[definition.family];
    return [
      {
        id: definition.id,
        definition,
        crewIds: crews.map((c) => c.id),
        enteringPower,
        spawnPower,
        bodyHp,
        maxBodyHp: bodyHp,
        weakHp: spawnPower,
        maxWeakHp: spawnPower,
        status: "active" as const,
        contribution: {},
        purseAwarded: false,
      },
    ];
  });
  for (const e of s.encounters)
    enemyEvent(s, e, `${e.definition.name}: the ${e.definition.family} awakens.`, 0.5, "arrival");
  finalizeEvents(s);
}
