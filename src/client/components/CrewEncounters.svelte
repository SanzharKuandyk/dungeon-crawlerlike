<script lang="ts">
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import type { PlayerController } from "../player-controller.js";

  let {
    view,
    controller,
    locked,
  }: { view: PlayerRoomView; controller: PlayerController; locked: boolean } = $props();
  let own = $derived(view.crews.find((crew) => crew.id === view.self.crewId));
  let node = $derived(
    view.expeditionMap?.nodes.find((node) => node.id === own?.mapPosition?.nodeId),
  );
  let offer = $derived(
    view.duels.find(
      (duel) => duel.status === "offered" && duel.crewIds.includes(view.self.crewId ?? ""),
    ),
  );
  let rivals = $derived(
    view.crews.filter(
      (crew) =>
        crew.id !== own?.id &&
        crew.status === "active" &&
        node &&
        crew.mapPosition?.nodeId === node.id,
    ),
  );
  let safe = $derived(["equipment", "return", "route", "floor-result"].includes(view.phase.kind));
</script>
{#if view.hero?.status === "alive" &&
  !view.quizActive &&
  (offer || (safe && node && ["battle", "elite"].includes(node.kind) && rivals.length))}
  <details class="crew-meeting" open={!!offer}>
    <summary>
      {offer
        ? "Crew challenge"
        : `${rivals.length} other crew${rivals.length === 1 ? "" : "s"} here`}
    </summary>
    <p>
      Optional duel: three exchanges. Wager up to 3 carried treasure each. Largest share of rival
      health removed wins; ties return stakes. No deaths. Every fighter needs half health. Both
      crews must agree.
    </p>
    {#if offer}
      {#each offer.consent as consent}
        <small
          >{view.crews.find((crew) => crew.id === consent.crewId)?.name}:
          {consent.yes}/{consent.needed}
          agree</small
        >
      {/each}
      <div>
        <button
          type="button"
          disabled={locked || offer.ownVote === true}
          onclick={() => void controller.duelVote(offer.id, true)}
        >
          Accept duel
        </button><button
          type="button"
          disabled={locked}
          onclick={() => void controller.duelVote(offer.id, false)}
        >
          Continue peacefully
        </button>
      </div>
      <small
        >Starts after both encounters and rewards finish. Offer expires after 30 seconds. Anyone can
        decline.</small
      >
    {:else}
      {#each rivals as rival}
        <button
          type="button"
          disabled={locked || !view.pvpEnabled}
          onclick={() => void controller.challenge(rival.id)}
        >
          Challenge {rival.symbol} · {rival.name}
        </button>
      {/each}
      <small
        >Once per pair, at most two challenges per crew. Camps, caches and the guardian are
        safe.</small
      >
    {/if}
  </details>
{/if}
