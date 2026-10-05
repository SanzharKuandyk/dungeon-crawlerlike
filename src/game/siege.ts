import type { MatchState } from "../shared/game-types.js";
import type { SiegeRole } from "../shared/siege-types.js";
import { applyStress, resolvePanic } from "./combat/conditions.js";
import { preventDeath } from "./combat/protection.js";
import { addItem } from "./inventory/inventory.js";
import { goldReward } from "./progression/economy.js";
import { expeditionEvent } from "./progression/events.js";
export function createSiege(state: MatchState): import("../shared/siege-types.js").SiegeState {
  const power = state.heroes.reduce((n, h) => n + h.power, 0);
  return {
    id: "siege-1",
    phase: "intro",
    round: 1,
    choices: {},
    meters: { attack: 0, protect: 0, supply: 0 },
    goals: { attack: 3 * power, protect: power, supply: power },
    success: false,
    settled: false,
    resolvedRounds: [],
  };
}
export function resolveSiegeRound(state: MatchState) {
  const siege = state.siege;
  if (siege?.phase !== "choice") throw new Error("Siege choice is closed.");
  if (siege.resolvedRounds.includes(siege.round)) return;
  siege.resolvedRounds.push(siege.round);
  for (const hero of state.heroes) {
    const role: SiegeRole =
      hero.status === "dead" ? "supply" : (siege.choices[hero.playerId] ?? "supply");
    siege.meters[role] += 2 * hero.power;
  }
  siege.success = (["attack", "protect", "supply"] as const).every(
    (role) => siege.meters[role] >= siege.goals[role],
  );
  if (!siege.success && siege.round < 3) return;
  if (siege.settled) return;
  siege.settled = true;
  for (const crew of state.crews)
    if (siege.success) {
      crew.economy = goldReward(crew, 12);
      for (const hero of state.heroes.filter((h) => h.crewId === crew.id))
        hero.inventory = addItem(hero.inventory, {
          id: `siege:${state.id}:${hero.id}`,
          kind: "draught",
          count: 1,
        });
      expeditionEvent(
        state,
        crew.id,
        { kind: "crew", actor: crew.id, crew },
        `${crew.name}: siege won · 12 gold and a healing draught for every member.`,
        0.85,
        "siege-result",
      );
    }
  if (!siege.success)
    for (const hero of state.heroes) {
      applyStress(hero, 2);
      if (hero.status === "alive") {
        resolvePanic(hero);
        preventDeath(hero);
        if (hero.hp === 0) hero.status = "dead";
      } else hero.stress = Math.min(9, hero.stress);
      expeditionEvent(
        state,
        hero.crewId,
        { kind: "hero", actor: hero.id, hero },
        `${state.players.find((p) => p.id === hero.playerId)?.name}: siege failed · +2 stress.`,
        0.85,
        "siege-result",
      );
    }
}
