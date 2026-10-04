import { startMatch } from "../../game/create-match.js";
import { addItem } from "../../game/inventory/inventory.js";
import { createShop } from "../../game/inventory/shops.js";
import { enterNode } from "../../game/progression/encounters.js";
import { createCrewResult } from "../../game/progression/results.js";
import { awardEncounter } from "../../game/progression/rewards.js";
import type { TestScenario } from "../../shared/protocol.js";
import { enterCrew, startCrews } from "../crew-clock.js";
import { challenge, voteDuel } from "../duel-commands.js";
import { progressDuels } from "../duel-coordinator.js";
import { advanceQuestion, beginQuestion } from "../question-coordinator.js";
import type { StoredRoom } from "../room-types.js";
export function applyScenario(room: StoredRoom, scenario: TestScenario, now: number) {
  if (scenario === "fresh") return;
  room.speed = "manual";
  startMatch(room.state);
  startCrews(room, now);
  for (const run of Object.values(room.runs)) {
    const p = run.progress,
      crew = room.state.crews.find((c) => c.id === run.crewId);
    if (!crew) continue;
    if (scenario === "final") {
      p.chapter = 3;
      crew.bossesDefeated = 2;
      p.bossesDefeated = 2;
      crew.mapPosition = { chapter: 3, nodeId: null, trail: [] };
    }
    const map = room.state.chapterMaps[p.chapter - 1];
    const node = map.nodes.find((n) =>
      scenario === "final"
        ? n.kind === "boss"
        : ["shop", "revival"].includes(scenario)
          ? n.kind === "merchant"
          : scenario === "duel"
            ? n.kind === "arena"
            : n.row === 1,
    );
    if (!node) throw new Error("Scenario node missing");
    enterNode(room.state, run.crewId, node.id);
    p.before = null;
    p.events = [];
    const heroes = room.state.heroes.filter((h) => h.crewId === run.crewId);
    if (["reward", "reward-full", "result"].includes(scenario)) {
      if (scenario === "reward-full")
        for (let i = 0; heroes[0].inventory.backpack.length < 6; i++)
          heroes[0].inventory = addItem(heroes[0].inventory, {
            id: `full:${run.crewId}:${i}`,
            kind: "body-blade",
            count: 1,
          });
      const enemy = room.state.encounters.find((e) => e.id === p.encounterId);
      if (enemy) {
        p.before = structuredClone({ heroes, crews: [crew], encounters: [enemy] });
        enemy.kind = scenario === "result" ? "battle" : "elite";
        enemy.bodyHp = 0;
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
          kind: "body-blade",
          count: 1,
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
        enemy.bodyHp = 9;
      }
      crew.shop = createShop(room.state, run.crewId, node.id);
    }
    if (scenario === "boss-transition") {
      const enemy = room.state.encounters.find((e) => e.id === p.encounterId);
      if (enemy) {
        enemy.kind = "boss";
        enemy.bodyHp = Math.floor(enemy.maxBodyHp / 3);
        enemy.pendingBossPhase = 3;
      }
    }
    enterCrew(
      room,
      run,
      {
        kind: ["reward", "reward-full", "result"].includes(scenario)
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
        trial.questionNumber = 3;
        for (const player of room.state.players) trial.favour[player.id] = 4;
      }
      advanceQuestion(room, now);
      if (scenario === "trial-return") advanceQuestion(room, now);
    }
  }
}
