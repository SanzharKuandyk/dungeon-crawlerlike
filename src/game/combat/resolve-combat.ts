import type { HeroAction } from "../../shared/command-types.js";
import { CLASS_NAMES } from "../../shared/display-names.js";
import type { MatchState } from "../../shared/game-types.js";
import type { ResolutionContext } from "../../shared/progression-types.js";
import { actionKey } from "../action-options.js";
import { beginCrewResolution, expeditionEvent } from "../progression/events.js";
import { createCrewResult, saveTurnSummary } from "../progression/results.js";
import { awardEncounter } from "../progression/rewards.js";
import { applySupport } from "./apply-support.js";
import { applyStress, resolvePanic, useOnce } from "./conditions.js";
import { calculateDamage, outgoingDamage } from "./damage.js";
import { applyEnemyIntent } from "./enemy-actions.js";
import { legalHeroActions, SKILLS } from "./hero-actions.js";
import { preventDeath } from "./protection.js";

export function resolveCombat(input: Readonly<MatchState>, context: ResolutionContext) {
  const progress = input.crewProgress[context.crewId];
  if (!progress) throw new Error("Crew progress missing.");
  const state: MatchState = {
    ...input,
    heroes: input.heroes.map((h) => (h.crewId === context.crewId ? structuredClone(h) : h)),
    crews: input.crews.map((c) => (c.id === context.crewId ? structuredClone(c) : c)),
    encounters: input.encounters.map((e) =>
      e.id === progress.encounterId ? structuredClone(e) : e,
    ),
    crewProgress: {
      ...input.crewProgress,
      [context.crewId]: structuredClone({ ...progress, before: null, events: [] }),
    },
    outcomeRng: { ...input.outcomeRng },
    rewardRng: { ...input.rewardRng },
    rewardOffers: structuredClone(input.rewardOffers),
    history: [...input.history],
  };
  const crew = state.crews.find((c) => c.id === context.crewId);
  const p = state.crewProgress[context.crewId];
  const enemy = state.encounters.find((e) => e.id === p.encounterId);
  if (!crew || !enemy || enemy.status !== "active") throw new Error("No active encounter.");
  beginCrewResolution(state, crew.id);
  const heroes = state.heroes.filter((h) => h.crewId === crew.id);
  const living = heroes.filter((h) => h.status === "alive");
  const stressAtLock = Object.fromEntries(living.map((h) => [h.id, h.stress]));
  const actions: Record<string, HeroAction> = {};
  for (const hero of heroes) {
    const submitted = p.actions[hero.playerId];
    actions[hero.playerId] =
      submitted && legalHeroActions(state, hero).some((a) => actionKey(a) === actionKey(submitted))
        ? submitted
        : hero.status === "alive"
          ? { kind: "brace" }
          : { kind: "observe" };
  }
  p.resolvedActions = actions;
  p.globalTurn++;
  if (living.filter((h) => p.withdrawVotes[h.playerId]).length > living.length / 2) {
    for (const hero of living) applyStress(hero, 1);
    enemy.status = "abandoned";
    crew.location = { kind: "camp" };
    expeditionEvent(
      state,
      crew.id,
      { kind: "crew", actor: crew.id, crew },
      `${crew.name} withdraws without a reward.`,
      0.1,
      "withdrawal",
    );
  } else {
    const barriers = new Map<string, number>();
    for (const hero of heroes) {
      const action = actions[hero.playerId];
      if (action.kind === SKILLS[hero.classId])
        hero.skillReadyTurn = p.turn + (state.content.balance?.signatureCooldown ?? 2);
      applySupport(state, hero, action, barriers);
    }
    for (const hero of living) {
      const action = actions[hero.playerId];
      if (!["attack", "hex", "pilfer", "skirmish", "channel"].includes(action.kind)) continue;
      const part = "part" in action ? action.part : "body";
      const base =
        (action.kind === "hex"
          ? 3
          : action.kind === "pilfer" || action.kind === "channel"
            ? 1
            : 2) * hero.power;
      const attempted = outgoingDamage(hero, base, part, stressAtLock[hero.id]);
      useOnce(hero, "doubtful");
      if (part === "weak-point") useOnce(hero, "sealbreaker");
      const blocked = Math.min(enemy.shield, attempted);
      enemy.shield -= blocked;
      let damage = attempted - blocked;
      if (part === "weak-point") {
        const seal = Math.min(enemy.weakHp, damage);
        enemy.weakHp -= seal;
        damage -= seal;
      }
      enemy.bodyHp = Math.max(0, enemy.bodyHp - damage);
      expeditionEvent(
        state,
        crew.id,
        {
          kind: "effect",
          actor: hero.id,
          effect: {
            type: "hit",
            action: action.kind,
            target: enemy.id,
            part,
            attempted,
            blocked,
            damage: attempted - blocked,
          },
        },
        `${CLASS_NAMES[hero.classId]}: ${attempted - blocked} ${part === "weak-point" ? "seal / body" : "body"} damage.`,
        0.4,
        "hit",
      );
    }
    expeditionEvent(
      state,
      crew.id,
      { kind: "enemy", actor: null, encounter: enemy },
      `${enemy.definition.name}: ${enemy.bodyHp} health · ${enemy.weakHp} seal · ${enemy.shield} shield.`,
      0.48,
      "enemy-damage",
    );
    if (enemy.bodyHp === 0)
      expeditionEvent(
        state,
        crew.id,
        { kind: "enemy", actor: null, encounter: enemy },
        "Enemy defeated · its attack is cancelled.",
        0.6,
        "enemy-cancelled",
      );
    applyEnemyIntent(state, enemy, living, p.turn, barriers);
    for (const hero of living) {
      for (const effect of hero.conditions.combatEffects) {
        if (effect.kind === "bleed") {
          const blocked = Math.min(barriers.get(hero.id) ?? 0, hero.power);
          barriers.set(hero.id, Math.max(0, (barriers.get(hero.id) ?? 0) - blocked));
          hero.hp = calculateDamage(hero.hp, hero.power, blocked).hp;
          effect.turns--;
        }
      }
      hero.conditions.combatEffects = hero.conditions.combatEffects.filter((e) => e.turns > 0);
      const panic = resolvePanic(hero);
      const saved = preventDeath(hero);
      if (hero.hp === 0) hero.status = "dead";
      expeditionEvent(
        state,
        crew.id,
        { kind: "hero", actor: hero.id, hero },
        `${state.players.find((v) => v.id === hero.playerId)?.name}${hero.status === "dead" ? " falls and becomes a spirit" : saved ? " survives with Second Breath" : panic ? " panics" : " withstands the turn"}.`,
        0.82,
        hero.status === "dead" ? "death" : panic ? "panic" : "conditions",
      );
    }
    if (!heroes.some((h) => h.status === "alive")) {
      crew.status = "eliminated";
      if (enemy.bodyHp > 0) enemy.status = "abandoned";
    }
    if (enemy.bodyHp === 0) {
      enemy.status = "defeated";
      awardEncounter(state, crew.id, enemy);
    } else if (
      enemy.status === "active" &&
      p.turn >=
        (enemy.kind === "boss"
          ? (state.content.balance?.bossTurns ?? 6)
          : (state.content.balance?.ordinaryTurns ?? 4))
    )
      enemy.status = "timed-out";
    if (enemy.kind === "boss" && enemy.bodyHp > 0)
      enemy.pendingBossPhase =
        enemy.bodyHp <= enemy.maxBodyHp / 3 ? 3 : enemy.bodyHp <= (enemy.maxBodyHp * 2) / 3 ? 2 : 1;
  }
  expeditionEvent(
    state,
    crew.id,
    { kind: "enemy", actor: null, encounter: enemy },
    `${enemy.definition.name}: ${enemy.status}.`,
    0.96,
    "room-result",
  );
  saveTurnSummary(state, crew.id);
  if (enemy.status !== "active")
    createCrewResult(
      state,
      crew.id,
      crew.status === "eliminated"
        ? "defeated"
        : enemy.status === "defeated"
          ? "victory"
          : "escaped",
      "encounter",
    );
  return { state, events: p.events };
}
