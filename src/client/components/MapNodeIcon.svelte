<script lang="ts">
  import type { MapNodeKind } from "../../shared/map-types.js";

  let { kind }: { kind: MapNodeKind } = $props();
</script>

<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
  {#if kind === "battle" || kind === "elite"}
    <path d="m7 5 17 17m-4 5 7-7M5 7l3-3 5 5-4 4Zm20-2L8 22m4 5-7-7m22-13-3-3-5 5 4 4Z" />
    {#if kind === "elite"}
      <path d="m13 3 3-2 3 2" />
    {/if}
  {:else if kind === "camp"}
    <path d="M16 3 4 26h24L16 3Zm0 12-5 11h10l-5-11ZM3 29h26" />
  {:else if kind === "treasure"}
    <path d="M5 13V8h22v5M4 13h24v14H4V13Zm0 7h24M13 17h6v6h-6v-6Z" />
  {:else if kind === "event"}
    <path d="M10 10a6 6 0 1 1 9 5c-3 2-3 3-3 6" />
    <circle cx="16" cy="27" r="1" />
  {:else if kind === "merchant"}
    <path d="M5 13h22v15H5ZM3 13l4-9h18l4 9ZM10 28V17h7v11m4-11h3v5h-3Z" />
  {:else if kind === "altar"}
    <path d="M6 24h20v5H6Zm4-2v-7h12v7M16 2c-5 5-8 10-4 12 7 4 11-5 4-12Z" />
  {:else if kind === "shrine"}
    <path
      d="M16 23S6 18 6 12a6 6 0 0 1 10-4 6 6 0 0 1 10 4c0 6-10 11-10 11ZM4 28h24M16 1v3M3 7l3 2m20 0 3-2"
    />
  {:else if kind === "arena"}
    <circle cx="16" cy="16" r="14" />
    <path d="m9 9 14 14m-4 2 6-6M9 23 23 9M7 19l6 6" />
  {:else}
    <path d="m5 9 6 6 5-11 5 11 6-6-3 15H8L5 9Zm3 19h16" />
  {/if}
</svg>
