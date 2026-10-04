import type { Hero, RoomEncounter } from "../shared/game-types.js";
import { publishedIntent } from "./combat/enemy-patterns.js";
export function enemyIntent(enemy: RoomEncounter, hero: Hero, _depth: number, turn: number) {
  const intent = publishedIntent(enemy, [hero], turn);
  const target = intent.targets[0];
  return {
    name: intent.name,
    sealModifier: intent.sealModifier,
    damage: target?.damage ?? 0,
    stress: target?.stress ?? 0,
    description: `${target?.damage ?? 0} damage${target?.stress ? ` · +${target.stress} stress` : ""}${target?.bleed ? " · Bleed" : ""}${target?.injury ? ` · ${target.injuryChance}% ${target.injury} injury` : ""}${intent.shieldGain ? ` · +${intent.shieldGain} shield` : ""}`,
  };
}
