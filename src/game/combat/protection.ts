import type { Hero } from "../../shared/game-types.js";
import { hasAffliction, useOnce } from "./conditions.js";
import { itemRank } from "./damage.js";
export type BlockSource = { label: string; amount: number };
export type BlockLedger = Map<string, BlockSource[]>;
export function addBlockSource(ledger: BlockLedger, id: string, label: string, amount: number) {
  if (amount > 0) ledger.set(id, [...(ledger.get(id) ?? []), { label, amount }]);
}
export function spendBlockSources(ledger: BlockLedger, id: string, amount: number): BlockSource[] {
  const spent: BlockSource[] = [];
  for (const source of ledger.get(id) ?? []) {
    const absorbed = Math.min(source.amount, amount);
    source.amount -= absorbed;
    amount -= absorbed;
    if (absorbed) spent.push({ label: source.label, amount: absorbed });
  }
  if (amount > 0) spent.push({ label: "Block", amount });
  return spent;
}
export function barrierAmount(target: Hero, amount: number) {
  return Math.floor(amount * (hasAffliction(target, "brittle") ? 0.75 : 1));
}
export function braceBarrier(hero: Hero) {
  const base =
    2 * hero.power +
    (hero.inventory.equipment.armor?.kind === "guard-coat"
      ? itemRank(hero.inventory.equipment.armor) * hero.power
      : 0);
  return Math.floor(base * (hero.conditions.injuries.includes("leg") ? 0.75 : 1));
}
export function equipmentBlock(hero: Hero, amount: number) {
  if (
    amount <= 0 ||
    hero.inventory.equipment.armor?.kind !== "ward-vest" ||
    !useOnce(hero, "ward-vest")
  )
    return 0;
  return Math.min(itemRank(hero.inventory.equipment.armor) * hero.power, amount);
}
export function preventDeath(hero: Hero) {
  if (hero.hp > 0 || hero.status === "dead" || hero.expeditionUses.includes("second-breath"))
    return false;
  const blessing = hero.conditions.blessings.find((b) => b.kind === "second-breath" && !b.spent);
  if (!blessing) return false;
  blessing.spent = true;
  hero.expeditionUses.push("second-breath");
  hero.hp = blessing.rank === 1 ? 1 : hero.power;
  return true;
}
