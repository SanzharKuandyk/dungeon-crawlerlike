<script lang="ts">
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import type { PlayerController } from "../player-controller.js";

  let {
    view,
    controller,
    locked,
  }: { view: PlayerRoomView; controller: PlayerController; locked: boolean } = $props();
</script>
<section class="decision-card">
  <h2>Choose your crew’s room</h2>
  <div class="route-options">
    {#each view.offeredRooms as destination}
      <button
        type="button"
        class:chosen={view.crewInputs.find((p) => p.playerId === view.self.id)?.route ===
          destination.id}
        disabled={locked}
        onclick={() => void controller.route(destination.id)}
      >
        <span class="risk-tag">{destination.risk} risk</span><strong>{destination.name}</strong
        ><small>{destination.description}</small
        ><small
          >Treasure bundle: {view.depth + { low: 1, medium: 2, high: 3 }[destination.risk]}</small
        >
      </button>
    {/each}
  </div>
  <p class="confirmed">
    Crew choice: <strong>{view.offeredRooms.find((r) => r.id === view.winningRoute)?.name}</strong>
  </p>
  <ul class="vote-list">
    {#each view.crewInputs.filter((p) =>
      view.heroes.some((h) => h.playerId === p.playerId && h.status === "alive"),
    ) as member}
      <li>
        <span>{member.name}</span
        ><strong
          >{view.offeredRooms.find((r) => r.id === member.route)?.name ?? "Not voted"}</strong
        >
      </li>
    {/each}
  </ul>
</section>
