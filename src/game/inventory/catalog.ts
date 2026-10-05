import type {
  ConsumableKind,
  EquipmentInstance,
  EquipmentKind,
  ItemDefinition,
  ItemInstance,
  ItemKind,
} from "../../shared/inventory-types.js";
export const ITEMS: ItemDefinition[] = [
  {
    kind: "blade",
    name: "Blade",
    slot: "weapon",
    pricePower: 2,
    description: "+P direct damage",
  },
  {
    kind: "piercing-blade",
    name: "Piercing blade",
    slot: "weapon",
    pricePower: 2,
    description: "Ignore P enemy Block per attack",
  },
  {
    kind: "guard-coat",
    name: "Guard coat",
    slot: "armor",
    pricePower: 2,
    description: "Choosing Block grants P extra Block to you this turn",
  },
  {
    kind: "ward-vest",
    name: "Ward vest",
    slot: "armor",
    pricePower: 2,
    description: "Absorb up to P damage from the first enemy hit each fight",
  },
  {
    kind: "calm-charm",
    name: "Calm charm",
    slot: "charm",
    pricePower: 2,
    description: "First stress gain reduced by 1",
  },
  {
    kind: "healer-charm",
    name: "Healer charm",
    slot: "charm",
    pricePower: 2,
    description: "First heal gains P",
  },
  {
    kind: "haste-charm",
    name: "Haste charm",
    slot: "charm",
    pricePower: 2,
    description: "Once per fight: one extra action",
  },
  { kind: "draught", name: "Healing draught", slot: null, pricePower: 1, description: "Heal 2P" },
  {
    kind: "bandage",
    name: "Bandage",
    slot: null,
    pricePower: 1,
    description: "Remove Bleed; heal P",
  },
  {
    kind: "tonic",
    name: "Calming tonic",
    slot: null,
    pricePower: 1,
    description: "Remove 3 stress",
  },
  {
    kind: "splint",
    name: "Splint",
    slot: null,
    pricePower: 2,
    description: "Treat one injury outside combat",
  },
];
export const itemDefinition = (kind: string) => ITEMS.find((item) => item.kind === kind);
export function itemDescription(kind: string, power: number, rank: 1 | 2 = 1) {
  if (kind === "calm-charm") return `Prevent the first ${rank} stress gained each fight.`;
  if (kind === "haste-charm")
    return `Once each fight attempt: choose two actions${rank === 2 ? ` and gain ${power} Block` : ""}. At most one skill and one item.`;
  return (
    itemDefinition(kind)?.description.replace(/(\d*)P\b/g, (_match, multiplier: string) =>
      String(
        power * (multiplier ? Number(multiplier) : 1) * (itemDefinition(kind)?.slot ? rank : 1),
      ),
    ) ?? ""
  );
}
export function makeItem(id: string, kind: ItemKind, count = 1, rank: 1 | 2 = 1): ItemInstance {
  return itemDefinition(kind)?.slot
    ? { id, kind: kind as EquipmentKind, count: 1, rank }
    : { id, kind: kind as ConsumableKind, count };
}
export function equipmentItem(item: ItemInstance): EquipmentInstance {
  if (!("rank" in item)) throw new Error("Choose equipment.");
  return item;
}
