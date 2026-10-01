import type { MatchState } from "../shared/game-types.js";
import type { CombatContext } from "./combat-context.js";
import { enemyEvent, heroEvent, heroName, storyEvent } from "./events.js";
import { encounterFor, fighting } from "./routes.js";
import { priority } from "./voting.js";
export function applyHeroActions(s: MatchState, ctx: CombatContext) {
  for (const h of priority(s, s.heroes)) {
    if (!fighting(s, h)) continue;
    const a = ctx.actions[h.playerId],
      e = encounterFor(s, h);
    if (!a || !e) continue;
    const barrier = (id: string, amount: number) =>
      ctx.barriers.set(id, [...(ctx.barriers.get(id) ?? []), { source: h.id, amount }]);
    const heal = (id: string, amount: number) => {
      const target = s.heroes.find((v) => v.id === id && v.status === "alive");
      if (!target) return;
      const healed = Math.min(amount, target.maxHp - target.hp);
      target.hp += healed;
      if (healed > 0) {
        ctx.meaningful.add(h.id);
        heroEvent(
          s,
          target,
          `${heroName(s, h)} heals ${heroName(s, target)} for ${healed}.`,
          0.15,
          "heal",
        );
      }
    };
    const strike = (amount: number, part: "body" | "weak-point") => {
      ctx.attacks.push({
        actor: h.id,
        roomId: e.id,
        part,
        amount: amount + (h.bargainDepth === s.depth ? h.power : 0),
      });
      ctx.meaningful.add(h.id);
      storyEvent(
        s,
        `${heroName(s, h)} strikes the ${part} in ${e.definition.name}.`,
        0.3,
        "attack",
        h.id,
        e.id,
      );
    };
    switch (a.kind) {
      case "attack":
        strike(2 * h.power, a.part);
        break;
      case "brace":
        barrier(h.id, 2 * h.power);
        h.stress = Math.max(0, h.stress - 1);
        heroEvent(s, h, `${heroName(s, h)} braces.`, 0.15, "brace");
        break;
      case "loot":
        ctx.claims.set(h.id, 2 * h.power);
        storyEvent(s, `${heroName(s, h)} reaches for treasure.`, 0.3, "claim", h.id, e.id);
        break;
      case "protect":
        barrier(a.targetHeroId, 3 * h.power);
        storyEvent(
          s,
          `${heroName(s, h)} protects ${heroName(s, s.heroes.find((v) => v.id === a.targetHeroId) ?? h)}.`,
          0.1,
          "protect",
          h.id,
          e.id,
        );
        break;
      case "mend":
        heal(a.targetHeroId, 2 * h.power);
        break;
      case "hex":
        strike(3 * h.power, a.part);
        h.stress += 2;
        heroEvent(s, h, `${heroName(s, h)} gains 2 stress from Hex.`, 0.15, "hex");
        break;
      case "pilfer":
        strike(h.power, "body");
        ctx.claims.set(h.id, h.power);
        break;
      case "skirmish":
        strike(2 * h.power, a.part);
        barrier(h.id, h.power);
        h.stress++;
        heroEvent(s, h, `${heroName(s, h)} skirmishes and gains 1 stress.`, 0.15, "skirmish");
        break;
      case "channel":
        strike(h.power, a.part);
        heal(h.id, h.power);
        h.stress = Math.max(0, h.stress - 1);
        heroEvent(s, h, `${heroName(s, h)} channels and calms down.`, 0.15, "channel");
        break;
    }
  }
}
export function applyAid(s: MatchState, ctx: CombatContext) {
  for (const source of priority(s, s.heroes)) {
    const a = ctx.actions[source.playerId];
    if (a?.kind !== "ward" || ctx.fightingAtLock.has(source.id)) continue;
    const target = s.heroes.find((h) => h.id === a.targetHeroId && fighting(s, h));
    if (!target) continue;
    const amount = Math.min(
      source.power,
      target.power,
      target.power - (ctx.aid.get(target.id) ?? 0),
    );
    if (amount > 0) {
      ctx.aid.set(target.id, (ctx.aid.get(target.id) ?? 0) + amount);
      storyEvent(
        s,
        `${heroName(s, source)} wards ${heroName(s, target)} for ${amount}.`,
        0.15,
        "aid",
        source.id,
        encounterFor(s, target)?.id ?? null,
      );
    }
  }
}
export function damageEnemies(s: MatchState, ctx: CombatContext) {
  for (const e of s.encounters.filter((e) => e.status === "active")) {
    const attacks = ctx.attacks.filter((a) => a.roomId === e.id);
    const oldWeak = e.weakHp;
    const oldBody = e.bodyHp;
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
