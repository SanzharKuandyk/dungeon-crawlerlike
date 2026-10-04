<script lang="ts">
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import type { PlayerController } from "../player-controller.js";
  import ExpeditionMap from "./ExpeditionMap.svelte";
  import Button from "./ui/Button.svelte";
  import DecisionFooter from "./ui/DecisionFooter.svelte";
  import ReadyStatus from "./ui/ReadyStatus.svelte";

  let {
    view,
    controller,
    locked,
  }: { view: PlayerRoomView; controller: PlayerController; locked: boolean } = $props();
  let selected = $state<string | null>(null);
  let phaseId = $state(-1);
  $effect(() => {
    if (phaseId !== view.phaseId) {
      phaseId = view.phaseId;
      selected = null;
    }
  });
  let voters = $derived(
    view.crewInputs.filter((p) =>
      view.heroes.some((h) => h.playerId === p.playerId && h.status === "alive"),
    ),
  );
  let votes = $derived(voters.filter((p) => p.route !== null));
  let ownVote = $derived(voters.find((p) => p.playerId === view.self.id)?.route);
</script>
{#if view.expeditionMap}
  <section class="map-route-picker">
    <div class="tactics-content" id={`route-votes-${view.self.id}`} popover="auto">
      <ul class="vote-list">
        {#each voters as member}
          <li>
            <span>{member.name}</span
            ><strong
              >{view.expeditionMap.nodes.find((node) => node.id === member.route)?.room.name ??
                "Not voted"}</strong
            >
          </li>
        {/each}
      </ul>
    </div>

    <ExpeditionMap
      roomId={view.id}
      floor={((view.depth - 1) % view.expeditionMap.rows) + 1}
      map={view.expeditionMap}
      crews={view.crews}
      focusCrewId={view.self.crewId}
      reachable={view.reachableNodeIds}
      ownVote={selected ?? ownVote ?? null}
      crewChoice={votes.length ? view.winningRoute : null}
      voteCounts={Object.fromEntries(
        view.reachableNodeIds.map((id) => [id, votes.filter((vote) => vote.route === id).length]),
      )}
      locked={locked || view.decisionReady}
      voting
      preview={!view.decisionReady}
      onvote={(id) => (selected = id)}
    />
    <DecisionFooter
      hint={view.decisionReady ? "Waiting for your crew" : "Choose a connected destination"}
    >
      <Button
        variant="quiet"
        popovertarget={`route-votes-${view.self.id}`}
        aria-label={`Crew votes: ${votes.length} of ${voters.length}`}
        ><ReadyStatus
          ready={votes.length}
          total={voters.length}
          confirmed={view.decisionReady}
        /></Button
      >
      {#if view.decisionReady}
        <Button disabled={locked} onclick={() => void controller.edit()}>Change</Button>
      {:else}
        <Button
          primary
          pending={locked && controller.pending > 0}
          disabled={locked || !selected}
          onclick={() => selected && void controller.route(selected)}
          >Ready to travel</Button
        >
      {/if}
    </DecisionFooter>
  </section>
{/if}
