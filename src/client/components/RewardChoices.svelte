<script module lang="ts">
  export type RewardSelection = {
    selected: boolean;
    busy: boolean;
    hasOffer: boolean;
    operation: import("../../shared/reward-types.js").RewardClaim["disposition"] | null;
  };
</script>
<script lang="ts">
  import { itemDefinition } from "../../game/inventory/catalog.js";
  import type { RewardClaim } from "../../shared/reward-types.js";
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import type { PlayerController } from "../player-controller.js";
  import RewardOperations from "./RewardOperations.svelte";
  import InlineNotice from "./ui/InlineNotice.svelte";
  import ItemDetail from "./ui/ItemDetail.svelte";
  import ItemSlot from "./ui/ItemSlot.svelte";
  import TransactionFeedback from "./ui/TransactionFeedback.svelte";

  let {
    view,
    controller,
    locked,
    controls = true,
    onselection,
  }: {
    view: PlayerRoomView;
    controller: PlayerController;
    locked: boolean;
    controls?: boolean;
    onselection?: (s: RewardSelection) => void;
  } = $props();
  let offerId = $state(""),
    optionId = $state(""),
    replacement = $state(""),
    error = $state(""),
    busy = $state(false);
  let operation = $state<RewardClaim["disposition"] | null>(null);
  let offer = $derived(
    view.rewards.find((o) => o.id === offerId) ??
      view.rewards.find((o) => !o.deferred) ??
      view.rewards[0],
  );
  let option = $derived(offer?.options.find((o) => o.id === optionId));
  let slot = $derived(option && itemDefinition(option.kind)?.slot);
  let previous = $derived(slot ? view.hero?.inventory.equipment[slot] : null);
  let selection = $derived({ selected: !!option, busy, hasOffer: !!offer, operation });
  $effect(() => onselection?.(selection));
  export async function claim(disposition: RewardClaim["disposition"]) {
    if (!offer || !view.hero || busy) return;
    error = "";
    operation = disposition;
    busy = true;
    const needsSpace = disposition === "keep" || (disposition === "equip" && previous);
    if (needsSpace && view.hero.inventory.backpack.length >= 6 && !replacement) {
      error = "Backpack full. Select an item to replace, or save this reward for later.";
      busy = false;
      return;
    }
    const ok = await controller.claimReward(
      {
        offerId: offer.id,
        optionId: option?.id ?? null,
        disposition,
        replacementItemId: replacement || null,
      },
      view.hero.inventory.revision,
    );
    busy = false;
    if (!ok) error = controller.error || "Not confirmed. Your reward is still available.";
  }
</script>
{#if offer && view.hero}
  <section class="reward-choices" aria-label="Personal equipment reward">
    <header>
      <strong>Your equipment</strong
      ><small>{offer.deferred ? "Saved for later" : "Choose one"}</small>
    </header>
    {#if view.rewards.length > 1}
      <select aria-label="Reward source" bind:value={offerId}>
        {#each view.rewards as o}
          <option value={o.id}>{o.sourceNodeId}{o.deferred ? " · saved" : ""}</option>
        {/each}
      </select>
    {/if}
    <div class="reward-options">
      {#each offer.options as o}
        <ItemSlot
          kind={o.kind}
          selected={option?.id === o.id}
          onclick={() => {
            optionId = o.id;
            error = "";
            replacement = "";
          }}
        />
      {/each}
    </div>
    {#if option}
      <ItemDetail kind={option.kind} power={view.hero.power} comparison={previous?.kind} />
      {#if view.hero.inventory.backpack.length >= 6}
        <label for="reward-replacement">Replace a backpack item if space is needed</label
        ><select id="reward-replacement" bind:value={replacement}>
          <option value="">Keep all current items</option>
          {#each view.hero.inventory.backpack as i}
            <option value={i.id}>{itemDefinition(i.kind)?.name} ×{i.count}</option>
          {/each}
        </select>
      {/if}
    {/if}
    {#if controls}
      <RewardOperations
        {selection}
        locked={locked || view.decisionReady}
        onclaim={(d) => void claim(d)}
      />
    {/if}
    {#if error}
      <InlineNotice error>{error}</InlineNotice>
    {/if}
  </section>
{/if}
<TransactionFeedback feedback={view.transaction} operation="reward" />
