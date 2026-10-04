<script lang="ts">
  import { CLASS_NAMES } from "../../shared/display-names.js";
  import type { Hero } from "../../shared/game-types.js";

  let {
    hero,
    name,
    crewName,
    selected = false,
  }: { hero: Hero; name: string; crewName: string; selected?: boolean } = $props();
</script>
<header class="hero-card">
  <div class="hero-portrait" class:fallen={hero.status === "dead"}>
    <img src={`/assets/heroes/${hero.classId}.svg`} alt={CLASS_NAMES[hero.classId]}>
  </div>
  <div>
    <strong>{name}{selected ? " · YOU" : ""}</strong
    ><small>{crewName} · {CLASS_NAMES[hero.classId]}</small>
    {#if hero.status === "alive"}
      <div class="hero-bars">
        <span>Health {hero.hp}/{hero.maxHp}</span
        ><meter min="0" max={hero.maxHp} value={hero.hp} aria-label="Health"></meter
        ><span>Stress {hero.stress}/10</span
        ><meter min="0" max="10" value={hero.stress} aria-label="Stress"></meter>
      </div>
    {:else}
      <p class="spirit-label">Spirit · Your character has fallen</p>
    {/if}
  </div>
</header>
