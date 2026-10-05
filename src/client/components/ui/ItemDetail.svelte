<script lang="ts">
  import { itemDefinition, itemDescription } from "../../../game/inventory/catalog.js";
  import type { ItemKind } from "../../../shared/inventory-types.js";
  import ItemArtwork from "../ItemArtwork.svelte";

  let {
    kind,
    power,
    rank = 1,
    comparison,
    comparisonRank = 1,
  }: {
    kind: ItemKind;
    power: number;
    rank?: 1 | 2;
    comparison?: ItemKind | null;
    comparisonRank?: 1 | 2;
  } = $props();
</script>
<section class="item-detail">
  <header>
    <ItemArtwork {kind} />
    <div>
      <strong>{itemDefinition(kind)?.name}</strong
      ><small
        >{itemDefinition(kind)?.slot
          ? `${itemDefinition(kind)?.slot} · Rank ${rank === 2 ? "II" : "I"}`
          : "Consumable"}</small
      >
    </div>
  </header>
  <p>{itemDescription(kind, power, rank)}</p>
  {#if comparison}
    <div class="item-comparison">
      <small>Currently equipped</small><strong>{itemDefinition(comparison)?.name}</strong>
      <p>{itemDescription(comparison, power, comparisonRank)}</p>
      <p class="swap-destination">
        Equip replaces {itemDefinition(comparison)?.name}; it moves to your Bag.
      </p>
    </div>
  {:else if comparison === null && itemDefinition(kind)?.slot}
    <small>Slot empty</small>
  {/if}
</section>
