<script lang="ts">
  import type { ArenaState } from "../../shared/game-types.js";
  import type { RoomView } from "../../shared/view-types.js";
  import CrewHostMenu from "./CrewHostMenu.svelte";
  import CrewStage from "./CrewStage.svelte";

  let {
    view,
    arena,
    actor = null,
    selected = null,
    onselect,
    hostController = null,
    onrecover = () => {},
  }: {
    view: RoomView;
    arena: ArenaState;
    actor?: string | null;
    selected?: string | null;
    onselect: (id: string) => void;
    hostController?: import("../host-controller.js").HostController | null;
    onrecover?: (id: string) => void;
  } = $props();
</script>
<section class="crew-grid" aria-label="Crew expeditions">
  {#each arena.crews as crew (crew.id)}
    <div class="host-crew-tile">
      {#if hostController && view.role === "host"}
        <CrewHostMenu {view} crewId={crew.id} controller={hostController} {onrecover} />
      {/if}
      <CrewStage {view} {arena} {crew} {actor} selected={selected === crew.id} {onselect} />
    </div>
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
