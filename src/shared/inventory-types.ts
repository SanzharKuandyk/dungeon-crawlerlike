export type EquipmentSlot = "weapon" | "armor" | "charm";
export type EquipmentKind =
  | "blade"
  | "piercing-blade"
  | "guard-coat"
  | "ward-vest"
  | "calm-charm"
  | "healer-charm"
  | "haste-charm";
export type ConsumableKind = "draught" | "bandage" | "tonic" | "splint";
export type ItemKind = EquipmentKind | ConsumableKind;
export type EquipmentInstance = { id: string; kind: EquipmentKind; count: 1; rank: 1 | 2 };
export type ItemInstance = EquipmentInstance | { id: string; kind: ConsumableKind; count: number };
export type Inventory = {
  revision: number;
  equipment: Record<EquipmentSlot, EquipmentInstance | null>;
  backpack: ItemInstance[];
  overflow: ItemInstance[];
};
export type ItemDefinition = {
  kind: ItemKind;
  name: string;
  slot: EquipmentSlot | null;
  pricePower: number;
  description: string;
};
export type ShopOffer = { id: string; kind: ItemKind; price: number; stock: number };
export type ShopVisit = {
  nodeId: string;
  allowances: Record<string, number>;
  offers: Record<string, ShopOffer[]>;
  upgrades: Record<string, { id: string; targetItemId: string; price: number; used: boolean }[]>;
};
export type InventoryCommand =
  | {
      kind: "blessing";
      offerId: string;
      replace: import("./condition-types.js").BlessingKind | null;
    }
  | { kind: "splint"; itemId: string; injury: import("./condition-types.js").InjuryKind }
  | { kind: "keep-overflow"; itemId: string }
  | { kind: "equip"; itemId: string }
  | { kind: "sell"; itemId: string }
  | { kind: "unequip"; slot: EquipmentSlot }
  | { kind: "transfer"; itemId: string; targetHeroId: string }
  | { kind: "overflow"; itemId: string; replaceItemId: string | null };
export type Treatment =
  | { kind: "heal" | "calm" }
  | { kind: "injury"; injury: import("./condition-types.js").InjuryKind }
  | { kind: "affliction"; affliction: import("./condition-types.js").AfflictionKind };
