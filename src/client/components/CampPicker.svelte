<script lang="ts">
  import type { CampChoice } from "../../shared/command-types.js";
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import type { PlayerController } from "../player-controller.js";

  let {
    view,
    controller,
    locked,
  }: { view: PlayerRoomView; controller: PlayerController; locked: boolean } = $props();
  let crew = $derived(view.crews.find((c) => c.id === view.self.crewId));
  let danger = $derived(
    view.heroes
      .filter((h) => h.crewId === view.self.crewId && h.status === "alive" && h.stress >= 5)
      .map((h) => view.players.find((p) => p.id === h.playerId)?.name)
      .join(", "),
  );
</script>
<section class="decision-card">
  <h2>The campfire</h2>
  {#each [
    {
      id: "secure",
      name: `Secure ${crew?.carriedTreasure ?? 0} treasure`,
      description: "Bank the crew’s carried treasure.",
    },
    { id: "rest", name: "Rest", description: "Heal every survivor and remove 2 stress." },
    {
      id: "bargain",
      name: "Bargain",
      description: "Gain 1 stress. Your damaging actions are stronger next depth.",
    },
  ] as choice}
    <button
      type="button"
      class:chosen={view.crewInputs.find((p) => p.playerId === view.self.id)?.camp === choice.id}
      disabled={locked}
      onclick={() => void controller.camp(choice.id as CampChoice)}
    >
      <strong>{choice.name}</strong><small>{choice.description}</small>
    </button>
  {/each}
  {#if danger}
    <p class="warning">Bargain may cause panic: {danger}.</p>
  {/if}
  <p class="confirmed">Crew choice: <strong>{view.winningCamp}</strong></p>
</section>
