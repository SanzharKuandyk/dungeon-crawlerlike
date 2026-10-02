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
  {:else}
    <path d="m5 9 6 6 5-11 5 11 6-6-3 15H8L5 9Zm3 19h16" />
  {/if}
</svg>
