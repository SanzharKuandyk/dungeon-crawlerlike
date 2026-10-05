import type { MatchState } from "../../shared/game-types.js";
import type { ResolutionContext } from "../../shared/progression-types.js";
import { planActions } from "../../shared/turn-plans.js";
import { completeNode, refreshEncounter } from "../progression/encounters.js";
import { beginCrewResolution, expeditionEvent } from "../progression/events.js";
import { createCrewResult, saveTurnSummary } from "../progression/results.js";
import { awardEncounter } from "../progression/rewards.js";
import { applySupport } from "./apply-support.js";
import { applyStress, resolvePanic, useOnce } from "./conditions.js";
import { calculateDamage, itemRank, outgoingDamage } from "./damage.js";
import { applyEnemyIntent } from "./enemy-actions.js";
import { SKILLS } from "./hero-actions.js";
import { addBlockSource, type BlockLedger, preventDeath, spendBlockSources } from "./protection.js";
import { defaultPlan, validateTurnPlan } from "./turn-plans.js";

export function resolveCombat(input: Readonly<MatchState>, context: ResolutionContext) {
  const original = input.crewProgress[context.crewId];
  if (!original) throw new Error("Crew progress missing.");
  const state: MatchState = {
    ...input,
    heroes: input.heroes.map((h) => (h.crewId === context.crewId ? structuredClone(h) : h)),
    crews: input.crews.map((c) => (c.id === context.crewId ? structuredClone(c) : c)),
    encounters: input.encounters.map((e) =>
      e.id === original.encounterId ? structuredClone(e) : e,
    ),
    crewProgress: {
      ...input.crewProgress,
      [context.crewId]: structuredClone({ ...original, before: null, events: [] }),
    },
    outcomeRng: { ...input.outcomeRng },
    rewardRng: { ...input.rewardRng },
    rewardOffers: structuredClone(input.rewardOffers),
    history: [...input.history],
  };
  const crew = state.crews.find((c) => c.id === context.crewId),
    p = state.crewProgress[context.crewId],
    encounter = state.encounters.find((e) => e.id === p.encounterId);
  if (!crew || !encounter || encounter.status !== "active") throw new Error("No active encounter.");
  beginCrewResolution(state, crew.id);
  const heroes = state.heroes.filter((h) => h.crewId === crew.id),
    living = heroes.filter((h) => h.status === "alive");
  const stressAtLock = Object.fromEntries(living.map((h) => [h.id, h.stress]));
  const locked = heroes.map((hero) => {
    let plan = p.plans[hero.playerId] ?? defaultPlan(hero);
    try {
      validateTurnPlan(state, hero, plan);
    } catch {
      plan = defaultPlan(hero);
    }
    return { hero, plan };
  });
  p.resolvedActions = Object.fromEntries(
    locked.map(({ hero, plan }) => [hero.playerId, planActions(plan)[0]]),
  );
  p.globalTurn++;
  const rotated = [
    ...locked.slice((p.turn - 1) % locked.length),
    ...locked.slice(0, (p.turn - 1) % locked.length),
  ];
  const slots = rotated.flatMap(({ hero, plan }) =>
    planActions(plan).map((action, index) => ({
      hero,
      action,
      index,
      id: `${p.phaseId}:${hero.id}:${index}`,
    })),
  );
  const withdrawn = living.filter((h) => p.withdrawVotes[h.playerId]).length > living.length / 2;
  if (withdrawn) {
    for (const hero of living) applyStress(hero, 1);
    encounter.status = "abandoned";
    crew.location = { kind: "camp" };
    expeditionEvent(
      state,
      crew.id,
      { kind: "crew", actor: crew.id, crew },
      "Withdrawn · no victory reward · +1 stress.",
      0.1,
      "withdrawal",
    );
  } else {
    const barriers = new Map(living.map((h) => [h.id, h.block]));
    const sources: BlockLedger = new Map();
    for (const hero of living) addBlockSource(sources, hero.id, "Last Stand", hero.block);
    for (const { hero, plan } of locked) {
      if (plan.kind === "hero" && plan.activation) {
        useOnce(hero, "haste");
        if (itemRank(hero.inventory.equipment.charm) === 2) {
          barriers.set(hero.id, (barriers.get(hero.id) ?? 0) + hero.power);
          hero.block = barriers.get(hero.id) ?? 0;
          addBlockSource(sources, hero.id, "Haste charm", hero.power);
        }
        expeditionEvent(
          state,
          crew.id,
          { kind: "hero", actor: hero.id, hero },
          "Haste activated · two actions this turn.",
          0.1,
          "haste",
        );
      }
    }
    for (const { hero, action, id } of slots) {
      if (action.kind === SKILLS[hero.classId])
        hero.skillReadyTurn = p.turn + (state.content.balance?.signatureCooldown ?? 2);
      applySupport(state, hero, action, barriers, sources);
      if (action.kind === "hex") {
        const target = encounter.enemies.find((e) => e.id === action.enemyId && e.hp > 0);
        if (target) {
          const previous = target.effects.find((e) => e.kind === "marked");
          if (!previous || previous.magnitude < hero.power) {
            target.effects = target.effects.filter((e) => e.kind !== "marked");
            target.effects.push({
              kind: "marked",
              sourceHeroId: hero.id,
              sourceActionId: id,
              magnitude: hero.power,
              expiresAfterTurn: p.turn + 1,
            });
          } else previous.expiresAfterTurn = Math.max(previous.expiresAfterTurn, p.turn + 1);
          expeditionEvent(
            state,
            crew.id,
            { kind: "enemy", actor: hero.id, encounter },
            `${target.name} marked · next eligible hit +${hero.power}.`,
            0.2,
            "marked",
          );
        }
      }
    }
    for (const { hero, action, id } of slots) {
      if (hero.status !== "alive" || !("enemyId" in action)) continue;
      const target = encounter.enemies.find((e) => e.id === action.enemyId && e.hp > 0);
      if (!target) {
        expeditionEvent(
          state,
          crew.id,
          { kind: "story", actor: hero.id },
          "Action cancelled: chosen enemy is already defeated.",
          0.4,
          "fizzle",
        );
        continue;
      }
      const mark = target.effects.find((e) => e.kind === "marked" && e.sourceActionId !== id);
      const base = (action.kind === "pilfer" || action.kind === "channel" ? 1 : 2) * hero.power;
      const attempted = outgoingDamage(hero, base, stressAtLock[hero.id], mark?.magnitude ?? 0);
      if (mark) target.effects = target.effects.filter((e) => e !== mark);
      useOnce(hero, "doubtful");
      useOnce(hero, "opener");
      const weapon = hero.inventory.equipment.weapon;
      const piercing = weapon?.kind === "piercing-blade" ? itemRank(weapon) * hero.power : 0;
      const blocked = Math.min(Math.max(0, attempted - piercing), target.block);
      target.block -= blocked;
      const damage = Math.min(target.hp, attempted - blocked);
      target.hp -= damage;
      refreshEncounter(encounter);
      expeditionEvent(
        state,
        crew.id,
        {
          kind: "effect",
          actor: hero.id,
          effect: {
            type: "hit",
            action: action.kind,
            target: target.id,
            part: "body",
            attempted,
            blocked,
            damage,
          },
        },
        `${target.name}: ${damage} damage · ${blocked} blocked${mark ? " · Mark combo" : ""}.`,
        0.4,
        "hit",
      );
      expeditionEvent(
        state,
        crew.id,
        { kind: "enemy", actor: hero.id, encounter },
        `${target.name}: ${target.hp} health.`,
        0.48,
        "enemy-damage",
      );
      if (target.hp === 0)
        expeditionEvent(
          state,
          crew.id,
          { kind: "story", actor: target.id },
          `${target.name} defeated · ${target.intent.name} cancelled.`,
          0.5,
          "enemy-cancelled",
        );
    }
    for (const enemy of encounter.enemies)
      enemy.effects = enemy.effects.filter(
        (e) => e.kind !== "marked" || e.expiresAfterTurn > p.turn,
      );
    applyEnemyIntent(state, encounter, living, p.turn, barriers, sources);
    for (const hero of living) {
      for (const effect of hero.conditions.combatEffects)
        if (effect.kind === "bleed") {
          const block = Math.min(barriers.get(hero.id) ?? 0, hero.power);
          barriers.set(hero.id, Math.max(0, (barriers.get(hero.id) ?? 0) - block));
          hero.block = barriers.get(hero.id) ?? 0;
          const hit = calculateDamage(hero.hp, hero.power, block);
          const absorbed = spendBlockSources(sources, hero.id, block);
          hero.hp = hit.hp;
          expeditionEvent(
            state,
            crew.id,
            {
              kind: "effect",
              actor: hero.id,
              effect: {
                type: "hit",
                action: "Bleed",
                target: hero.id,
                part: "hero",
                attempted: hero.power,
                blocked: hit.blocked,
                damage: hit.damage,
                sources: absorbed,
              },
            },
            `Bleed: ${hit.blocked} blocked${absorbed.length ? ` (${absorbed.map((s) => `${s.label} ${s.amount}`).join(" + ")})` : ""}, ${hit.damage} health damage.`,
            0.76,
            "bleed",
          );
          effect.turns--;
        }
      hero.conditions.combatEffects = hero.conditions.combatEffects.filter((e) => e.turns > 0);
    }
  }
  for (const hero of living) {
    const panic = resolvePanic(hero),
      saved = preventDeath(hero);
    if (hero.hp === 0) hero.status = "dead";
    expeditionEvent(
      state,
      crew.id,
      { kind: "hero", actor: hero.id, hero },
      `${state.players.find((v) => v.id === hero.playerId)?.name}${hero.status === "dead" ? " falls · spirit support next turn" : saved ? " survives · Second Breath" : panic ? " panics" : " finishes the turn"}.`,
      0.82,
      hero.status === "dead" ? "death" : panic ? "panic" : "conditions",
    );
  }
  if (!heroes.some((h) => h.status === "alive")) {
    crew.status = "eliminated";
    if (encounter.hp > 0) encounter.status = "abandoned";
  }
  if (encounter.hp === 0) {
    encounter.status = "defeated";
    awardEncounter(state, crew.id, encounter);
  } else if (
    encounter.status === "active" &&
    p.turn >=
      (encounter.kind === "boss"
        ? (state.content.balance?.bossTurns ?? 8)
        : encounter.kind === "elite"
          ? (state.content.balance?.eliteTurns ?? 5)
          : (state.content.balance?.ordinaryTurns ?? 4))
  )
    encounter.status = "timed-out";
  if (encounter.kind === "boss" && encounter.hp > 0)
    encounter.pendingBossPhase =
      encounter.hp <= encounter.maxHp / 3 ? 3 : encounter.hp <= (encounter.maxHp * 2) / 3 ? 2 : 1;
  if (encounter.status !== "active") {
    for (const hero of heroes) {
      hero.block = 0;
      hero.nextTurnBlock = 0;
    }
    if (encounter.kind !== "boss" && crew.status !== "eliminated")
      completeNode(state, crew.id, encounter.nodeId);
  }
  expeditionEvent(
    state,
    crew.id,
    { kind: "enemy", actor: null, encounter },
    `${encounter.definition.name}: ${encounter.status}.`,
    0.96,
    "room-result",
  );
  saveTurnSummary(state, crew.id);
  if (encounter.status !== "active")
    createCrewResult(
      state,
      crew.id,
      crew.status === "eliminated"
        ? "defeated"
        : encounter.status === "defeated"
          ? "victory"
          : "escaped",
      "encounter",
    );
  return { state, events: p.events };
}
