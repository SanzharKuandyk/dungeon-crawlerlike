import type { ExplorationChoice, ExplorationState } from "../../shared/exploration-types.js";
import type { Hero, MatchState } from "../../shared/game-types.js";
import { applyInjury, applyStress, resolvePanic } from "../combat/conditions.js";
import { calculateHealing } from "../combat/damage.js";
import { preventDeath } from "../combat/protection.js";
import { nextRandom } from "../random.js";
import { goldReward, reserveAllowances } from "./economy.js";
import { completeNode } from "./encounters.js";
import { grantEquipmentOffers } from "./equipment-rewards.js";
import { beginCrewResolution, expeditionEvent } from "./events.js";
export function createExploration(
  state: MatchState,
  crewId: string,
  nodeId: string,
): ExplorationState {
  const crew = state.crews.find((c) => c.id === crewId);
  if (!crew) throw new Error("Exploration crew missing.");
  const rolls: ExplorationState["rolls"] = {};
  for (const hero of state.heroes.filter((h) => h.crewId === crewId)) {
    const chance = nextRandom(state.outcomeRng[crewId]),
      reward = nextRandom(chance.state);
    state.outcomeRng[crewId] = reward.state;
    rolls[hero.id] = { chance: chance.value, reward: reward.value };
  }
  return {
    nodeId,
    rolls,
    allowances: reserveAllowances(
      crew.economy.gold,
      state.heroes.filter((h) => h.crewId === crewId),
    ),
    choices: {},
    outcomes: [],
    resolved: false,
  };
}
export function chooseExploration(state: MatchState, hero: Hero, choice: ExplorationChoice) {
  const p = state.crewProgress[hero.crewId],
    event = p.exploration,
    crew = state.crews.find((c) => c.id === hero.crewId);
  const node = state.chapterMaps[p.chapter - 1].nodes.find((n) => n.id === event?.nodeId);
  if (!crew || !event || event.resolved || event.choices[hero.playerId] || node?.kind !== "event")
    throw new Error("Your event choice is already committed or unavailable.");
  if (choice.kind !== "leave") {
    const valid =
      node.eventId === "coin-fountain"
        ? choice.kind === "coin"
        : node.eventId === "trapped-cache"
          ? choice.kind === "risk"
          : node.eventId === "sacrificial-altar"
            ? choice.kind === "sacrifice"
            : ["recover-health", "recover-stress"].includes(choice.kind);
    if (!valid || (hero.status === "dead" && choice.kind !== "coin"))
      throw new Error("Choose an eligible event action.");
    if (choice.kind === "sacrifice" && hero.hp <= hero.power)
      throw new Error("The sacrifice must leave you alive.");
    if (choice.kind === "coin") {
      if ((event.allowances[hero.id] ?? 0) < hero.power || crew.economy.gold < hero.power)
        throw new Error("Not enough reserved gold for this stake.");
      crew.economy.gold -= hero.power;
      event.allowances[hero.id] -= hero.power;
    }
  }
  event.choices[hero.playerId] = choice;
}
export function resolveExploration(state: MatchState, crewId: string) {
  const p = state.crewProgress[crewId],
    event = p.exploration,
    crew = state.crews.find((c) => c.id === crewId);
  if (!event || !crew || event.resolved) throw new Error("Event already resolved.");
  beginCrewResolution(state, crewId);
  event.resolved = true;
  for (const hero of state.heroes.filter((h) => h.crewId === crewId)) {
    const choice = event.choices[hero.playerId] ?? { kind: "leave" };
    let landing: "heads" | "tails" | null = null,
      success: boolean | null = null,
      message = "Left safely.";
    if (choice.kind === "coin" || choice.kind === "risk") {
      const roll = { value: event.rolls[hero.id].chance };
      if (choice.kind === "coin") {
        landing = roll.value < 0.5 ? "heads" : "tails";
        success = landing === choice.side;
        if (success && choice.prize === "gold") {
          crew.economy = goldReward(crew, 2 * hero.power);
          message = `${landing} · won ${2 * hero.power} gold (stake ${hero.power}).`;
        } else if (success) {
          const kinds = [
            "iron-nerve",
            "opener",
            "last-stand",
            "field-medic",
            "clear-purpose",
            "second-breath",
          ] as const;
          const reward = { value: event.rolls[hero.id].reward };
          hero.pendingBlessings = [
            ...hero.pendingBlessings,
            {
              id: `${event.nodeId}:${hero.id}:coin`,
              groupId: `${event.nodeId}:${hero.id}:coin`,
              kind: kinds[Math.floor(reward.value * kinds.length)],
              rank: 1,
            },
          ];
          message = `${landing} · rank-I Blessing in Bag → Traits.`;
        } else {
          applyStress(hero, 1);
          message = `${landing} · lost ${hero.power} stake · +1 stress.`;
        }
      } else {
        const odds = hero.stress >= 7 ? 65 : 75;
        success = roll.value * 100 < odds;
        if (success) {
          crew.economy = goldReward(crew, 2 * hero.power);
          message = `Cache opened · +${2 * hero.power} gold · ${odds}% chance.`;
        } else {
          applyInjury(hero, "arm");
          message = `Trap triggered · arm injury · ${odds}% chance.`;
        }
      }
    } else if (choice.kind === "sacrifice") {
      hero.hp -= hero.power;
      grantEquipmentOffers(state, crewId, `${event.nodeId}:sacrifice:${hero.id}`, hero.id);
      message = `Paid ${hero.power} health · personal equipment choice.`;
    } else if (choice.kind === "recover-health") {
      const healed = calculateHealing(hero, 2 * hero.power);
      hero.hp = healed.hp;
      message = `Recovered ${healed.restored} health.`;
    } else if (choice.kind === "recover-stress") {
      const before = hero.stress;
      applyStress(hero, -3);
      message = `Removed ${before - hero.stress} stress.`;
    }
    if (hero.status === "alive") {
      resolvePanic(hero);
      preventDeath(hero);
      if (hero.hp === 0) hero.status = "dead";
    } else hero.stress = Math.min(9, hero.stress);
    event.outcomes.push({ heroId: hero.id, message, landing, success });
    expeditionEvent(
      state,
      crewId,
      { kind: "hero", actor: hero.id, hero, exploration: { landing, success } },
      `${state.players.find((v) => v.id === hero.playerId)?.name}: ${message}`,
      0.6,
      "event-outcome",
    );
  }
  completeNode(state, crewId, event.nodeId);
  crew.status = state.heroes.some((h) => h.crewId === crewId && h.status === "alive")
    ? "active"
    : "eliminated";
  expeditionEvent(
    state,
    crewId,
    { kind: "crew", actor: crewId, crew },
    "Event complete.",
    0.85,
    "event-result",
  );
}
