import type { Hero, MatchState, RoomEncounter } from "../../shared/game-types.js";
import { expeditionEvent } from "../progression/events.js";
import { applyInjury, applyStress, hasAffliction, rollInjury, useOnce } from "./conditions.js";
import { calculateDamage } from "./damage.js";
import { publishedIntent } from "./enemy-patterns.js";
import { equipmentBlock } from "./protection.js";

export function applyEnemyIntent(
  state: MatchState,
  enemy: RoomEncounter,
  heroes: Hero[],
  turn: number,
  barriers: Map<string, number>,
) {
  if (enemy.bodyHp <= 0) return;
  const intent = publishedIntent(enemy, heroes, turn);
  enemy.shield += intent.shieldGain;
  for (const target of intent.targets) {
    const hero = heroes.find((h) => h.id === target.heroId);
    if (!hero) continue;
    const living = Math.min(target.damage, barriers.get(hero.id) ?? 0);
    barriers.set(hero.id, Math.max(0, (barriers.get(hero.id) ?? 0) - living));
    const aid = Math.min(target.damage - living, barriers.get(`aid:${hero.id}`) ?? 0);
    barriers.set(`aid:${hero.id}`, Math.max(0, (barriers.get(`aid:${hero.id}`) ?? 0) - aid));
    const gear = equipmentBlock(hero, target.damage - living - aid);
    const result = calculateDamage(hero.hp, target.damage, living + aid + gear);
    hero.hp = result.hp;
    applyStress(hero, target.stress);
    if (result.damage > 0) {
      if (hasAffliction(hero, "shaken") && useOnce(hero, "shaken")) applyStress(hero, 1);
      if (target.bleed) hero.conditions.combatEffects = [{ kind: "bleed", turns: 2 }];
      if (target.injury) {
        const roll = rollInjury(state.outcomeRng[hero.crewId], target.injuryChance);
        state.outcomeRng[hero.crewId] = roll.nextRng;
        if (roll.outcome) applyInjury(hero, target.injury);
        expeditionEvent(
          state,
          hero.crewId,
          { kind: "story", actor: hero.id },
          `${target.injury} injury: ${target.injuryChance}% · roll ${roll.roll}${roll.outcome ? " · injured" : " · avoided"}.`,
          0.73,
          "injury-roll",
        );
      }
    }
    expeditionEvent(
      state,
      hero.crewId,
      {
        kind: "effect",
        actor: enemy.id,
        effect: {
          type: "hit",
          action: intent.name,
          target: hero.id,
          part: "hero",
          attempted: target.damage,
          blocked: result.blocked,
          damage: result.damage,
        },
      },
      `${intent.name}: ${result.blocked} blocked, ${result.damage} damage.`,
      0.65,
      "hit",
    );
    expeditionEvent(
      state,
      hero.crewId,
      { kind: "hero", actor: hero.id, hero },
      `${state.players.find((p) => p.id === hero.playerId)?.name}: ${hero.hp} HP, ${hero.stress} stress.`,
      0.66,
      "enemy-hit",
    );
    const lastStand = hero.conditions.blessings.find((b) => b.kind === "last-stand");
    if (lastStand && hero.hp > 0 && hero.hp < hero.maxHp / 2 && useOnce(hero, "last-stand")) {
      barriers.set(hero.id, (barriers.get(hero.id) ?? 0) + lastStand.rank * hero.power);
      expeditionEvent(
        state,
        hero.crewId,
        { kind: "story", actor: hero.id },
        `Last Stand grants ${lastStand.rank * hero.power} barrier.`,
        0.7,
        "blessing",
      );
    }
  }
}
