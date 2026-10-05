import type { Hero, MatchState } from "../../shared/game-types.js";
import type { ShopVisit, Treatment } from "../../shared/inventory-types.js";
import { reserveAllowances } from "../progression/economy.js";
import { shuffled } from "../random.js";
import { ITEMS, makeItem } from "./catalog.js";
import { addItem } from "./inventory.js";

export function createShop(state: MatchState, crewId: string, nodeId: string): ShopVisit {
  const crew = state.crews.find((c) => c.id === crewId);
  if (!crew) throw new Error("Crew not found.");
  const heroes = state.heroes.filter((h) => h.crewId === crewId);
  return {
    nodeId,
    allowances: reserveAllowances(crew.economy.gold, heroes),
    upgrades: Object.fromEntries(
      heroes.map((hero) => [
        hero.id,
        [...hero.inventory.backpack, ...Object.values(hero.inventory.equipment)]
          .filter(
            (i): i is import("../../shared/inventory-types.js").EquipmentInstance =>
              !!i && "rank" in i && i.rank === 1,
          )
          .map((i) => ({
            id: `${nodeId}:${hero.id}:upgrade:${i.id}`,
            targetItemId: i.id,
            price: hero.power,
            used: false,
          })),
      ]),
    ),
    offers: Object.fromEntries(
      heroes.map((h) => {
        const gear = shuffled(
          ITEMS.filter(
            (i) =>
              i.slot &&
              (i.kind !== "haste-charm" ||
                state.crewProgress[crewId].chapter > 1 ||
                state.crewProgress[crewId].depth >= 8),
          ),
          state.seed + state.chapterMaps.flatMap((m) => m.nodes).findIndex((n) => n.id === nodeId),
        );
        const stock = [
          ...ITEMS.filter((i) => !i.slot),
          ...(["weapon", "armor", "charm"] as const)
            .map((slot) => gear.find((i) => i.slot === slot))
            .filter((i) => i !== undefined),
        ];
        if (
          state.crewProgress[crewId].chapter === 1 &&
          state.crewProgress[crewId].depth === 8 &&
          !stock.some((i) => i.kind === "haste-charm")
        ) {
          const haste = ITEMS.find((i) => i.kind === "haste-charm");
          if (haste) stock.push(haste);
        }
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
    inventory: addItem(hero.inventory, makeItem(`${offer.id}:${offer.stock}`, offer.kind)),
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
export function applyUpgrade(
  state: MatchState,
  hero: Hero,
  offerId: string,
  targetItemId: string,
  revision: number,
) {
  const crew = state.crews.find((c) => c.id === hero.crewId),
    shop = crew?.shop;
  const offer = shop?.upgrades[hero.id]?.find(
    (o) => o.id === offerId && o.targetItemId === targetItemId,
  );
  const item = [...hero.inventory.backpack, ...Object.values(hero.inventory.equipment)].find(
    (i) => i?.id === targetItemId,
  );
  if (!crew || !shop || !offer || offer.used || !item || !("rank" in item) || item.rank !== 1)
    throw new Error("This upgrade target is unavailable.");
  if (revision !== hero.inventory.revision) throw new Error("Your Bag changed. Choose again.");
  if (offer.price > (shop.allowances[hero.id] ?? 0) || offer.price > crew.economy.gold)
    throw new Error("Not enough reserved gold.");
  item.rank = 2;
  hero.inventory.revision++;
  offer.used = true;
  crew.economy.gold -= offer.price;
  shop.allowances[hero.id] -= offer.price;
  return { item: item.kind, paid: offer.price };
}
