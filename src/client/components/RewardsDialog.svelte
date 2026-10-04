<script lang="ts">
  import type { RewardClaim } from "../../shared/reward-types.js";
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import type { PlayerController } from "../player-controller.js";
  import RewardChoices, { type RewardSelection } from "./RewardChoices.svelte";
  import RewardOperations from "./RewardOperations.svelte";
  import Button from "./ui/Button.svelte";
  import Dialog from "./ui/Dialog.svelte";

  let {
    open = $bindable(false),
    view,
    controller,
    locked,
  }: {
    open?: boolean;
    view: PlayerRoomView;
    controller: PlayerController;
    locked: boolean;
  } = $props();
  let selection = $state<RewardSelection>({
    selected: false,
    busy: false,
    hasOffer: false,
    operation: null,
  });
  let picker = $state<{ claim: (d: RewardClaim["disposition"]) => Promise<void> } | null>(null);
</script>
<Dialog bind:open title="Saved rewards">
  <RewardChoices
    bind:this={picker}
    {view}
    {controller}
    {locked}
    controls={false}
    onselection={(s) => (selection = s)}
  />
  {#snippet footer()}
    <div class="inventory-footer">
      {#if view.rewards.length}
        <RewardOperations
          {selection}
          locked={locked || view.decisionReady}
          onclaim={(d) => void picker?.claim(d)}
        />
      {/if}
      <Button variant="quiet" onclick={() => (open = false)}>Done</Button>
    </div>
  {/snippet}
</Dialog>
