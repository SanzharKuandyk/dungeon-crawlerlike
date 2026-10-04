<script lang="ts">
  import { GAME_COLORS } from "../../shared/palette.js";

  let { kind }: { kind: string } = $props();
  let color = $derived(
    kind === "brace" || kind === "protect"
      ? GAME_COLORS.protection
      : kind === "mend" || kind === "channel"
        ? GAME_COLORS.healing
        : kind === "hex"
          ? GAME_COLORS.magic
          : kind === "pilfer"
            ? GAME_COLORS.gold
            : kind === "attack" || kind === "skirmish"
              ? GAME_COLORS.attack
              : undefined,
  );
</script>

<svg
  class="action-icon"
  style:--icon-color={color}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.6"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if kind.includes("attack") || kind.includes("skirmish")}
    <path d="m7 17 13-13-1 6-9 9M5 14l5 5M3 21l4-4" />
  {:else if kind === "brace" || kind === "protect"}
    <path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z" />
    {#if kind === "protect"}
      <path d="M12 8v8m-4-4h8" />
    {/if}
  {:else if kind === "loot" || kind.includes("pilfer")}
    <path d="M4 9h16v11H4ZM4 9V5h16v4M10 9v4h4V9M12 5v4" />
  {:else if kind === "use-item"}
    <path d="M5 8h14v13H5ZM8 8V5a4 4 0 0 1 8 0v3M8 12h8v5H8Z" />
  {:else if kind === "mend"}
    <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z" />
  {:else if kind.includes("hex")}
    <path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3Z" />
  {:else if kind.includes("channel")}
    <path d="M9 4h6l2 5-2 4H9L7 9ZM9 13v7h6v-7M10 7h4M12 3V1" />
  {:else if kind === "crew"}
    <circle cx="9" cy="7" r="3" />
    <path d="M3 21v-3a6 6 0 0 1 12 0v3m1-17a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5v2" />
  {:else if kind === "confirm"}
    <path d="m5 12 4 4L19 6" />
  {/if}
</svg>
