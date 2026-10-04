<script lang="ts">
  import type { Hero } from "../../shared/game-types.js";
  import { heroEffects } from "../hero-effects.js";
  import GameIcon from "./GameIcon.svelte";
  import InspectPopover from "./ui/InspectPopover.svelte";

  let { hero }: { hero: Hero } = $props();
  let effects = $derived(heroEffects(hero));
</script>
{#if effects.length}
  <section class="hero-effects" aria-label="Active effects and build bonuses">
    {#each effects as effect (effect.id)}
      <span class="effect-chip" data-tone={effect.tone} class:spent={effect.used}>
        <InspectPopover label={effect.label}>
          {#snippet trigger()}
            <GameIcon name={effect.icon} size={16} />
            <span>{effect.label}</span>
            {#if effect.value}
              <strong>{effect.value}</strong>
            {/if}
          {/snippet}
          <strong>{effect.label}</strong>
          <p>{effect.detail}</p>
        </InspectPopover>
      </span>
    {/each}
  </section>
{/if}
