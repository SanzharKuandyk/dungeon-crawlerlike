import type { Hero, MatchState } from "../shared/game-types.js";
import { effectEvent, heroEvent, heroName } from "./events.js";

export function spendCharge(h: Hero) {
  if (!h.equipment) return;
  h.equipment = h.equipment.charges === 2 ? { ...h.equipment, charges: 1 } : null;
}
export function applyLantern(s: MatchState, h: Hero) {
  if (s.globalTurn < h.equipmentActiveFromTurn) return;
  if (h.equipment?.kind === "lantern" && h.stress >= 4) {
    h.stress -= 2;
    spendCharge(h);
    heroEvent(s, h, `${heroName(s, h)}'s Lantern removes 2 stress.`, 0.68, "equipment");
  }
}
export function applySalve(s: MatchState, h: Hero) {
  if (s.globalTurn < h.equipmentActiveFromTurn) return;
  if (h.equipment?.kind === "salve" && h.hp > 0 && h.hp <= h.maxHp / 2) {
    const healed = Math.min(h.power, h.maxHp - h.hp);
    h.hp += healed;
    effectEvent(
      s,
      h.id,
      { type: "heal", target: h.id, amount: healed },
      null,
      0.77,
      `${heroName(s, h)} uses Salve.`,
    );
    spendCharge(h);
    heroEvent(s, h, `${heroName(s, h)}'s Salve restores ${healed} health.`, 0.77, "equipment");
  }
}
