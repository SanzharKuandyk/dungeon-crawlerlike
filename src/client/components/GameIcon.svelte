<script lang="ts">
  import { iconColor } from "../../shared/palette.js";

  let { name, size = 20 }: { name: string; size?: number } = $props();
  const paths: Record<string, string> = {
    "map-overview": "M3 3h18v18H3ZM9 3v18m6-18v18M3 10h18",
    heart: "M12 20S3 14 3 8a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6-9 12-9 12Z",
    stress: "M8 21v-4H5V9a7 7 0 0 1 14 0v4l-3 3v5M10 6l-2 4 4 2-2 4M16 8h1",
    gold: "M4 7c0-2 16-2 16 0s-16 2-16 0Zm0 0v5c0 3 16 3 16 0V7M4 12v5c0 3 16 3 16 0v-5",
    boss: "m3 6 4 3 5-6 5 6 4-3-3 13H6ZM9 14h6",
    weapon: "m7 17 13-13-1 6-9 9M5 14l5 5M3 21l4-4",
    body: "M8 3h8l3 6-3 3v9h-3v-7h-2v7H8v-9L5 9ZM8 3v6h8V3",
    seal: "M5 4h14v16H5ZM8 8h8m-8 4h8m-6 4h4M12 2v2m0 16v2",
    armor: "M8 3 5 7 3 12l4 2v7h10v-7l4-2-2-5-3-4-4 3ZM8 8v9m8-9v9",
    shield: "M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z",
    charm: "M6 3a6 6 0 0 0 12 0M12 9v3m0 0 4 5-4 5-4-5Z",
    backpack: "M6 9h12a2 2 0 0 1 2 2v10H4V11a2 2 0 0 1 2-2ZM8 9V5a4 4 0 0 1 8 0v4M8 14h8v4H8Z",
    draught: "M9 2h6v5l4 6v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6l4-6ZM5 14h14m-7 2v3m-2-1h4",
    bandage: "m6 3 15 15-3 3L3 6Zm3 5 7 7m-8-3 4 4m1-6 4 4",
    tonic: "M9 2h6v5l4 6v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6l4-6ZM12 12l-2 4 4 2",
    splint: "m6 2 3 1 9 19-3-1ZM5 7l9-4M8 13l9-4M11 19l9-4",
    arm: "M6 3v7l-3 6 6 5 9-5 2-8-5-1-2 6-4-2V3M4 15l8 3m-5-6 8 3",
    leg: "M7 2h8l-1 8 4 9v3h-7v-4l-3-5-3 9H2L6 9ZM5 9h9m-8 4h8",
    bleed: "M12 2S5 10 5 15a7 7 0 0 0 14 0C19 10 12 2 12 2ZM8 15a4 4 0 0 0 4 4",
    blessing: "m12 2 2 7 7 3-7 2-2 8-2-8-7-2 7-3ZM3 3l2 2m14 14 2 2",
    curse: "M5 11a7 7 0 1 1 14 0v5l-3 2v3H8v-3l-3-2ZM8 11h2m4 0h2m-6 7v3m4-3v3",
    camp: "M3 19 12 3l9 16ZM7 19l5-8 5 8M3 22h18",
    rest: "M18 3A9 9 0 1 0 21 17 8 8 0 0 1 18 3ZM3 3h1m1 3h1",
    merchant: "M3 9 5 3h14l2 6ZM4 9v12h16V9M8 21v-8h5v8",
    forward: "M4 12h16m-6-6 6 6-6 6",
    leave: "M10 3H4v18h6m-2-9h13m-5-5 5 5-5 5",
    equip: "M4 5h8v4m0 6v4H4V5m5 7h12m-4-4 4 4-4 4",
    swap: "M3 7h18m-4-4 4 4-4 4M21 17H3m4-4-4 4 4 4",
    sell: "M3 3h8l10 10-8 8L3 11ZM7 7h1",
    revive: "M12 21V6m-5 5 5-5 5 5M3 9a9 9 0 1 1 18 0",
    dice: "M4 3h16v18H4ZM8 7h.1M16 7h.1M12 12h.1M8 17h.1M16 17h.1",
    fire: "M12 2c2 6 7 7 7 13a7 7 0 0 1-14 0c0-3 1-5 3-7l1 5c3-3 4-5 3-11Z",
    clock: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM12 7v5l4 2",
    info: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM12 11v6m0-10v1",
    ready: "m4 12 5 5L20 5",
  };
  const aliases: Record<string, string> = {
    "body-blade": "weapon",
    "seal-pick": "seal",
    "guard-coat": "armor",
    "ward-vest": "shield",
    "calm-charm": "stress",
    "healer-charm": "heart",
    "iron-nerve": "stress",
    sealbreaker: "seal",
    "last-stand": "shield",
    "field-medic": "heart",
    "clear-purpose": "ready",
    "second-breath": "revive",
    shaken: "stress",
    doubtful: "weapon",
    brittle: "shield",
    haunted: "curse",
  };
</script>
<svg
  class="game-icon"
  style:--icon-color={iconColor(name)}
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.6"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <path d={paths[aliases[name] ?? name] ?? paths.blessing} />
</svg>
