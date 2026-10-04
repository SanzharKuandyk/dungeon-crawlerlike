<script lang="ts">
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import type { PlayerController } from "../player-controller.js";
  import Button from "./ui/Button.svelte";

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
      (duel) =>
        ["offered", "champion-offer"].includes(duel.status) &&
        duel.crewIds.includes(view.self.crewId ?? ""),
    ),
  );
  let rivals = $derived(
    view.crews.filter(
      (crew) =>
        crew.id !== own?.id &&
        crew.status === "active" &&
        node &&
        crew.mapPosition?.chapter === own?.mapPosition?.chapter,
    ),
  );
  let safe = $derived(["camp"].includes(view.phase.kind));
</script>
{#if view.hero?.status === "alive" &&
  !view.quizActive &&
  (offer || (safe && node && node.kind === "arena"))}
  <details class="crew-meeting" open={!!offer}>
    <summary>
      {offer
        ? offer.npc
          ? "Arena champion"
          : "Crew challenge"
        : `${rivals.length} other crew${rivals.length === 1 ? "" : "s"} here`}
    </summary>
    <p>
      Three exchanges. Winner: 12 gold; other crew: 6 gold. Consumables for both. Nonlethal. Gear,
      conditions and Blessings are suspended. Both crews must agree.
    </p>
    {#if offer?.npc && offer.status === "offered"}
      <p>Looking for a challenger · up to 20 seconds</p>
      <Button
        type="button"
        disabled={locked}
        onclick={() => offer && void controller.duelVote(offer.id, false)}
      >
        Cancel waiting
      </Button>
    {:else if offer}
      {#each offer.consent as consent}
        <small
          >{view.crews.find((crew) => crew.id === consent.crewId)?.name}:
          {consent.yes}/{consent.needed}
          agree</small
        >
      {/each}
      <div>
        <Button
          type="button"
          disabled={locked || offer.ownVote === true}
          onclick={() => void controller.duelVote(offer.id, true)}
        >
          Accept duel
        </Button><Button
          type="button"
          disabled={locked}
          onclick={() => void controller.duelVote(offer.id, false)}
        >
          Continue peacefully
        </Button>
      </div>
      <small>Offer expires after 20 seconds. Anyone can decline.</small>
    {:else}
      <Button
        type="button"
        disabled={locked || !view.pvpEnabled}
        onclick={() => void controller.arenaQueue()}
      >
        Wait for a challenger
      </Button>
      {#each rivals as rival}
        <Button
          type="button"
          disabled={locked || !view.pvpEnabled}
          onclick={() => void controller.challenge(rival.id)}
        >
          Challenge {rival.symbol} · {rival.name}
        </Button>
      {/each}
      <small>One arena duel per expedition.</small>
    {/if}
  </details>
{/if}
