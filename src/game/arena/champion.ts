import { CLASS_NAMES } from "../../shared/display-names.js";
import type { Duel } from "../../shared/duel-types.js";
import type { MatchState } from "../../shared/game-types.js";
import { beginCrewResolution, expeditionEvent } from "../progression/events.js";
export function refreshChampionIntent(state: MatchState, duel: Duel) {
  const encounter = state.encounters.find((entry) => entry.id === duel.id);
  const enemy = encounter?.enemies[0];
  if (!encounter || !enemy || !duel.npc) return;
  const move = (["strike", "guard", "feint"] as const)[duel.turn - 1];
  enemy.block = move === "guard" ? 24 : 0;
  encounter.block = enemy.block;
  enemy.intent = {
    moveId: `champion-${move}`,
    name: move === "feint" ? "Feint · ignores Guard" : move === "guard" ? "Guard" : "Strike",
    blockGain: 0,
    recipientEnemyId: null,
    targets: state.heroes
      .filter((hero) => duel.crewIds.includes(hero.crewId) && hero.status === "alive")
      .map((hero) => ({
        heroId: hero.id,
        damage: (move === "strike" ? 2 : move === "feint" ? 1 : 0) * hero.power,
        stress: 0,
        bleed: false,
        injury: null,
        injuryChance: 0,
      })),
  };
}
export function resolveChampion(state: MatchState, duel: Duel) {
  const npc = duel.npc;
  if (!npc) throw new Error("Champion missing");
  const id = duel.crewIds[0];
  beginCrewResolution(state, id);
  const heroes = state.heroes.filter((h) => h.crewId === id && h.status === "alive");
  const move = (["strike", "guard", "feint"] as const)[duel.turn - 1];
  let barrier = move === "guard" ? 24 : 0;
  for (const hero of heroes) {
    const action = duel.actions[hero.playerId] ?? { kind: "guard" };
    if (action.kind !== "guard") {
      const attempted = (action.kind === "strike" ? 2 : 1) * hero.power;
      const blocked = action.kind === "strike" ? Math.min(barrier, attempted) : 0;
      barrier -= blocked;
      const damage = Math.min(npc.hp - 1, attempted - blocked);
      npc.hp -= damage;
      duel.damage[id] = (duel.damage[id] ?? 0) + damage;
      expeditionEvent(
        state,
        id,
        {
          kind: "effect",
          actor: hero.id,
          effect: {
            type: "hit",
            action: action.kind,
            target: duel.id,
            part: "body",
            attempted,
            blocked,
            damage,
          },
        },
        `${CLASS_NAMES[hero.classId]}: ${damage} champion damage.`,
        0.42,
        "arena-hit",
      );
    }
    const incoming = (move === "strike" ? 2 : move === "feint" ? 1 : 0) * hero.power;
    const blocked =
      action.kind === "guard" && move !== "feint" ? Math.min(2 * hero.power, incoming) : 0;
    const loss = Math.min(hero.hp - 1, incoming - blocked);
    hero.hp -= loss;
    duel.damage.champion = (duel.damage.champion ?? 0) + loss;
    expeditionEvent(
      state,
      id,
      { kind: "hero", actor: hero.id, hero },
      `Champion ${move}: ${loss} damage, ${blocked} blocked.`,
      0.6,
      "arena-hit",
    );
  }
  const enemy = state.encounters.find((e) => e.id === duel.id);
  if (enemy) {
    enemy.hp = npc.hp;
    if (enemy.enemies[0]) enemy.enemies[0].hp = npc.hp;
    expeditionEvent(
      state,
      id,
      { kind: "enemy", actor: null, encounter: enemy },
      `Champion: ${npc.hp} HP · ${move}.`,
      0.7,
      "arena-hit",
    );
  }
}
