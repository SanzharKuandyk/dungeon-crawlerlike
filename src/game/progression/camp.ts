import type { CampChoice } from "../../shared/command-types.js";
import { CLASS_NAMES } from "../../shared/display-names.js";
import type { MatchState } from "../../shared/game-types.js";
import { applyStress, hasAffliction, resolvePanic } from "../combat/conditions.js";
import { calculateHealing } from "../combat/damage.js";
import { preventDeath } from "../combat/protection.js";
import { completeNode } from "./encounters.js";
import { beginCrewResolution, expeditionEvent } from "./events.js";
import { applyRescue } from "./recovery.js";
export function applyCamp(state: MatchState, crewId: string, choice: CampChoice) {
  beginCrewResolution(state, crewId);
  const crew = state.crews.find((c) => c.id === crewId);
  if (!crew) throw new Error("Crew missing");
  const p = state.crewProgress[crewId];
  if (choice === "rest") {
    if (!p.nodeId || p.restedNodeIds.includes(p.nodeId))
      throw new Error("This stop's Rest is already used.");
    p.restedNodeIds.push(p.nodeId);
  }
  const heroes = state.heroes.filter((h) => h.crewId === crewId);
  if (choice === "rescue") applyRescue(state, crewId);
  if (choice === "rest")
    for (const h of heroes.filter((h) => h.status === "alive")) {
      h.hp = calculateHealing(h, 2 * h.power).hp;
      applyStress(h, -(hasAffliction(h, "haunted") ? 1 : 2));
    }
  const node = state.chapterMaps[p.chapter - 1].nodes.find((n) => n.id === p.nodeId);
  if (node && !p.recovering) completeNode(state, crewId, node.id);
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
