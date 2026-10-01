<script lang="ts">
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
    <img src={`/assets/heroes/${hero.classId}.svg`} alt={hero.classId}>
  </div>
  <div>
    <strong>{name}{selected ? " · YOU" : ""}</strong><small>{crewName} · {hero.classId}</small>
    {#if hero.status === "alive"}
      <div class="hero-bars">
        <span>Health {hero.hp}/{hero.maxHp}</span
        ><meter min="0" max={hero.maxHp} value={hero.hp} aria-label="Health"></meter
        ><span>Stress {hero.stress}/6</span
        ><meter min="0" max="6" value={hero.stress} aria-label="Stress"></meter>
      </div>
    {:else}
      <p class="spirit-label">Spirit · Your character has fallen</p>
    {/if}
    {#if hero.equipment}
      <small
        >{hero.equipment.kind}
        · {hero.equipment.charges} charge{hero.equipment.charges === 1 ? "" : "s"}</small
      >
    {/if}
  </div>
</header>
