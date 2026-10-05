import { startMatch } from "../../game/create-match.js";
import { addItem } from "../../game/inventory/inventory.js";
import { createShop } from "../../game/inventory/shops.js";
import { enterNode, refreshEncounter } from "../../game/progression/encounters.js";
import { createExploration } from "../../game/progression/exploration.js";
import { createCrewResult } from "../../game/progression/results.js";
import { awardEncounter } from "../../game/progression/rewards.js";
import type { TestScenario } from "../../shared/protocol.js";
import { enterCrew, startCrews } from "../crew-clock.js";
import { challenge, voteDuel } from "../duel-commands.js";
import { progressDuels } from "../duel-coordinator.js";
import type { StoredRoom } from "../room-types.js";
import { advanceQuestion, beginQuestion } from "../shared-event-coordinator.js";
export function applyScenario(room: StoredRoom, scenario: TestScenario, now: number) {
  if (scenario === "fresh") return;
  room.speed = "manual";
  startMatch(room.state);
  startCrews(room, now);
  for (const run of Object.values(room.runs)) {
    const p = run.progress,
      crew = room.state.crews.find((c) => c.id === run.crewId);
    if (!crew) continue;
    if (scenario === "final" || scenario === "duel") {
      p.chapter = 2;
      crew.bossesDefeated = 1;
      p.bossesDefeated = 1;
      crew.mapPosition = { chapter: 2, nodeId: null, trail: [] };
    }
    const map = room.state.chapterMaps[p.chapter - 1];
    const node = map.nodes.find((n) =>
      scenario === "final"
        ? n.kind === "boss"
        : scenario === "combo"
          ? n.kind === "elite"
          : scenario === "coin"
            ? n.kind === "event"
            : ["shop", "revival"].includes(scenario)
              ? n.kind === "merchant"
              : scenario === "duel"
                ? n.kind === "arena"
                : n.row === 1,
    );
    if (!node) throw new Error("Scenario node missing");
    if (scenario === "coin") {
      node.eventId = "coin-fountain";
      node.room.name = "Coin fountain";
    }
    enterNode(room.state, run.crewId, node.id);
    p.before = null;
    p.events = [];
    const heroes = room.state.heroes.filter((h) => h.crewId === run.crewId);
    if (scenario === "coin") p.exploration = createExploration(room.state, run.crewId, node.id);
    if (scenario === "combo") {
      heroes[0].classId = "occultist";
      heroes[0].inventory.equipment.charm = {
        id: `haste:${run.crewId}`,
        kind: "haste-charm",
        count: 1,
        rank: 2,
      };
      heroes[0].conditions.blessings = [{ kind: "last-stand", rank: 1, spent: false }];
      heroes[0].conditions.afflictions = [{ kind: "shaken" }];
      const encounter = room.state.encounters.find((e) => e.id === p.encounterId);
      if (encounter) {
        encounter.enemies[0].block = 6;
        encounter.enemies[1].effects.push({
          kind: "marked",
          magnitude: heroes[0].power,
          sourceHeroId: heroes[0].id,
          sourceActionId: "previous-turn",
          expiresAfterTurn: 2,
        });
        refreshEncounter(encounter);
      }
    }
    if (["reward", "reward-full", "result"].includes(scenario)) {
      if (scenario === "reward-full")
        for (let i = 0; heroes[0].inventory.backpack.length < 6; i++)
          heroes[0].inventory = addItem(heroes[0].inventory, {
            id: `full:${run.crewId}:${i}`,
            kind: "blade",
            count: 1,
            rank: 1,
          });
      const enemy = room.state.encounters.find((e) => e.id === p.encounterId);
      if (enemy) {
        p.before = structuredClone({ heroes, crews: [crew], encounters: [enemy] });
        enemy.kind = scenario === "result" ? "battle" : "elite";
        enemy.hp = 0;
        for (const mob of enemy.enemies) mob.hp = 0;
        enemy.status = "defeated";
        awardEncounter(room.state, run.crewId, enemy);
      }
      createCrewResult(room.state, run.crewId, "victory", "encounter");
    }
    if (scenario === "critical") {
      heroes[0].hp = heroes[0].power;
      heroes[0].stress = 9;
      if (heroes[1]) {
        heroes[1].hp = 0;
        heroes[1].status = "dead";
      }
    }
    if (scenario === "injuries") heroes[0].conditions.injuries = ["arm", "leg"];
    if (scenario === "panic") heroes[0].stress = 9;
    if (scenario === "overflow")
      for (let i = 0; i < 7; i++)
        heroes[0].inventory = addItem(heroes[0].inventory, {
          id: `overflow:${run.crewId}:${i}`,
          kind: "blade",
          count: 1,
          rank: 1,
        });
    if (scenario === "revival") {
      heroes[0].hp = 0;
      heroes[0].status = "dead";
      crew.status = heroes.some((h) => h.status === "alive") ? "active" : "eliminated";
      crew.shop = createShop(room.state, run.crewId, node.id);
    }
    if (scenario === "rescue") {
      for (const hero of heroes) {
        hero.hp = 0;
        hero.status = "dead";
      }
      crew.status = "eliminated";
      p.recovering = true;
      const enemy = room.state.encounters.find((e) => e.id === p.encounterId);
      if (enemy) {
        enemy.status = "abandoned";
        enemy.hp = 9;
        for (const [i, mob] of enemy.enemies.entries()) mob.hp = i === 0 ? 9 : 0;
      }
      crew.shop = createShop(room.state, run.crewId, node.id);
    }
    if (scenario === "boss-transition") {
      const enemy = room.state.encounters.find((e) => e.id === p.encounterId);
      if (enemy) {
        enemy.kind = "boss";
        enemy.hp = Math.floor(enemy.maxHp / 3);
        for (const [i, mob] of enemy.enemies.entries()) mob.hp = i === 0 ? enemy.hp : 0;
        enemy.pendingBossPhase = 3;
      }
    }
    enterCrew(
      room,
      run,
      {
        kind:
          scenario === "coin"
            ? "event"
            : ["reward", "reward-full", "result"].includes(scenario)
              ? "result"
              : ["shop", "duel", "revival", "rescue"].includes(scenario)
                ? "camp"
                : "combat",
      },
      now,
    );
  }
  if (scenario === "duel") {
    const [a, b] = room.state.crews;
    challenge(room, a.playerIds[0], b.id, now);
    const duel = room.duels[0];
    for (const id of [...a.playerIds, ...b.playerIds]) voteDuel(room, id, duel.id, true, now);
    progressDuels(room, now);
  }
  if (scenario === "siege") {
    room.discovery = { cause: "Crew A awakened the Gate Siege.", depth: 2, eventId: "siege-1" };
    beginQuestion(room, now);
    advanceQuestion(room, now);
  }
  if (scenario === "question" || scenario.startsWith("trial-")) {
    room.discovery = { cause: "A crew awakened the First Trial.", depth: 1 };
    beginQuestion(room, now);
    if (scenario !== "trial-intro") advanceQuestion(room, now);
    if (
      ["trial-wager", "trial-answer", "trial-reveal", "trial-reward", "trial-return"].includes(
        scenario,
      )
    )
      advanceQuestion(room, now);
    if (["trial-answer", "trial-reveal", "trial-reward", "trial-return"].includes(scenario))
      advanceQuestion(room, now);
    if (["trial-reveal", "trial-reward", "trial-return"].includes(scenario))
      advanceQuestion(room, now);
    if (["trial-reward", "trial-return"].includes(scenario)) {
      const trial = room.state.trial;
      if (trial) {
        trial.questionNumber = 2;
        for (const player of room.state.players) trial.favour[player.id] = 4;
      }
      advanceQuestion(room, now);
      if (scenario === "trial-return") advanceQuestion(room, now);
    }
  }
}
