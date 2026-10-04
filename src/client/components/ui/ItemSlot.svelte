<script lang="ts">
  import { itemDefinition } from "../../../game/inventory/catalog.js";
  import type { ItemKind } from "../../../shared/inventory-types.js";
  import GameIcon from "../GameIcon.svelte";
  import ItemArtwork from "../ItemArtwork.svelte";
  import Button from "./Button.svelte";

  let {
    kind,
    selected = false,
    onclick,
    label,
    disabled = false,
  }: {
    kind: ItemKind | null;
    selected?: boolean;
    onclick?: () => void;
    label?: string;
    disabled?: boolean;
  } = $props();
</script>
<Button
  class={`item-tile ${selected ? "chosen" : ""}`}
  aria-pressed={selected}
  {onclick}
  {disabled}
>
  {#if kind}
    <ItemArtwork {kind} />
  {:else}
    <GameIcon name="backpack" size={28} />
  {/if}
  <span>{label ?? (kind ? itemDefinition(kind)?.name : "Empty")}</span>
</Button>
