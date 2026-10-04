import type { CampChoice } from "../../shared/command-types.js";
import { CLASS_NAMES } from "../../shared/display-names.js";
import type { MatchState } from "../../shared/game-types.js";
import { applyInjury, applyStress, hasAffliction, resolvePanic } from "../combat/conditions.js";
import { calculateDamage, calculateHealing } from "../combat/damage.js";
import { preventDeath } from "../combat/protection.js";
import { addItem } from "../inventory/inventory.js";
import { nextRandom } from "../random.js";
import { goldReward } from "./economy.js";
import { completeNode } from "./encounters.js";
import { beginCrewResolution, expeditionEvent } from "./events.js";
import { applyRescue } from "./recovery.js";
export function applyCamp(state: MatchState, crewId: string, choice: CampChoice) {
  beginCrewResolution(state, crewId);
  const crew = state.crews.find((c) => c.id === crewId);
  if (!crew) throw new Error("Crew missing");
  const p = state.crewProgress[crewId];
  if (choice === "rest" && !p.recovering && p.nodeId && !p.restedNodeIds.includes(p.nodeId))
    p.restedNodeIds.push(p.nodeId);
  const heroes = state.heroes.filter((h) => h.crewId === crewId);
  if (choice === "rescue") applyRescue(state, crewId);
  if (choice === "rest")
    for (const h of heroes.filter((h) => h.status === "alive")) {
      h.hp = calculateHealing(h, 2 * h.power).hp;
      applyStress(h, -(hasAffliction(h, "haunted") ? 1 : 2));
    }
  const node = state.chapterMaps[p.chapter - 1].nodes.find((n) => n.id === p.nodeId);
  if (node && !p.recovering) completeNode(state, crewId, node.id);
  const eventChoice = ["risk", "sacrifice", "recover-health", "recover-stress"].includes(choice);
  if (eventChoice && node?.kind === "event" && !crew.rewardedNodeIds.includes(node.id)) {
    crew.rewardedNodeIds.push(node.id);
    const living = heroes.filter((h) => h.status === "alive");
    if (choice === "risk") {
      const roll = nextRandom(state.outcomeRng[crewId]);
      state.outcomeRng[crewId] = roll.state;
      const odds =
        (node.eventId === "trapped-cache" ? 0.75 : 0.5) -
        (living.some((h) => h.stress >= 7) ? 0.1 : 0);
      const success = roll.value < odds;
      if (node.eventId === "trapped-cache") {
        if (success) crew.economy = goldReward(crew, 12);
        else for (const h of living) applyInjury(h, "arm");
      } else
        for (const h of living) {
          if (success)
            h.pendingBlessings = [
              { id: `${node.id}:${h.id}:blessing`, kind: "iron-nerve", rank: 1 },
            ];
          else applyStress(h, 3);
        }
      expeditionEvent(
        state,
        crewId,
        { kind: "story", actor: null },
        `${node.room.name}: ${success ? "success" : "setback"} · roll ${Math.floor(roll.value * 100)} / ${Math.round(odds * 100)}%.`,
        0.3,
        "chance",
      );
    } else if (choice === "sacrifice")
      for (const h of living) {
        h.hp = Math.max(1, calculateDamage(h.hp, h.power).hp);
        h.inventory = addItem(h.inventory, {
          id: `${node.id}:${h.id}:gift`,
          kind: "ward-vest",
          count: 1,
        });
      }
    else
      for (const h of living) {
        if (choice === "recover-health") h.hp = calculateHealing(h, 2 * h.power).hp;
        else applyStress(h, -3);
      }
  }
  for (const h of heroes) {
    resolvePanic(h);
    preventDeath(h);
    if (h.hp === 0) h.status = "dead";
    expeditionEvent(
      state,
      crewId,
      { kind: "hero", actor: h.id, hero: h },
      `${CLASS_NAMES[h.classId]}: ${choice}.`,
      0.4,
      "camp",
    );
  }
  crew.status = heroes.some((h) => h.status === "alive") ? "active" : "eliminated";
  expeditionEvent(
    state,
    crewId,
    { kind: "crew", actor: crewId, crew },
    `${crew.name} ${choice === "rest" ? "rests" : choice === "rescue" ? "accepts rescue" : "continues"}.`,
    0.6,
    "camp",
  );
}
