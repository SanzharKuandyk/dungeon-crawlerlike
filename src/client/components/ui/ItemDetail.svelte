<script lang="ts">
  import { itemDefinition, itemDescription } from "../../../game/inventory/catalog.js";
  import type { ItemKind } from "../../../shared/inventory-types.js";
  import ItemArtwork from "../ItemArtwork.svelte";

  let { kind, power, comparison }: { kind: ItemKind; power: number; comparison?: ItemKind | null } =
    $props();
</script>
<section class="item-detail">
  <header>
    <ItemArtwork {kind} />
    <div>
      <strong>{itemDefinition(kind)?.name}</strong
      ><small>{itemDefinition(kind)?.slot ?? "Consumable"}</small>
    </div>
  </header>
  <p>{itemDescription(kind, power)}</p>
  {#if comparison}
    <div class="item-comparison">
      <small>Currently equipped</small><strong>{itemDefinition(comparison)?.name}</strong>
      <p>{itemDescription(comparison, power)}</p>
    </div>
  {:else if comparison === null && itemDefinition(kind)?.slot}
    <small>Slot empty</small>
  {/if}
</section>
