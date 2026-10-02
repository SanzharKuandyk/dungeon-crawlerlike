import type { RoomDefinition } from "../shared/content-types.js";
import type { MatchState, RoomEncounter } from "../shared/game-types.js";
import type { CombatContext } from "./combat-context.js";
import { crewEvent, heroEvent, heroName } from "./events.js";
import { absorb } from "./protection.js";
import { encounterFor, fighting } from "./routes.js";

export function rivalryDoor(s: MatchState, room: RoomDefinition) {
  return (
    !s.expeditionMap &&
    s.expeditionFeatures === "rivalries-v1" &&
    s.depth >= 2 &&
    s.depth <= 4 &&
    room.risk === "high" &&
    (s.seed + s.depth) % 3 === 0
  );
}

export function applyRivalryDamage(s: MatchState, ctx: CombatContext) {
  const hits = new Map<string, number>();
  for (const attack of ctx.duelAttacks) {
    const target = s.heroes.find((h) => h.id === attack.targetHeroId);
    const source = s.heroes.find((h) => h.id === attack.actor);
    if (
      !target ||
      !source ||
      !fighting(s, target) ||
      target.crewId === source.crewId ||
      encounterFor(s, target)?.id !== attack.roomId
    )
      continue;
    hits.set(target.id, (hits.get(target.id) ?? 0) + attack.amount);
  }
  // Every hit is collected before health changes, so fallen attackers still strike.
  for (const [id, raw] of hits) {
    const target = s.heroes.find((h) => h.id === id);
    if (!target) continue;
    const damage = absorb(s, target, raw, ctx);
    if (damage > 0)
      for (const attack of ctx.duelAttacks.filter((a) => a.targetHeroId === id))
        ctx.meaningful.add(attack.actor);
    target.hp = Math.max(0, target.hp - damage);
    heroEvent(
      s,
      target,
      `${heroName(s, target)} takes ${damage} damage from the rival crew.`,
      0.6,
      "rival-hit",
    );
  }
}

export function rivalryOutcome(s: MatchState, e: RoomEncounter) {
  const remaining = s.crews.filter(
    (c) => c.status === "active" && c.location.kind === "room" && c.location.roomId === e.id,
  );
  if (remaining.length === 2) return s.turn >= 4 ? ("timed-out" as const) : ("active" as const);
  const winner = remaining[0];
  const defeated = e.crewIds.some(
    (id) => s.crews.find((c) => c.id === id)?.status === "eliminated",
  );
  if (!winner || !defeated) return "abandoned" as const;
  if (e.rivalry) e.rivalry.winnerCrewId = winner.id;
  if (
    !e.purseAwarded &&
    (e.contribution[winner.id] ?? 0) >= (e.enteringPower[winner.id] ?? Infinity)
  ) {
    e.purseAwarded = true;
    const purse = 10 + s.depth;
    winner.carriedTreasure += purse;
    crewEvent(
      s,
      winner,
      `${winner.name} wins the rivalry and earns ${purse} carried treasure.`,
      0.87,
      "victory",
    );
  }
  return "defeated" as const;
}
