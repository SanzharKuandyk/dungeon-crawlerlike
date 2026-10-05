<script lang="ts">
  import type { RewardClaim } from "../../shared/reward-types.js";
  import type { RewardSelection } from "./RewardChoices.svelte";
  import Button from "./ui/Button.svelte";

  let {
    selection,
    locked,
    onclaim,
  }: {
    selection: RewardSelection;
    locked: boolean;
    onclaim: (d: RewardClaim["disposition"]) => void;
  } = $props();
</script>
{#if selection.replacementName}
  <strong class="reward-replacement">Equip replaces {selection.replacementName} → Bag</strong>
{/if}
<div class="reward-operations">
  <Button
    primary
    pending={selection.busy &&
      (selection.operation === "equip" ||
        selection.operation === "upgrade" ||
        selection.operation === "keep")}
    disabled={locked || selection.busy || !selection.selected}
    onclick={() =>
      onclaim(selection.upgrade ? "upgrade" : selection.type === "supplies" ? "keep" : "equip")}
    >{selection.upgrade
      ? "Upgrade"
      : selection.type === "supplies"
        ? "Store supplies"
        : "Equip"}</Button
  >
  {#if !selection.upgrade && selection.type !== "supplies"}
    <Button
      pending={selection.busy && selection.operation === "keep"}
      disabled={locked || selection.busy || !selection.selected}
      onclick={() => onclaim("keep")}
      title="Claim this item now and put it in your Bag"
      >Store in Bag</Button
    >
  {/if}
  <Button
    variant="quiet"
    pending={selection.busy && selection.operation === "leave"}
    disabled={locked || selection.busy}
    onclick={() => onclaim("leave")}
    >Leave reward</Button
  >
</div>
<small class="reward-destination">Choose now: equip, store in your Bag, or leave the reward.</small>
