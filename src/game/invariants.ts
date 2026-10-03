import type { MatchState } from "../shared/game-types.js";
import { TEAM_COLORS } from "../shared/palette.js";

export function assertInvariants(s: MatchState) {
  const fail = (m: string) => {
    throw new Error(`Invariant: ${m}`);
  };
  const unique = (values: string[], label: string) => {
    if (new Set(values).size !== values.length) fail(label);
  };
  unique(
    s.players.map((p) => p.id),
    "players",
  );
  unique(
    s.crews.map((c) => c.id),
    "crews",
  );
  unique(
    s.crews.map((c) => c.symbol),
    "symbols",
  );
  unique(
    s.heroes.map((h) => h.playerId),
    "hero ownership",
  );
  unique(s.resolvedPhaseIds.map(String), "phase resolution");
  unique(s.usedQuestions, "questions");
  unique(s.quizDepths.map(String), "question per depth");
  if (
    !["dungeon-v1", "dungeon-v2"].includes(s.rulesVersion) ||
    !Number.isInteger(s.depth) ||
    s.depth < 1 ||
    (!s.expeditionMap && s.depth > 5) ||
    s.turn < 1 ||
    s.turn > 4
  )
    fail("progress");

  if (s.expeditionMap) {
    const map = s.expeditionMap;
    const nodes = new Map(map.nodes.map((node) => [node.id, node]));
    unique(
      map.nodes.map((node) => node.id),
      "map nodes",
    );

    if (
      map.version !== "branching-v1" ||
      map.rows !== 10 ||
      map.chapter !== Math.floor((s.depth - 1) / map.rows) + 1
    )
      fail("map chapter");

    for (const node of map.nodes) {
      if (
        node.row < 1 ||
        node.row > map.rows ||
        node.lane < 0 ||
        node.lane > 2 ||
        node.room.id !== node.id ||
        node.room.depth !== (map.chapter - 1) * map.rows + node.row ||
        (node.row < map.rows && node.nextIds.length === 0) ||
        node.nextIds.some((id) => nodes.get(id)?.row !== node.row + 1)
      )
        fail("map connections");
    }

    for (const crew of s.crews) {
      const position = crew.mapPosition;
      if (!position || crew.status === "eliminated") continue;

      if (
        position.chapter !== map.chapter ||
        (position.nodeId !== null && !nodes.has(position.nodeId)) ||
        position.trail.some(
          (id, index) =>
            !nodes.has(id) ||
            (index > 0 && !nodes.get(position.trail[index - 1])?.nextIds.includes(id)),
        ) ||
        (position.nodeId !== null && position.trail.at(-1) !== position.nodeId)
      )
        fail("crew map position");
    }
  }
  for (const c of s.crews) {
    const members = s.players.filter((p) => p.crewId === c.id);
    if (members.length < 1 || members.length > 4) fail("crew size");
    if (!TEAM_COLORS.some((v) => v.id === c.colorId)) fail("palette");
    if (
      !Number.isInteger(c.carriedTreasure) ||
      c.carriedTreasure < 0 ||
      !Number.isInteger(c.securedTreasure) ||
      c.securedTreasure < 0
    )
      fail("treasure");
    if (
      s.status !== "lobby" &&
      (members.length !== c.startingSize || members.some((p) => !c.playerIds.includes(p.id)))
    )
      fail("frozen roster");
  }
  if (s.players.some((p) => p.crewId && !s.crews.some((c) => c.id === p.crewId)))
    fail("membership");
  if (s.status !== "lobby" && s.heroes.length !== s.players.length) fail("one hero per student");
  for (const h of s.heroes) {
    if (!s.players.some((p) => p.id === h.playerId && p.crewId === h.crewId)) fail("hero owner");
    if (
      h.maxHp !== 4 * h.power ||
      !Number.isInteger(h.hp) ||
      h.hp < 0 ||
      h.hp > h.maxHp ||
      !Number.isInteger(h.stress) ||
      h.stress < 0 ||
      h.stress > 5
    )
      fail("hero bounds");
    if ((h.status === "dead") !== (h.hp === 0)) fail("permanent death");
    if (h.equipment && ![1, 2].includes(h.equipment.charges)) fail("charges");
    if (
      h.mastery &&
      (![1, 2].includes(h.mastery.rank) ||
        !Number.isInteger(h.mastery.activeFromTurn) ||
        h.mastery.activeFromTurn < 1)
    )
      fail("mastery");
  }
  for (const c of s.crews)
    if (
      s.status !== "lobby" &&
      (c.status === "eliminated") !==
        !s.heroes.some((h) => h.crewId === c.id && h.status === "alive")
    )
      fail("crew life");
  for (const e of s.encounters) {
    if (
      e.rivalry &&
      (s.expeditionFeatures !== "rivalries-v1" ||
        e.crewIds.length !== 2 ||
        (e.rivalry.winnerCrewId !== null && !e.crewIds.includes(e.rivalry.winnerCrewId)))
    )
      fail("rivalry");
    if (
      e.bodyHp < 0 ||
      e.bodyHp > e.maxBodyHp ||
      e.weakHp < 0 ||
      e.weakHp > e.maxWeakHp ||
      e.spawnPower <= 0
    )
      fail("enemy bounds");
  }
  if (s.history.some((e, i) => e.sequence !== i + 1)) fail("event sequence");
}
