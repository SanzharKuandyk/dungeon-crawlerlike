export type EquipmentSlot = "weapon" | "armor" | "charm";
export type ItemKind =
  | "body-blade"
  | "seal-pick"
  | "guard-coat"
  | "ward-vest"
  | "calm-charm"
  | "healer-charm"
  | "draught"
  | "bandage"
  | "tonic"
  | "splint";
export type ItemInstance = { id: string; kind: ItemKind; count: number };
export type Inventory = {
  revision: number;
  equipment: Record<EquipmentSlot, ItemInstance | null>;
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
  | { kind: "heal" | "calm" | "revive" }
  | { kind: "injury"; injury: import("./condition-types.js").InjuryKind }
  | { kind: "affliction"; affliction: import("./condition-types.js").AfflictionKind };
