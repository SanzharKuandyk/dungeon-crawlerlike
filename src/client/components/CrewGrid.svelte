<script lang="ts">
  import type { ArenaState } from "../../shared/game-types.js";
  import type { RoomView } from "../../shared/view-types.js";
  import CrewStage from "./CrewStage.svelte";

  let {
    view,
    arena,
    actor = null,
    selected = null,
    onselect,
  }: {
    view: RoomView;
    arena: ArenaState;
    actor?: string | null;
    selected?: string | null;
    onselect: (id: string) => void;
  } = $props();
</script>
<section class="crew-grid" aria-label="Crew expeditions">
  {#each arena.crews as crew (crew.id)}
    <CrewStage {view} {arena} {crew} {actor} selected={selected === crew.id} {onselect} />
  {/each}
</section>
{#if !arena.crews.length}
  <section class="empty-crews">
    <h2>Gather your crew</h2>
    <p>Join the room and choose a character.</p>
  </section>
{/if}
