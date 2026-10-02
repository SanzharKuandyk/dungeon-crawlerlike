import type { Crew, MatchState, RoomEncounter } from "../shared/game-types.js";
import type { MapNode } from "../shared/map-types.js";
import { crewEvent, enemyEvent, heroEvent, heroName } from "./events.js";
import { shuffled } from "./random.js";
import { winningRoute } from "./voting.js";

function collectCache(s: MatchState, crew: Crew, node: MapNode) {
  const value = 6 + (s.expeditionMap?.chapter ?? 1) * 2;
  crew.carriedTreasure += value;
  crewEvent(s, crew, `${crew.name} finds ${value} carried treasure.`, 0.5, "loot");

  const kind = shuffled(["ward", "salve", "lantern"] as const, s.seed + s.depth + node.lane)[0];

  for (const hero of s.heroes.filter(
    (hero) => hero.crewId === crew.id && hero.status === "alive",
  )) {
    if (hero.equipment) continue;

    hero.equipment = { kind, charges: 2 };
    hero.equipmentActiveFromTurn = s.globalTurn + 1;
    heroEvent(s, hero, `${heroName(s, hero)} finds ${kind} equipment.`, 0.6, "cache-equipment");
  }
}

function visitShrine(s: MatchState, crew: Crew) {
  for (const hero of s.heroes.filter(
    (hero) => hero.crewId === crew.id && hero.status === "alive",
  )) {
    hero.hp = Math.min(hero.maxHp, hero.hp + hero.power);
    hero.stress = Math.max(0, hero.stress - 1);
    heroEvent(s, hero, `${heroName(s, hero)} recovers at a hidden shrine.`, 0.5, "rest");
  }
}

function spawnEncounter(s: MatchState, crew: Crew, node: MapNode): RoomEncounter {
  const chapter = s.expeditionMap?.chapter ?? 1;
  const spawnPower = s.heroes
    .filter((hero) => hero.crewId === crew.id && hero.status === "alive")
    .reduce((sum, hero) => sum + hero.power, 0);
  const multiplier = { sentinel: 4, seer: 5, devourer: 6 }[node.room.family];
  const bonus = node.kind === "elite" ? 1 : node.kind === "boss" ? 2 : 0;
  const bodyHp = Math.ceil(spawnPower * (multiplier + bonus + (chapter - 1) * 0.25));
  const id = `${node.id}:${crew.id}`;

  crew.location = { kind: "room", roomId: id };

  return {
    id,
    definition: { ...node.room },
    crewIds: [crew.id],
    enteringPower: { [crew.id]: spawnPower },
    spawnPower,
    bodyHp,
    maxBodyHp: bodyHp,
    weakHp: spawnPower,
    maxWeakHp: spawnPower,
    status: "active",
    contribution: {},
    purseAwarded: false,
    chapter,
  };
}

export function enterMapRooms(s: MatchState) {
  const map = s.expeditionMap;
  if (!map) throw new Error("This expedition has no branching map.");

  s.encounters = [];

  for (const crew of s.crews.filter((crew) => crew.status === "active")) {
    const node = map.nodes.find((node) => node.id === winningRoute(s, crew.id));
    if (!node) throw new Error("The crew has no connected destination.");

    const trail = crew.mapPosition?.chapter === map.chapter ? crew.mapPosition.trail : [];
    crew.mapPosition = { chapter: map.chapter, nodeId: node.id, trail: [...trail, node.id] };
    crew.location = { kind: "camp" };

    const discovery =
      node.kind === "event"
        ? shuffled(["battle", "treasure", "shrine"] as const, s.seed + s.depth * 31 + node.lane)[0]
        : node.kind;

    if (["battle", "elite", "boss"].includes(discovery)) {
      const encounter = spawnEncounter(s, crew, node);
      s.encounters.push(encounter);
      crewEvent(s, crew, `${crew.name} enters ${node.room.name}.`, 0.2, "arrival");
      enemyEvent(
        s,
        encounter,
        `${node.room.name}: the ${node.room.family} awakens.`,
        0.5,
        "arrival",
      );
    } else {
      crewEvent(s, crew, `${crew.name} reaches ${node.room.name}.`, 0.2, "arrival");

      if (discovery === "treasure") collectCache(s, crew, node);
      if (discovery === "shrine") visitShrine(s, crew);
    }
  }
}
