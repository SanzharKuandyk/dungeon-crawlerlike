import type { Duel } from "../shared/duel-types.js";
import type { MatchState } from "../shared/game-types.js";
import {
  beginEvents,
  effectEvent,
  finalizeEvents,
  heroEvent,
  heroName,
  lockResolution,
} from "./events.js";

// Duels risk health and carried treasure, but never eliminate a student.
export function resolveDuel(state: MatchState, duel: Duel) {
  lockResolution(state);
  beginEvents(state);
  const heroes = state.heroes.filter(
    (hero) => duel.crewIds.includes(hero.crewId) && hero.status === "alive",
  );
  const hits = new Map<string, number>();
  const shields = new Map(
    heroes.map((hero) => [
      hero.id,
      (duel.actions[hero.playerId]?.kind ?? "guard") === "guard" ? 2 * hero.power : 0,
    ]),
  );
  for (const hero of heroes) {
    const action = duel.actions[hero.playerId] ?? { kind: "guard" };
    if (action.kind === "guard") continue;
    const target = heroes.find(
      (target) => target.id === action.targetHeroId && target.crewId !== hero.crewId,
    );
    if (!target) continue;
    let remaining = (action.kind === "strike" ? 2 : 1) * hero.power;
    const targets = [
      target,
      ...heroes.filter((other) => other.crewId === target.crewId && other.id !== target.id),
    ];
    // Overflow reaches the crew so a solo hero does not waste its crew-sized attack.
    for (const recipient of targets) {
      if (remaining <= 0) break;
      const raw = remaining;
      const blocked = action.kind === "strike" ? Math.min(raw, shields.get(recipient.id) ?? 0) : 0;
      shields.set(recipient.id, (shields.get(recipient.id) ?? 0) - blocked);
      const damage = Math.min(
        raw - blocked,
        Math.max(0, recipient.hp - 1 - (hits.get(recipient.id) ?? 0)),
      );
      remaining -= blocked + damage;
      hits.set(recipient.id, (hits.get(recipient.id) ?? 0) + damage);
      if (damage || blocked)
        effectEvent(
          state,
          hero.id,
          {
            type: "hit",
            action: action.kind,
            target: recipient.id,
            part: "hero",
            attempted: damage + blocked,
            blocked,
            damage,
          },
          duel.id,
          0.42,
          `${heroName(state, hero)} uses ${action.kind}${blocked ? ": guarded" : ""}.`,
        );
    }
  }
  for (const hero of heroes) {
    const damage = hits.get(hero.id) ?? 0;
    hero.hp -= damage;
    const opponent = duel.crewIds.find((id) => id !== hero.crewId);
    if (opponent) duel.damage[opponent] = (duel.damage[opponent] ?? 0) + damage;
    if (damage)
      heroEvent(state, hero, `${heroName(state, hero)} loses ${damage} HP.`, 0.42, "duel-hit");
  }
  finalizeEvents(state);
}
