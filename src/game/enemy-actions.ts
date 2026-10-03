import type { EnemyIntent, Hero, MatchState, RoomEncounter } from "../shared/game-types.js";
import type { CombatContext } from "./combat-context.js";
import { effectEvent, heroEvent, heroName } from "./events.js";
import { absorb } from "./protection.js";
import { encounterFor, fighting } from "./routes.js";

export function enemyIntent(e: RoomEncounter, h: Hero, depth: number, turn: number): EnemyIntent {
  const intact = e.weakHp > 0;
  const extra = depth >= 4 && turn === 4 ? h.power : 0;
  const chapterDamage =
    Math.floor(((e.chapter ?? 1) - 1) / 3) * Math.max(1, Math.floor(h.power / 3));
  const damage =
    h.power +
    chapterDamage +
    extra +
    (e.definition.family === "sentinel" && intact && turn % 2 === 0 ? h.power : 0);
  const lootDamage = e.definition.family === "devourer" && intact ? h.power : 0;
  const stress = e.definition.family === "seer" && intact ? 1 : 0;
  return {
    damage,
    lootDamage,
    stress,
    description: `${damage} damage${lootDamage ? ` · +${lootDamage} if looting` : ""}${stress ? ` · ${stress} stress` : ""}`,
  };
}
export function applyEnemyActions(s: MatchState, ctx: CombatContext) {
  for (const h of s.heroes.filter((h) => fighting(s, h))) {
    const e = encounterFor(s, h);
    if (!e || e.rivalry || e.bodyHp === 0 || ctx.interrupted.has(e.id)) continue;
    const intent = enemyIntent(e, h, s.depth, s.turn);
    const a = ctx.actions[h.playerId];
    const raw =
      intent.damage + (a?.kind === "loot" || a?.kind === "pilfer" ? intent.lootDamage : 0);
    const damage = absorb(s, h, raw, ctx);
    effectEvent(
      s,
      e.id,
      {
        type: "hit",
        action: e.definition.family,
        target: h.id,
        part: "hero",
        attempted: raw,
        blocked: raw - damage,
        damage: Math.min(h.hp, damage),
      },
      e.id,
      0.6,
      `${e.definition.family}: ${raw - damage} blocked, ${Math.min(h.hp, damage)} damage to ${heroName(s, h)}.`,
    );
    h.hp = Math.max(0, h.hp - damage);
    h.stress += intent.stress;
    heroEvent(
      s,
      h,
      `${heroName(s, h)} takes ${damage} damage${intent.stress ? ` and ${intent.stress} stress` : ""} from the ${e.definition.family}.`,
      0.6,
      "enemy-hit",
    );
  }
}
