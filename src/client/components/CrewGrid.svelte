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
    crewIds = null,
  }: {
    view: RoomView;
    arena: ArenaState;
    actor?: string | null;
    selected?: string | null;
    onselect: (id: string) => void;
    crewIds?: string[] | null;
  } = $props();
</script>
<section class="crew-grid" aria-label="Crew expeditions">
  {#each arena.crews.filter((c) => crewIds === null || crewIds.includes(c.id)) as crew (crew.id)}
    <CrewStage {view} {arena} {crew} {actor} selected={selected === crew.id} {onselect} />
  {/each}
  {#if !arena.crews.length}
    <section class="empty-crews">
      <h2>Waiting for players</h2>
      {#if view.role === "host"}
        <p>Open Join as player to test in another tab, or use Invite to share this room.</p>
      {:else}
        <p>Join the room and create a crew to begin.</p>
      {/if}
    </section>
  {/if}
</section>
