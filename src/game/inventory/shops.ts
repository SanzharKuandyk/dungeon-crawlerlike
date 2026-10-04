import type { Hero, MatchState } from "../../shared/game-types.js";
import type { ShopVisit, Treatment } from "../../shared/inventory-types.js";
import { reserveAllowances } from "../progression/economy.js";
import { shuffled } from "../random.js";
import { ITEMS } from "./catalog.js";
import { addItem } from "./inventory.js";

export function createShop(state: MatchState, crewId: string, nodeId: string): ShopVisit {
  const crew = state.crews.find((c) => c.id === crewId);
  if (!crew) throw new Error("Crew not found.");
  const heroes = state.heroes.filter((h) => h.crewId === crewId);
  return {
    nodeId,
    allowances: reserveAllowances(crew.economy.gold, heroes),
    offers: Object.fromEntries(
      heroes.map((h) => {
        const gear = shuffled(
          ITEMS.filter((i) => i.slot),
          state.seed + state.chapterMaps.flatMap((m) => m.nodes).findIndex((n) => n.id === nodeId),
        );
        const stock = [
          ...ITEMS.filter((i) => !i.slot),
          ...(["weapon", "armor", "charm"] as const)
            .map((slot) => gear.find((i) => i.slot === slot))
            .filter((i) => i !== undefined),
        ];
        return [
          h.id,
          stock.map((i) => ({
            id: `${nodeId}:${h.id}:${i.kind}`,
            kind: i.kind,
            price: i.pricePower * h.power,
            stock: i.slot ? 1 : 3,
          })),
        ];
      }),
    ),
  };
}

export function resolvePurchase(
  state: Readonly<MatchState>,
  hero: Hero,
  offerId: string,
  revision: number,
) {
  const crew = state.crews.find((c) => c.id === hero.crewId);
  const offer = crew?.shop?.offers[hero.id]?.find((o) => o.id === offerId);
  if (!crew?.shop || !offer || offer.stock < 1) throw new Error("This offer is unavailable.");
  if (hero.inventory.revision !== revision) throw new Error("Your backpack changed. Choose again.");
  if (offer.price > (crew.shop.allowances[hero.id] ?? 0) || offer.price > crew.economy.gold)
    throw new Error("Not enough reserved gold.");
  return {
    inventory: addItem(hero.inventory, {
      id: `${offer.id}:${offer.stock}`,
      kind: offer.kind,
      count: 1,
    }),
    price: offer.price,
  };
}

export function applyPurchase(state: MatchState, hero: Hero, offerId: string, revision: number) {
  const result = resolvePurchase(state, hero, offerId, revision);
  const crew = state.crews.find((c) => c.id === hero.crewId);
  if (!crew?.shop) throw new Error("Merchant is closed.");
  const offer = crew.shop.offers[hero.id].find((o) => o.id === offerId);
  if (!offer) throw new Error("Offer not found.");
  offer.stock--;
  crew.shop.allowances[hero.id] -= result.price;
  crew.economy.gold -= result.price;
  hero.inventory = result.inventory;
}

export function treatmentCost(hero: Hero, treatment: Treatment) {
  return hero.power * (treatment.kind === "heal" || treatment.kind === "calm" ? 1 : 2);
}
