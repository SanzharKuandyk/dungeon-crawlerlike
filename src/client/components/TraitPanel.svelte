<script lang="ts">
  import type { BlessingKind } from "../../shared/condition-types.js";
  import type { Hero } from "../../shared/game-types.js";
  import { AFFLICTION_DETAILS, blessingDescription } from "../../shared/trait-descriptions.js";
  import type { PlayerController } from "../player-controller.js";
  import GameIcon from "./GameIcon.svelte";
  import Button from "./ui/Button.svelte";
  import InspectPopover from "./ui/InspectPopover.svelte";

  let {
    hero,
    controller,
    editable,
  }: { hero: Hero; controller: PlayerController; editable: boolean } = $props();
  let replacement = $state<BlessingKind | null>(null);
</script>
<div class="build-section-label">
  <GameIcon name="blessing" /><strong>Blessings</strong
  ><span>{hero.conditions.blessings.length}/2</span>
</div>
<div class="trait-slots">
  {#each hero.conditions.blessings as blessing}
    {@const used =
      blessing.spent ||
      (blessing.kind === "second-breath"
        ? hero.expeditionUses.includes(blessing.kind)
        : hero.encounterUses.includes(blessing.kind))}
    <InspectPopover label={blessing.kind.replaceAll("-", " ")}>
      {#snippet trigger()}
        <GameIcon name={blessing.kind} size={28} /><span>{blessing.kind.replaceAll("-", " ")}</span
        ><small>{"I".repeat(blessing.rank)} · {used ? "Used" : "Ready"}</small>
      {/snippet}
      <strong>{blessing.kind.replaceAll("-", " ")} · Rank {blessing.rank}</strong>
      <p>{blessingDescription(blessing.kind, blessing.rank, hero.power)}</p>
      <small>{used ? "Already used" : "Ready to activate"}</small>
    </InspectPopover>
  {/each}
  {#each Array.from({ length: 2 - hero.conditions.blessings.length }) as _}
    <div class="empty-trait"><GameIcon name="blessing" /><small>Open slot</small></div>
  {/each}
</div>
{#if hero.pendingBlessings.length}
  <div class="build-section-label"><strong>Blessing discovered</strong></div>
  {#if hero.conditions.blessings.length === 2}
    <select aria-label="Blessing to replace" bind:value={replacement}>
      <option value={null}>Choose replacement</option>
      {#each hero.conditions.blessings as b}
        <option value={b.kind}>{b.kind.replaceAll("-", " ")}</option>
      {/each}
    </select>
  {/if}
  <div class="trait-slots">
    {#each hero.pendingBlessings as offer}
      <div class="trait-offer">
        <InspectPopover label={offer.kind.replaceAll("-", " ")}>
          {#snippet trigger()}
            <GameIcon name={offer.kind} size={28} /><span>{offer.kind.replaceAll("-", " ")}</span
            ><small>{"I".repeat(offer.rank)}</small>
          {/snippet}
          <p>{blessingDescription(offer.kind, offer.rank, hero.power)}</p>
        </InspectPopover><Button
          type="button"
          disabled={!editable}
          onclick={() =>
            void controller.inventory(
              { kind: "blessing", offerId: offer.id, replace: replacement },
              hero.inventory.revision,
            )}
        >
          Choose
        </Button>
      </div>
    {/each}
  </div>
  <Button
    type="button"
    disabled={!editable}
    onclick={() =>
      void controller.inventory(
        { kind: "blessing", offerId: "decline", replace: null },
        hero.inventory.revision,
      )}
  >
    Decline
  </Button>
{/if}
<div class="build-section-label"><GameIcon name="curse" /><strong>Conditions</strong></div>
<div class="condition-strip">
  {#each hero.conditions.injuries as injury}
    <InspectPopover label={`${injury} injury`}>
      {#snippet trigger()}
        <GameIcon name={injury} /><span>{injury}</span>
      {/snippet}
      <p>
        {injury === "arm" ? "25% less outgoing damage." : "25% less Block barrier."}
        Treatment or a Splint removes this injury.
      </p>
    </InspectPopover>
  {/each}
  {#each hero.conditions.afflictions as a}
    <InspectPopover label={a.kind}>
      {#snippet trigger()}
        <GameIcon name={a.kind} /><span>{a.kind}</span>
      {/snippet}
      <p>{AFFLICTION_DETAILS[a.kind]}</p>
    </InspectPopover>
  {/each}
  {#if !hero.conditions.injuries.length && !hero.conditions.afflictions.length}
    <small>No lasting conditions</small>
  {/if}
</div>
