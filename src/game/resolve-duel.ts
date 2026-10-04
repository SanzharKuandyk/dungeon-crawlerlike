import { CLASS_NAMES } from "../shared/display-names.js";
import type { Duel } from "../shared/duel-types.js";
import type { MatchState } from "../shared/game-types.js";
import { resolveChampion } from "./arena/champion.js";
import { beginCrewResolution, expeditionEvent } from "./progression/events.js";
export function resolveDuel(state: MatchState, duel: Duel) {
  if (duel.npc) {
    resolveChampion(state, duel);
    return;
  }
  const heroes = state.heroes.filter(
    (h) => duel.crewIds.includes(h.crewId) && h.status === "alive",
  );
  const before = structuredClone({
    heroes,
    crews: state.crews.filter((c) => duel.crewIds.includes(c.id)),
    encounters: state.encounters.filter((e) => e.id === duel.id),
  });
  for (const id of duel.crewIds) {
    beginCrewResolution(state, id);
    state.crewProgress[id].before = before;
  }
  const hits = new Map<string, number>(),
    barriers = new Map(
      heroes.map((h) => [
        h.id,
        (duel.actions[h.playerId]?.kind ?? "guard") === "guard" ? 2 * h.power : 0,
      ]),
    );
  for (const hero of heroes) {
    const action = duel.actions[hero.playerId] ?? { kind: "guard" };
    if (action.kind === "guard") continue;
    const target = heroes.find((h) => h.id === action.targetHeroId && h.crewId !== hero.crewId);
    if (!target) continue;
    let remaining = (action.kind === "strike" ? 2 : 1) * hero.power;
    for (const recipient of [
      target,
      ...heroes.filter((h) => h.crewId === target.crewId && h.id !== target.id),
    ]) {
      const blocked =
        action.kind === "strike" ? Math.min(remaining, barriers.get(recipient.id) ?? 0) : 0;
      barriers.set(recipient.id, (barriers.get(recipient.id) ?? 0) - blocked);
      const damage = Math.min(
        remaining - blocked,
        Math.max(0, recipient.hp - 1 - (hits.get(recipient.id) ?? 0)),
      );
      remaining -= damage + blocked;
      hits.set(recipient.id, (hits.get(recipient.id) ?? 0) + damage);
      if (damage || blocked)
        expeditionEvent(
          state,
          hero.crewId,
          {
            kind: "effect",
            actor: hero.id,
            effect: {
              type: "hit",
              action: action.kind,
              target: recipient.id,
              part: "hero",
              attempted: damage + blocked,
              blocked,
              damage,
            },
          },
          `${action.kind}: ${damage} damage, ${blocked} blocked.`,
          0.42,
          "duel-hit",
        );
    }
  }
  for (const hero of heroes) {
    const damage = hits.get(hero.id) ?? 0;
    hero.hp -= damage;
    const opponent = duel.crewIds.find((id) => id !== hero.crewId);
    if (opponent) duel.damage[opponent] = (duel.damage[opponent] ?? 0) + damage;
    expeditionEvent(
      state,
      hero.crewId,
      { kind: "hero", actor: hero.id, hero },
      `${CLASS_NAMES[hero.classId]}: ${hero.hp} HP.`,
      0.45,
      "duel-hit",
    );
  }
  const events = duel.crewIds
    .flatMap((id) => state.crewProgress[id].events)
    .sort((a, b) => a.sequence - b.sequence);
  for (const id of duel.crewIds) state.crewProgress[id].events = events;
}
