<script lang="ts">
  import { GAME_COLORS } from "../../shared/palette.js";

  let { kind, size = 40 }: { kind: string; size?: number } = $props();
</script>
<svg
  class="item-artwork"
  width={size}
  height={size}
  viewBox="0 0 48 48"
  aria-hidden="true"
  fill="none"
  stroke="#302c2b"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  {#if kind === "blade"}
    <path d="m17 29 19-23 5 1-1 6-20 19Z" fill="#87afc3" />
    <path d="m11 27 11 10m-7-6-9 10" stroke="#895122" stroke-width="5" />
  {:else if kind === "piercing-blade"}
    <path d="m12 33 12-18 13-8 5 4-12 8-12 20Z" fill="#a57cbd" />
    <path d="m7 39 11-12" stroke="#895122" stroke-width="6" />
  {:else if kind === "guard-coat"}
    <path d="m16 7-8 6-5 13 9 4v12h24V30l9-4-5-13-8-6-8 6Z" fill="#83aaba" />
    <path d="M24 13v29m-9-17h18" />
  {:else if kind === "ward-vest"}
    <path d="m24 5-17 6v13c0 12 17 19 17 19s17-7 17-19V11Z" fill="#79a8c7" />
    <path d="m24 13 3 8 9 3-9 3-3 9-3-9-9-3 9-3Z" fill="#f1d888" />
  {:else if kind === "haste-charm"}
    <path d="M12 5c0 18 24 18 24 0M24 22v5" stroke="#ae862c" stroke-width="3" />
    <path d="m25 25-10 12h8l-2 9 12-15h-8Z" fill="#e5b53b" />
  {:else if kind === "calm-charm" || kind === "healer-charm"}
    <path d="M12 5c0 18 24 18 24 0M24 22v6" stroke="#ae862c" stroke-width="3" />
    <path d="m24 26 10 8-10 10-10-10Z" fill={kind === "calm-charm" ? "#ae8ec7" : "#72b98a"} />
    <path d={kind === "calm-charm" ? "M24 30c-6 3-2 10 4 6" : "M24 30v9m-4-4h8"} stroke="white" />
  {:else if kind === "draught" || kind === "tonic"}
    <path d="M18 5h12v12l8 13v10H10V30l8-13Z" fill="#fff" />
    <path
      d="M11 29h26v11H11Z"
      fill={kind === "draught" ? GAME_COLORS.healing : GAME_COLORS.magic}
      stroke="none"
    />
    <path d="M18 5h12v7H18Z" fill="#a57542" />
    <path d={kind === "draught" ? "M24 31v7m-3-3h6" : "M25 31c-7 0-5 8 2 5"} stroke="white" />
  {:else if kind === "bandage"}
    <path d="m10 7 30 28-8 9L3 16Z" fill="#e7cfa0" />
    <path d="m14 18 13 12m-16-7 11 11m-4-20 12 11" stroke="#986c35" />
  {:else if kind === "splint"}
    <path d="m13 5 5-2 19 39-5 3Z" fill="#a57542" />
    <path d="m10 16 19-8m-13 20 19-8m-14 20 19-8" stroke="#d8b985" stroke-width="5" />
  {/if}
</svg>
