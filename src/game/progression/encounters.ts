import DEFAULT_BALANCE from "../../../content/dungeon/balance.json" with { type: "json" };
import DEFAULT_PATTERNS from "../../../content/dungeon/enemies.json" with { type: "json" };
import type { EnemyInstance } from "../../shared/encounter-types.js";
import type { EnemyPatternId, EnemyPatterns } from "../../shared/enemy-content-types.js";
import type { MatchState, RoomEncounter } from "../../shared/game-types.js";
import type { MapNode } from "../../shared/map-types.js";
import { publishIntents } from "../combat/enemy-patterns.js";
import { createShop } from "../inventory/shops.js";
import { goldReward } from "./economy.js";
import { grantEquipmentOffers } from "./equipment-rewards.js";
import { beginCrewResolution, expeditionEvent } from "./events.js";

export function refreshEncounter(enemy: RoomEncounter) {
  enemy.hp = enemy.enemies.reduce((n, e) => n + e.hp, 0);
  enemy.maxHp = enemy.enemies.reduce((n, e) => n + e.maxHp, 0);
  enemy.block = enemy.enemies.reduce((n, e) => n + e.block, 0);
}
export function spawnEncounter(state: MatchState, crewId: string, node: MapNode) {
  const p = state.crewProgress[crewId],
    crew = state.crews.find((c) => c.id === crewId);
  if (!crew || !["battle", "elite", "boss"].includes(node.kind))
    throw new Error("Not a combat node.");
  const kind = node.kind as "battle" | "elite" | "boss";
  const prior = state.encounters.find((e) => e.nodeId === node.id && e.crewIds.includes(crewId));
  const power = state.heroes.filter((h) => h.crewId === crewId).reduce((n, h) => n + h.power, 0);
  const rules = state.content.balance ?? DEFAULT_BALANCE;
  const hp =
    (kind === "boss"
      ? rules.bossHealthBase + 2 * p.chapter
      : (kind === "elite" ? rules.eliteHealthBase : rules.ordinaryHealthBase) + p.chapter) * power;
  const roles: EnemyInstance["role"][] =
    kind === "boss"
      ? [p.chapter === 1 ? "guard" : "devourer"]
      : p.chapter === 1 && node.row <= 2
        ? [node.row === 1 ? "raider" : "guard"]
        : kind === "elite"
          ? ["guard", "supporter", "whisperer"]
          : node.room.family === "devourer"
            ? ["devourer", "raider"]
            : node.room.family === "seer"
              ? ["whisperer", "supporter"]
              : ["guard", "raider"];
  const id = `${node.id}:${crewId}`;
  const patterns = state.content.enemyPatterns ?? (DEFAULT_PATTERNS as EnemyPatterns);
  const patternIds: EnemyPatternId[] =
    kind === "boss" ? [p.chapter === 1 ? "iron-warden" : "hollow-regent"] : [...new Set(roles)];
  const enemies: EnemyInstance[] = roles.map((role, index) => {
    const health = Math.floor(hp / roles.length) + (index < hp % roles.length ? 1 : 0);
    return {
      id: `${id}:enemy:${index}`,
      role,
      name: kind === "boss" ? node.room.name : patterns[role].name,
      family:
        role === "devourer"
          ? "devourer"
          : role === "whisperer" || role === "supporter"
            ? "seer"
            : "sentinel",
      hp: health,
      maxHp: health,
      block: 0,
      effects: [],
      intent: { moveId: "", name: "", targets: [], blockGain: 0, recipientEnemyId: null },
    };
  });
  const enemy: RoomEncounter = {
    id,
    rules: structuredClone(rules),
    patterns: Object.fromEntries(
      patternIds.map((patternId) => [patternId, structuredClone(patterns[patternId])]),
    ),
    definition: node.room,
    crewIds: [crewId],
    enteringPower: { [crewId]: power },
    spawnPower: power,
    hp,
    maxHp: hp,
    enemies,
    status: "active",
    contribution: {},
    purseAwarded: false,
    chapter: p.chapter,
    block: 0,
    bossPhase: 1,
    pendingBossPhase: 1,
    attempt: (prior?.attempt ?? 0) + 1,
    nodeId: node.id,
    kind,
    pilfered: prior?.pilfered ?? [],
  };
  if (kind === "boss" && prior && prior.status !== "defeated") {
    enemy.enemies = prior.enemies.map((e) => ({ ...structuredClone(e), block: 0, effects: [] }));
    enemy.bossPhase = prior.pendingBossPhase;
    enemy.pendingBossPhase = prior.pendingBossPhase;
    refreshEncounter(enemy);
  }
  state.encounters = state.encounters.filter((e) => e.id !== id);
  state.encounters.push(enemy);
  p.encounterId = id;
  p.turn = 1;
  p.actions = {};
  p.plans = {};
  p.withdrawVotes = {};
  for (const hero of state.heroes.filter((h) => h.crewId === crewId)) {
    hero.skillReadyTurn = 1;
    hero.encounterUses = [];
    hero.conditions.combatEffects = [];
    hero.block = 0;
    hero.nextTurnBlock = 0;
  }
  publishIntents(
    enemy,
    state.heroes.filter((h) => h.crewId === crewId),
    1,
  );
  crew.location = { kind: "room", roomId: id };
  crew.shop = null;
  expeditionEvent(
    state,
    crewId,
    { kind: "enemy", actor: null, encounter: enemy },
    `${node.room.name} awakens.`,
    0.4,
    "arrival",
  );
}
export function enterNode(state: MatchState, crewId: string, nodeId: string) {
  const p = state.crewProgress[crewId],
    map = state.chapterMaps[p.chapter - 1];
  const node = map.nodes.find((n) => n.id === nodeId),
    crew = state.crews.find((c) => c.id === crewId);
  if (!node || !crew) throw new Error("Destination not found.");
  beginCrewResolution(state, crewId);
  p.campVotes = {};
  p.nodeId = node.id;
  p.depth = node.row;
  p.encounterId = null;
  const trail = crew.mapPosition?.chapter === p.chapter ? crew.mapPosition.trail : [];
  crew.mapPosition = { chapter: p.chapter, nodeId: node.id, trail: [...trail, node.id] };
  crew.location = { kind: "camp" };
  if (["battle", "elite", "boss"].includes(node.kind)) spawnEncounter(state, crewId, node);
  else {
    if (node.kind === "treasure") completeNode(state, crewId, node.id);
    if (node.kind === "treasure" && !crew.rewardedNodeIds.includes(node.id)) {
      grantEquipmentOffers(state, crewId, node.id);
      crew.rewardedNodeIds.push(node.id);
      crew.economy = goldReward(crew, state.content.balance?.cacheReward ?? 12);
    }
    if (["merchant", "camp", "altar", "shrine"].includes(node.kind))
      crew.shop = createShop(state, crewId, node.id);
  }
  expeditionEvent(
    state,
    crewId,
    { kind: "crew", actor: crewId, crew },
    `${crew.name} enters ${node.room.name}.`,
    0.2,
    "arrival",
  );
}
export function nextCombatTurn(state: MatchState, crewId: string) {
  const p = state.crewProgress[crewId];
  p.turn++;
  p.actions = {};
  p.plans = {};
  p.withdrawVotes = {};
  for (const hero of state.heroes.filter((h) => h.crewId === crewId)) {
    hero.block = hero.nextTurnBlock;
    hero.nextTurnBlock = 0;
  }
  const enemy = state.encounters.find((e) => e.id === p.encounterId);
  if (enemy) {
    enemy.bossPhase = enemy.pendingBossPhase;
    publishIntents(
      enemy,
      state.heroes.filter((h) => h.crewId === crewId),
      p.turn,
    );
  }
}
export function completeNode(state: MatchState, crewId: string, nodeId: string) {
  const crew = state.crews.find((c) => c.id === crewId);
  if (!crew) throw new Error("Crew missing.");
  if (!crew.completedNodeIds.includes(nodeId)) crew.completedNodeIds.push(nodeId);
  state.crewProgress[crewId].completedNodeIds = [...crew.completedNodeIds];
}
