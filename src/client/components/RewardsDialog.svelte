<script lang="ts">
  import type { RewardClaim } from "../../shared/reward-types.js";
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import type { PlayerController } from "../player-controller.js";
  import GameIcon from "./GameIcon.svelte";
  import RewardChoices, { type RewardSelection } from "./RewardChoices.svelte";
  import RewardOperations from "./RewardOperations.svelte";
  import Button from "./ui/Button.svelte";
  import Dialog from "./ui/Dialog.svelte";

  let {
    open = $bindable(false),
    view,
    controller,
    locked,
    postFight = false,
  }: {
    open?: boolean;
    view: PlayerRoomView;
    controller: PlayerController;
    locked: boolean;
    postFight?: boolean;
  } = $props();
  let selection = $state<RewardSelection>({
    selected: false,
    busy: false,
    hasOffer: false,
    operation: null,
  });
  let picker = $state<{ claim: (d: RewardClaim["disposition"]) => Promise<void> } | null>(null);
  let rewardView = $derived(view);
  $effect(() => {
    if (postFight && !rewardView.rewards.length) open = false;
  });
</script>
<Dialog bind:open title={postFight ? "Choose your reward" : "Saved rewards"} class="reward-dialog">
  {#snippet context()}
    {#if postFight && view.result}
      <div class="reward-source">
        <strong>{view.result.title}</strong
        ><span><GameIcon name="gold" size={16} />+{view.result.goldEarned}</span>
      </div>
    {/if}
  {/snippet}
  <RewardChoices
    bind:this={picker}
    view={rewardView}
    {controller}
    {locked}
    controls={false}
    previewFirst
    showEffects
    onselection={(s) => (selection = s)}
  />
  {#snippet footer()}
    <div class="inventory-footer">
      {#if rewardView.rewards.length}
        <RewardOperations
          {selection}
          locked={locked || view.decisionReady}
          onclaim={(d) => void picker?.claim(d)}
        />
      {/if}
      {#if !postFight}
        <Button variant="quiet" onclick={() => (open = false)}>Done</Button>
      {/if}
    </div>
  {/snippet}
</Dialog>
