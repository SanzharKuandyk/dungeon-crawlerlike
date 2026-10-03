<script lang="ts">
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import type { PlayerController } from "../player-controller.js";
  import ExpeditionMap from "./ExpeditionMap.svelte";

  let {
    view,
    controller,
    locked,
  }: { view: PlayerRoomView; controller: PlayerController; locked: boolean } = $props();
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
    <header class="route-vote-heading">
      <h2>
        <span class="route-floor"
          >Floor {((view.depth - 1) % view.expeditionMap.rows) + 1}/{view.expeditionMap.rows}</span
        >
        · Choose a room
      </h2>
      <button
        type="button"
        class="quiet"
        popovertarget={`route-votes-${view.self.id}`}
        aria-label={`Crew votes: ${votes.length} of ${voters.length}`}
      >
        {votes.length}/{voters.length}
        voted
      </button>
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
    </header>

    <ExpeditionMap
      map={view.expeditionMap}
      crews={view.crews}
      focusCrewId={view.self.crewId}
      reachable={view.reachableNodeIds}
      ownVote={ownVote ?? null}
      crewChoice={votes.length ? view.winningRoute : null}
      voteCounts={Object.fromEntries(
        view.reachableNodeIds.map((id) => [id, votes.filter((vote) => vote.route === id).length]),
      )}
      {locked}
      voting
      onvote={(id) => void controller.route(id)}
    />
  </section>
{:else}
  <section class="decision-card">
    <h2>Choose a door</h2>
    <div class="route-options">
      {#each view.offeredRooms as destination}
        <button
          type="button"
          class="route-door"
          class:chosen={ownVote === destination.id}
          class:crew-choice={votes.length > 0 && view.winningRoute === destination.id}
          aria-pressed={ownVote === destination.id}
          disabled={locked}
          onclick={() => void controller.route(destination.id)}
        >
          <img class="door-art" src={`/assets/rooms/${destination.family}.svg`} alt="">
          <span class="door-heading"
            ><span class="risk-tag">{destination.risk} risk</span>
            {#if votes.length > 0 && view.winningRoute === destination.id}
              <span class="crew-choice-label">Crew choice</span>
            {/if}</span
          ><strong>{destination.name}</strong><small>{destination.description}</small
          ><small
            >{view.depth + { low: 1, medium: 2, high: 3 }[destination.risk]}
            treasure · {votes.filter((p) => p.route === destination.id).length} votes{ownVote ===
            destination.id
              ? " · Your vote ✓"
              : ""}</small
          >
          {#if view.rivalryRoomIds.includes(destination.id)}
            <span class="rivalry-warning"
              >Rivalry door · exactly two crews fight each other. Death is permanent.</span
            >
          {/if}
        </button>
      {/each}
    </div>
    <details class="crew-votes">
      <summary>Crew votes · {votes.length}/{voters.length}</summary>
      <ul class="vote-list">
        {#each voters as member}
          <li>
            <span>{member.name}</span
            ><strong
              >{view.offeredRooms.find((r) => r.id === member.route)?.name ?? "Not voted"}</strong
            >
          </li>
        {/each}
      </ul>
    </details>
  </section>
{/if}
