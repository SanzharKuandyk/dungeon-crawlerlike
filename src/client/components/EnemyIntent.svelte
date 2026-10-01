<script lang="ts">
  import { enemyIntent } from "../../game/enemy-actions.js";
  import type { Hero, RoomEncounter } from "../../shared/game-types.js";

  let {
    encounter,
    hero,
    depth,
    turn,
  }: { encounter: RoomEncounter; hero: Hero; depth: number; turn: number } = $props();
  let intent = $derived(enemyIntent(encounter, hero, depth, turn));
</script>
<section class="enemy-intent">
  <div class="section-heading">
    <strong>{encounter.definition.family}</strong
    ><span>{encounter.bodyHp}/{encounter.maxBodyHp} health</span>
  </div>
  <p><span class="intent-icon">!</span>Next attack: <strong>{intent.description}</strong></p>
  <small
    >{encounter.weakHp > 0
      ? `Weak point: ${encounter.weakHp}/${encounter.maxWeakHp} · ${encounter.definition.description}`
      : "Weak point broken · Its special attack is disabled."}</small
  >
</section>
