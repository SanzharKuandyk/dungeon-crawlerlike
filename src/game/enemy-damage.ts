import type { MatchState } from "../shared/game-types.js";
import type { CombatContext } from "./combat-context.js";
import { effectEvent, enemyEvent, heroName } from "./events.js";

export function damageEnemies(s: MatchState, ctx: CombatContext) {
  for (const e of s.encounters.filter((e) => e.status === "active" && !e.rivalry)) {
    const attacks = ctx.attacks.filter((a) => a.roomId === e.id);
    const oldWeak = e.weakHp;
    const oldBody = e.bodyHp;
    const remaining = { body: oldBody, "weak-point": oldWeak };
    for (const attack of attacks) {
      const actorHero = s.heroes.find((hero) => hero.id === attack.actor);
      if (!actorHero) throw new Error("Attack actor is missing");
      const damage = Math.min(remaining[attack.part], attack.amount);
      remaining[attack.part] -= damage;
      effectEvent(
        s,
        attack.actor,
        {
          type: "hit",
          action:
            ctx.actions[s.heroes.find((h) => h.id === attack.actor)?.playerId ?? ""]?.kind ??
            "attack",
          target: e.id,
          part: attack.part,
          attempted: attack.amount,
          blocked: 0,
          damage,
        },
        e.id,
        0.4,
        `${heroName(s, actorHero)} deals ${damage} to ${attack.part}.`,
      );
    }
    e.weakHp = Math.max(
      0,
      e.weakHp - attacks.filter((a) => a.part === "weak-point").reduce((n, a) => n + a.amount, 0),
    );
    e.bodyHp = Math.max(
      0,
      e.bodyHp - attacks.filter((a) => a.part === "body").reduce((n, a) => n + a.amount, 0),
    );
    const actor = (attacks.find((a) => a.part === "weak-point") ?? attacks[0])?.actor ?? null;
    if (oldWeak > 0 && e.weakHp === 0) {
      if (
        s.rulesVersion === "dungeon-v2" &&
        e.definition.family === "sentinel" &&
        s.turn % 2 === 0
      ) {
        ctx.interrupted.add(e.id);
        effectEvent(
          s,
          actor ?? e.id,
          { type: "interrupt", target: e.id, amount: 0 },
          e.id,
          0.46,
          "Heavy strike interrupted.",
        );
      }
      enemyEvent(s, e, `${e.definition.name}: the weak point breaks.`, 0.4, "weak-point", actor);
    } else if (oldWeak !== e.weakHp || oldBody !== e.bodyHp)
      enemyEvent(
        s,
        e,
        `${e.definition.name}: ${oldBody - e.bodyHp} body damage, ${oldWeak - e.weakHp} weak-point damage.`,
        0.4,
        "damage",
        actor,
      );
    if (e.bodyHp === 0)
      enemyEvent(
        s,
        e,
        `${e.definition.name}: the ${e.definition.family} falls.`,
        0.45,
        "victory",
        actor,
      );
  }
}
