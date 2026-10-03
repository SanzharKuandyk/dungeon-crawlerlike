<script lang="ts">
  import type { EquipmentKind } from "../../shared/game-types.js";

  let { kind, size = 32 }: { kind: EquipmentKind | "bag"; size?: number } = $props();
</script>
<svg
  width={size}
  height={size}
  viewBox="0 0 48 48"
  fill="none"
  stroke="currentColor"
  stroke-width="2.4"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if kind === "ward"}
    <path
      d="M24 5Q15 11 8 10v14q1 12 16 19 15-7 16-19V10Q32 11 24 5Z"
      fill="currentColor"
      fill-opacity=".08"
    />
    <path d="M24 14q-9 6-8 12t8 9q7-4 8-9t-8-12Z" />
    <path d="M24 19v11m-5-6h10" />
  {:else if kind === "salve"}
    <path
      d="M18 6h12v8l7 9q3 4 2 13-1 6-15 6T9 36q-1-9 2-13l7-9Z"
      fill="currentColor"
      fill-opacity=".08"
    />
    <path d="M16 6h16M16 13h16M10 28q14-5 28 0M24 24v12m-6-6h12M14 35q0 3 4 3" />
  {:else if kind === "lantern"}
    <path
      d="M18 10V7a6 6 0 0 1 12 0v3M14 14h20l5 24q-15 8-30 0ZM12 14l12-8 12 8M15 41h18"
      fill="currentColor"
      fill-opacity=".08"
    />
    <path d="M24 19q7 8 4 13t-9 0q-2-4 5-13ZM16 17l-3 19m19-19 3 19" />
  {:else}
    <path
      d="M16 14q-5-8 0-9l8 3 8-3q5 1 0 9l7 12q9 18-15 18T9 26Z"
      fill="currentColor"
      fill-opacity=".08"
    />
    <path d="M15 14q9 4 18 0M24 17l-3 10m4-10 5 7M14 33q0 5 5 5" />
  {/if}
</svg>
