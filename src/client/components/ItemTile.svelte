<script lang="ts">
  import { itemDefinition } from "../../game/inventory/catalog.js";
  import type { ItemInstance } from "../../shared/inventory-types.js";
  import GameIcon from "./GameIcon.svelte";
  import ItemArtwork from "./ItemArtwork.svelte";
  import Button from "./ui/Button.svelte";

  let {
    item = null,
    slot = "backpack",
    selected = false,
    onclick,
  }: {
    item?: ItemInstance | null;
    slot?: string;
    selected?: boolean;
    onclick?: () => void;
  } = $props();
</script>
<Button
  type="button"
  aria-pressed={selected}
  aria-label={item ? itemDefinition(item.kind)?.name : `Empty ${slot} slot`}
  disabled={!item}
  {onclick}
  class={`item-tile ${!item ? "empty" : ""} ${selected ? "chosen" : ""}`}
>
  {#if item}
    <ItemArtwork kind={item.kind} />
  {:else}
    <GameIcon name={slot} size={28} />
  {/if}
  <span>{item ? itemDefinition(item.kind)?.name : slot}</span>
  {#if item && item.count > 1}
    <b class="item-count">{item.count}</b>
  {/if}
</Button>
