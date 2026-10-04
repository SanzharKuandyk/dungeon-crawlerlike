import DEFAULT_BALANCE from "../../../content/dungeon/balance.json" with { type: "json" };
import type { MatchState, RoomEncounter } from "../../shared/game-types.js";
import type { MapNode } from "../../shared/map-types.js";
import { createShop } from "../inventory/shops.js";
import { goldReward } from "./economy.js";
import { grantEquipmentOffers } from "./equipment-rewards.js";
import { beginCrewResolution, expeditionEvent } from "./events.js";

export function spawnEncounter(state: MatchState, crewId: string, node: MapNode) {
  const p = state.crewProgress[crewId];
  const crew = state.crews.find((c) => c.id === crewId);
  if (!crew || !["battle", "elite", "boss"].includes(node.kind))
    throw new Error("Not a combat node.");
  const kind = node.kind as "battle" | "elite" | "boss";
  const prior = state.encounters.find((e) => e.nodeId === node.id && e.crewIds.includes(crewId));
  const power = state.heroes.filter((h) => h.crewId === crewId).reduce((n, h) => n + h.power, 0);
  const rules = state.content.balance ?? DEFAULT_BALANCE;
  const hp =
    ((kind === "boss"
      ? rules.bossHealthBase
      : kind === "elite"
        ? rules.eliteHealthBase
        : rules.ordinaryHealthBase) +
      p.chapter) *
    power;
  const id = `${node.id}:${crewId}`;
  const enemy: RoomEncounter = {
    id,
    rules: structuredClone(rules),
    definition: {
      ...node.room,
      family:
        kind === "boss"
          ? (["sentinel", "seer", "devourer"] as const)[p.chapter - 1]
          : node.room.family,
    },
    crewIds: [crewId],
    enteringPower: { [crewId]: power },
    spawnPower: power,
    bodyHp: hp,
    maxBodyHp: hp,
    weakHp: rules.sealPower * power,
    maxWeakHp: rules.sealPower * power,
    status: "active",
    contribution: {},
    purseAwarded: false,
    chapter: p.chapter,
    shield: 0,
    bossPhase: 1,
    pendingBossPhase: 1,
    attempt: (prior?.attempt ?? 0) + 1,
    nodeId: node.id,
    kind,
    pilfered: prior?.pilfered ?? [],
  };
  // Preserve boss damage so injury and debt cannot trap a crew in an unwinnable retry.
  if (kind === "boss" && prior && prior.status !== "defeated") {
    enemy.bodyHp = prior.bodyHp;
    enemy.maxBodyHp = prior.maxBodyHp;
    enemy.weakHp = prior.weakHp;
    enemy.shield = prior.shield;
    enemy.bossPhase = prior.bossPhase;
    enemy.pendingBossPhase = prior.pendingBossPhase;
    if (enemy.pendingBossPhase > enemy.bossPhase) {
      enemy.bossPhase = enemy.pendingBossPhase;
      enemy.weakHp = enemy.maxWeakHp;
    }
  }
  state.encounters = state.encounters.filter((e) => e.id !== id);
  state.encounters.push(enemy);
  p.encounterId = id;
  p.turn = 1;
  p.actions = {};
  p.withdrawVotes = {};
  for (const hero of state.heroes.filter((h) => h.crewId === crewId)) {
    hero.skillReadyTurn = 1;
    hero.encounterUses = [];
    hero.conditions.combatEffects = [];
  }
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
  const p = state.crewProgress[crewId];
  const map = state.chapterMaps[p.chapter - 1];
  const node = map.nodes.find((n) => n.id === nodeId);
  const crew = state.crews.find((c) => c.id === crewId);
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
  p.withdrawVotes = {};
  const enemy = state.encounters.find((e) => e.id === p.encounterId);
  if (enemy && enemy.pendingBossPhase > enemy.bossPhase) {
    enemy.bossPhase = enemy.pendingBossPhase;
    enemy.weakHp = enemy.maxWeakHp;
  }
}

export function completeNode(state: MatchState, crewId: string, nodeId: string) {
  const crew = state.crews.find((c) => c.id === crewId);
  if (!crew) throw new Error("Crew missing.");
  if (!crew.completedNodeIds.includes(nodeId)) crew.completedNodeIds.push(nodeId);
  state.crewProgress[crewId].completedNodeIds = [...crew.completedNodeIds];
}
