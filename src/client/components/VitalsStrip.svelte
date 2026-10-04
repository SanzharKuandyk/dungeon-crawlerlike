<script lang="ts">
  import type { Hero } from "../../shared/game-types.js";
  import HeroEffects from "./HeroEffects.svelte";
  import StatusBar from "./ui/StatusBar.svelte";

  let { hero, effects = true }: { hero: Hero; effects?: boolean } = $props();
</script>

<div class="vitals-strip">
  <StatusBar label="HP" ariaLabel="Your health" value={hero.hp} max={hero.maxHp} />
  <StatusBar label="Stress" icon="stress" ariaLabel="Your stress" value={hero.stress} max={10} />
</div>

{#if effects}
  <HeroEffects {hero} />
{/if}
