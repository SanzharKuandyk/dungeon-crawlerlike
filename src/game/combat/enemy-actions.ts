import type { Hero, MatchState, RoomEncounter } from "../../shared/game-types.js";
import { refreshEncounter } from "../progression/encounters.js";
import { expeditionEvent } from "../progression/events.js";
import { applyInjury, applyStress, hasAffliction, rollInjury, useOnce } from "./conditions.js";
import { calculateDamage } from "./damage.js";
import { type BlockLedger, equipmentBlock, spendBlockSources } from "./protection.js";

export function applyEnemyIntent(
  state: MatchState,
  encounter: RoomEncounter,
  heroes: Hero[],
  _turn: number,
  barriers: Map<string, number>,
  sources: BlockLedger,
) {
  // Old Block has survived exactly one player phase. New defensive moves replace it.
  for (const enemy of encounter.enemies) {
    enemy.block = 0;
    enemy.effects = enemy.effects.filter((e) => e.kind !== "braced");
  }
  for (const enemy of encounter.enemies) {
    if (enemy.hp <= 0) continue;
    const intent = enemy.intent;
    if (intent.blockGain && intent.recipientEnemyId) {
      const recipient = encounter.enemies.find((e) => e.id === intent.recipientEnemyId && e.hp > 0);
      if (recipient) {
        recipient.block += intent.blockGain;
        recipient.effects.push({
          kind: "braced",
          magnitude: intent.blockGain,
          expiresAfterTurn: state.crewProgress[heroes[0].crewId].turn + 1,
        });
      }
    }
    for (const target of intent.targets) {
      const hero = heroes.find((h) => h.id === target.heroId && h.status === "alive" && h.hp > 0);
      if (!hero) {
        expeditionEvent(
          state,
          heroes[0].crewId,
          { kind: "story", actor: enemy.id },
          `${intent.name} cancelled: its announced target has fallen.`,
          0.65,
          "cancelled",
        );
        continue;
      }
      const living = Math.min(target.damage, barriers.get(hero.id) ?? 0);
      barriers.set(hero.id, Math.max(0, (barriers.get(hero.id) ?? 0) - living));
      hero.block = barriers.get(hero.id) ?? 0;
      const aid = Math.min(target.damage - living, barriers.get(`aid:${hero.id}`) ?? 0);
      barriers.set(`aid:${hero.id}`, Math.max(0, (barriers.get(`aid:${hero.id}`) ?? 0) - aid));
      const gear = equipmentBlock(hero, target.damage - living - aid);
      const result = calculateDamage(hero.hp, target.damage, living + aid + gear);
      const absorbed = spendBlockSources(sources, hero.id, living);
      if (aid) absorbed.push({ label: "Spirit Ward", amount: aid });
      if (gear) absorbed.push({ label: "Ward vest", amount: gear });
      const before = hero.hp;
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
      const stand = hero.conditions.blessings.find((b) => b.kind === "last-stand");
      if (
        stand &&
        before >= hero.maxHp / 2 &&
        hero.hp > 0 &&
        hero.hp < hero.maxHp / 2 &&
        useOnce(hero, "last-stand")
      )
        hero.nextTurnBlock = stand.rank * hero.power;
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
            sources: absorbed,
          },
        },
        `${enemy.name} → ${state.players.find((p) => p.id === hero.playerId)?.name}: ${result.blocked} blocked${absorbed.length ? ` (${absorbed.map((s) => `${s.label} ${s.amount}`).join(" + ")})` : ""}, ${result.damage} health damage.`,
        0.65,
        "hit",
      );
      expeditionEvent(
        state,
        hero.crewId,
        { kind: "hero", actor: hero.id, hero },
        `${state.players.find((p) => p.id === hero.playerId)?.name}: ${hero.hp} HP, ${hero.stress} stress${hero.nextTurnBlock ? ` · next turn +${hero.nextTurnBlock} Block` : ""}.`,
        0.7,
        "enemy-hit",
      );
    }
  }
  refreshEncounter(encounter);
  expeditionEvent(
    state,
    heroes[0].crewId,
    { kind: "enemy", actor: null, encounter },
    `Enemy Block: ${encounter.block}. Expires after the next player phase.`,
    0.7,
    "enemy-block",
  );
}
