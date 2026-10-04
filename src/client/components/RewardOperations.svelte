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
<div class="reward-operations">
  <Button
    primary
    pending={selection.busy && selection.operation === "equip"}
    disabled={locked || selection.busy || !selection.selected}
    onclick={() => onclaim("equip")}
    >Equip</Button
  ><Button
    pending={selection.busy && selection.operation === "keep"}
    disabled={locked || selection.busy || !selection.selected}
    onclick={() => onclaim("keep")}
    >Keep</Button
  >
  <Button
    variant="quiet"
    pending={selection.busy && selection.operation === "defer"}
    disabled={locked || selection.busy}
    onclick={() => onclaim("defer")}
    >Save for later</Button
  ><Button
    variant="quiet"
    pending={selection.busy && selection.operation === "leave"}
    disabled={locked || selection.busy}
    onclick={() => onclaim("leave")}
    >Leave reward</Button
  >
</div>
