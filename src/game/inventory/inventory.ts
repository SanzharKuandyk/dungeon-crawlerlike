import type { Inventory, ItemInstance } from "../../shared/inventory-types.js";
import { itemDefinition } from "./catalog.js";

export function addItem(inventory: Inventory, item: ItemInstance): Inventory {
  const next = structuredClone(inventory);
  const stackable = !itemDefinition(item.kind)?.slot;
  let remaining = item.count;
  if (stackable)
    for (const existing of next.backpack.filter((i) => i.kind === item.kind)) {
      const added = Math.min(3 - existing.count, remaining);
      existing.count += added;
      remaining -= added;
    }
  let serial = 0;
  while (remaining > 0) {
    const count = Math.min(stackable ? 3 : 1, remaining);
    const entry = { ...item, id: serial ? `${item.id}:${serial}` : item.id, count } as ItemInstance;
    (next.backpack.length < 6 ? next.backpack : next.overflow).push(entry);
    remaining -= count;
    serial++;
  }
  next.revision++;
  return next;
}

export function consumeItem(inventory: Inventory, itemId: string): Inventory {
  const next = structuredClone(inventory);
  const item = next.backpack.find((i) => i.id === itemId);
  if (!item || itemDefinition(item.kind)?.slot) throw new Error("Choose an owned consumable.");
  item.count--;
  next.backpack = next.backpack.filter((i) => i.count > 0);
  next.revision++;
  return next;
}

export function ownsItem(inventory: Inventory, id: string) {
  return inventory.backpack.find((item) => item.id === id);
}
