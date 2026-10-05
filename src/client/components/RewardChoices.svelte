<script module lang="ts">
  export type RewardSelection = {
    selected: boolean;
    busy: boolean;
    hasOffer: boolean;
    operation: import("../../shared/reward-types.js").RewardClaim["disposition"] | null;
    type?: "equipment" | "supplies";
    upgrade?: boolean;
    replacementName?: string;
  };
</script>
<script lang="ts">
  import { itemDefinition, itemDescription } from "../../game/inventory/catalog.js";
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
    previewFirst = false,
    showEffects = false,
    onselection,
  }: {
    view: PlayerRoomView;
    controller: PlayerController;
    locked: boolean;
    controls?: boolean;
    previewFirst?: boolean;
    showEffects?: boolean;
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
  let option = $derived(
    offer?.options.find((o) => o.id === optionId) ?? (previewFirst ? offer?.options[0] : undefined),
  );
  let slot = $derived(option && itemDefinition(option.kind)?.slot);
  let previous = $derived(slot ? view.hero?.inventory.equipment[slot] : null);
  let selection = $derived({
    selected: !!option,
    busy,
    hasOffer: !!offer,
    operation,
    type: option?.type,
    upgrade: option?.type === "equipment" && !!option.upgradeItemId,
    replacementName:
      option?.type === "equipment" && !option.upgradeItemId && previous
        ? itemDefinition(previous.kind)?.name
        : undefined,
  });
  $effect(() => onselection?.(selection));
  export async function claim(disposition: RewardClaim["disposition"]) {
    if (!offer || !view.hero || busy) return;
    error = "";
    operation = disposition;
    busy = true;
    const needsSpace = disposition === "keep" || (disposition === "equip" && previous);
    if (needsSpace && view.hero.inventory.backpack.length >= 6 && !replacement) {
      error = "Backpack full. Select an item to replace, or leave the reward.";
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
      ><small>{offer.deferred ? "Choice pending" : "Choose one"}</small>
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
        <div class="reward-option">
          <ItemSlot
            kind={o.kind}
            selected={option?.id === o.id}
            onclick={() => {
              optionId = o.id;
              error = "";
              replacement = "";
            }}
          />
          {#if showEffects}
            <small
              >{itemDescription(
                o.kind,
                view.hero.power,
                o.type === "equipment" && o.upgradeItemId ? 2 : 1,
              )}</small
            >
          {/if}
        </div>
      {/each}
    </div>
    {#if option}
      <div class="reward-detail">
        <ItemDetail
          kind={option.kind}
          power={view.hero.power}
          rank={option.type === "equipment" && option.upgradeItemId ? 2 : 1}
          comparison={option.type === "equipment" && !option.upgradeItemId
            ? (previous?.kind ?? null)
            : undefined}
          comparisonRank={previous?.rank ?? 1}
        />
        {#if option.type === "equipment" && option.upgradeItemId}
          <p>Upgrade your owned item to rank II. It stays equipped or in your Bag.</p>
        {:else if option.type === "supplies"}
          <p>
            {option.items.map((i) => `${i.count} × ${itemDefinition(i.kind)?.name}`).join(" · ")}
            · store in Bag
          </p>
        {/if}
        {#if view.hero.inventory.backpack.length >= 6}
          <label for="reward-replacement">Replace a backpack item if space is needed</label
          ><select id="reward-replacement" bind:value={replacement}>
            <option value="">Keep all current items</option>
            {#each view.hero.inventory.backpack as i}
              <option value={i.id}>{itemDefinition(i.kind)?.name} ×{i.count}</option>
            {/each}
          </select>
        {/if}
      </div>
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
