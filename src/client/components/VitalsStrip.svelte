<script lang="ts">
  import type { Hero } from "../../shared/game-types.js";

  let { hero }: { hero: Hero } = $props();
</script>

<div class="vitals-strip">
  <div>
    <span>{hero.hp}/{hero.maxHp} <small>HP</small></span>
    <meter min="0" max={hero.maxHp} value={hero.hp} aria-label="Your health"></meter>
  </div>
  <div>
    <span>{hero.stress}/6 <small>Stress</small></span>
    <meter min="0" max="6" value={hero.stress} aria-label="Your stress"></meter>
  </div>
</div>
