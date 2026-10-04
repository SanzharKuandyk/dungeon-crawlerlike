import type { ItemDefinition } from "../../shared/inventory-types.js";
export const ITEMS: ItemDefinition[] = [
  {
    kind: "body-blade",
    name: "Body blade",
    slot: "weapon",
    pricePower: 2,
    description: "+P damage to the body",
  },
  {
    kind: "seal-pick",
    name: "Seal pick",
    slot: "weapon",
    pricePower: 2,
    description: "+P damage to seals",
  },
  {
    kind: "guard-coat",
    name: "Guard coat",
    slot: "armor",
    pricePower: 2,
    description: "+P Block barrier",
  },
  {
    kind: "ward-vest",
    name: "Ward vest",
    slot: "armor",
    pricePower: 2,
    description: "First enemy hit reduced by P",
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
export function itemDescription(kind: string, power: number) {
  return (
    itemDefinition(kind)?.description.replace(/(\d*)P\b/g, (_match, multiplier: string) =>
      String(power * (multiplier ? Number(multiplier) : 1)),
    ) ?? ""
  );
}
