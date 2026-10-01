<script lang="ts">
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import type { PlayerController } from "../player-controller.js";

  let {
    view,
    controller,
    locked = false,
  }: { view: PlayerRoomView; controller: PlayerController; locked?: boolean } = $props();
  let size = $derived(view.players.filter((p) => p.crewId === view.self.crewId).length);
</script>
<section class="class-picker">
  <h2>Your character</h2>
  <div class="class-options">
    {#each view.classes as c}
      <button
        type="button"
        class:chosen={view.self.classId === c.id}
        disabled={locked || size > c.maxCrewSize}
        onclick={() => void controller.chooseClass(c.id)}
      >
        <img src={`/assets/heroes/${c.id}.svg`} alt="" width="38" height="38">
        <strong>{c.name}</strong><small>{c.description}</small>
        {#if c.maxCrewSize === 2}
          <small>Crews of 1–2</small>
        {/if}
      </button>
    {/each}
  </div>
  {#if view.classNotice}
    <p class="banner" role="status">{view.classNotice}</p>
  {/if}
</section>
