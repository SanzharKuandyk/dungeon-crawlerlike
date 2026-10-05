import { mkdir, writeFile } from "node:fs/promises";
import { botCamp, botPlan, botPreparation, botRoute } from "../src/client/test-mode/bots.js";
import { startMatch } from "../src/game/create-match.js";
import { applyInventoryCommand } from "../src/game/inventory/equipment.js";
import { applyPurchase } from "../src/game/inventory/shops.js";
import { claimReward } from "../src/game/progression/equipment-rewards.js";
import { chapterMap } from "../src/game/progression/maps.js";
import { applyRescue, applyTreatment, reviveAlly } from "../src/game/progression/recovery.js";
import { loadContent } from "../src/server/content.js";
import { startCrews } from "../src/server/crew-clock.js";
import { advanceCrew } from "../src/server/crew-transitions.js";
import { createCrew, joinCrew, joinPlayer } from "../src/server/handlers/lobby.js";
import { createRoomManager } from "../src/server/room-manager.js";
import type { ClassId } from "../src/shared/content-types.js";
import type { PlayerRoomView } from "../src/shared/view-types.js";

const content = await loadContent();
const experimentalStress = process.argv.find((arg) => arg.startsWith("--skirmish-stress="));
if (experimentalStress && content.balance)
  content.balance.skirmishStress = Number(experimentalStress.split("=")[1]);
const compositions: ClassId[][] = [
  ...content.classes.map((c) => [c.id]),
  ["knight", "physician"],
  ["knight", "physician", "occultist"],
  ["knight", "physician", "occultist", "scavenger"],
];
const reports = [];
for (const classes of compositions) {
  const runs: {
    completed: boolean;
    bosses: number;
    rescues: number;
    healthLossPercent: number;
    gold: number;
    debt: number;
    purchases: number;
    purchasedPowerUnits: number;
    rewardValue: number;
  }[] = [];
  for (let seed = 1; seed <= 12; seed++) {
    const manager = createRoomManager(
      { save: async () => {}, load: async () => [] },
      content,
      () => 0,
    );
    const created = await manager.create("a".repeat(64), true);
    const room = manager.rooms.get(created.code);
    if (!room) throw new Error("Missing simulation room");
    room.state.seed = seed;
    room.state.outcomeSeed = seed * 719;
    room.state.rewardSeed = seed * 193;
    room.state.chapterMaps = ([1, 2] as const).map((c) => chapterMap(content, seed, c));
    room.state.expeditionMap = room.state.chapterMaps[0];
    let crewId = "";
    const players = classes.map((classId, index) => {
      const { playerId } = joinPlayer(
        room,
        `${classId}${index}`,
        index.toString(16).padStart(64, "0"),
      );
      if (!index) {
        createCrew(room, playerId, "Simulation");
        crewId = room.state.crews[0].id;
      } else joinCrew(room, playerId, crewId);
      const player = room.state.players.find((p) => p.id === playerId);
      if (player) player.classId = classId;
      return playerId;
    });
    startMatch(room.state);
    room.state.learningEnabled = false;
    startCrews(room, 0);
    const run = room.runs[crewId];
    let rescues = 0,
      healthLost = 0,
      purchases = 0,
      purchasedPowerUnits = 0,
      rewardValue = 0;
    const view = (playerId: string) => {
      room.state.revision++;
      return manager.snapshot({
        code: created.code,
        session: { role: "player", playerId },
        tokenHash: null,
        readOnly: false,
      }) as PlayerRoomView;
    };
    for (let step = 0; step < 350 && !run.finished; step++) {
      const phase = run.progress.phase.kind;
      for (const id of players) {
        let v = view(id);
        if (["result", "route", "camp"].includes(phase)) {
          const hero = room.state.heroes.find((h) => h.playerId === id);
          if (hero)
            for (const offer of room.state.rewardOffers.filter(
              (o) => o.ownerHeroId === hero.id && o.status === "pending" && !o.deferred,
            )) {
              const option = offer.options[0];
              const full = hero.inventory.backpack.length >= 6;
              claimReward(
                hero,
                offer,
                {
                  offerId: offer.id,
                  optionId: option.id,
                  disposition:
                    option.type === "equipment" && option.upgradeItemId
                      ? "upgrade"
                      : full
                        ? "leave"
                        : option.type === "supplies"
                          ? "keep"
                          : "equip",
                  replacementItemId: null,
                },
                hero.inventory.revision,
              );
              if (!full) rewardValue += 2 * hero.power;
            }
          v = view(id);
        }
        if (phase === "camp")
          for (let i = 0; i < 12; i++) {
            const op = botPreparation(v),
              hero = room.state.heroes.find((h) => h.playerId === id);
            if (!op || !hero) break;
            if (op.kind === "rescue") {
              if (room.state.heroes.every((h) => h.status === "dead"))
                applyRescue(room.state, crewId);
              rescues++;
            } else if (op.kind === "buy") {
              const price =
                room.state.crews[0].shop?.offers[hero.id].find((o) => o.id === op.offerId)?.price ??
                0;
              applyPurchase(room.state, hero, op.offerId, hero.inventory.revision);
              purchases++;
              purchasedPowerUnits += price / hero.power / classes.length;
            } else if (op.kind === "equip")
              applyInventoryCommand(
                room.state,
                hero,
                { kind: "equip", itemId: op.itemId },
                hero.inventory.revision,
              );
            else if (op.kind === "revive")
              reviveAlly(room.state, hero, op.targetHeroId, op.payment);
            else applyTreatment(room.state, hero, op.treatment);
            v = view(id);
          }
        if (phase === "route" && v.hero?.status === "alive")
          run.progress.routeVotes[id] = botRoute(v) ?? "";
        if (phase === "combat") run.progress.plans[id] = botPlan(v);
        if (phase === "camp" && v.hero?.status === "alive") {
          run.progress.campVotes[id] = botCamp(v);
        }
      }
      if (phase === "camp" && room.state.crews[0].status === "eliminated") {
        for (const id of players) run.progress.campVotes[id] = "rescue";
        rescues++;
      }
      const before = room.state.heroes.reduce((sum, h) => sum + h.hp, 0);
      advanceCrew(room, run, step * 50000);
      if (phase === "combat")
        healthLost += Math.max(0, before - room.state.heroes.reduce((sum, h) => sum + h.hp, 0));
    }
    runs.push({
      completed: run.finished,
      bosses: room.state.crews[0].bossesDefeated,
      rescues,
      healthLossPercent: (healthLost / 48) * 100,
      gold: room.state.crews[0].economy.gold,
      debt: room.state.crews[0].economy.rescueDebt,
      purchases,
      purchasedPowerUnits,
      rewardValue,
    });
  }
  const mean = (
    key:
      | "rescues"
      | "healthLossPercent"
      | "gold"
      | "debt"
      | "purchases"
      | "purchasedPowerUnits"
      | "rewardValue",
  ) => Number((runs.reduce((sum, r) => sum + r[key], 0) / runs.length).toFixed(2));
  reports.push({
    classes,
    runs: runs.length,
    completionRate: runs.filter((r) => r.completed).length / runs.length,
    meanRescues: mean("rescues"),
    meanEquipmentRewardValuePerCrew: mean("rewardValue"),
    meanHealthLossPercent: mean("healthLossPercent"),
    meanGold: mean("gold"),
    meanDebt: mean("debt"),
    meanPurchases: mean("purchases"),
    meanPurchasedPowerUnitsPerStudent: mean("purchasedPowerUnits"),
  });
}
await mkdir("test-results", { recursive: true });
await writeFile(
  "test-results/balance-result.json",
  JSON.stringify(
    {
      skirmishStress: content.balance?.skirmishStress,
      policy:
        "Projected-information recovery, supplies and safe-route bots; 12 seeds per composition",
      reports,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify(reports, null, 2));
