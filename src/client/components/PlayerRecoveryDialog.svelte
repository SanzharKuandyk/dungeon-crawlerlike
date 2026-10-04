<script lang="ts">
  import type { HostController } from "../host-controller.js";
  import { newRecoveryCode } from "../recovery-client.js";
  import Button from "./ui/Button.svelte";
  import Dialog from "./ui/Dialog.svelte";

  let {
    playerId,
    name,
    controller,
    onclose,
  }: { playerId: string; name: string; controller: HostController; onclose: () => void } = $props();
  let open = $state(true);
  $effect(() => {
    if (!open) onclose();
  });
  let code = $state(newRecoveryCode()),
    issued = $state(false),
    busy = $state(false);
  async function issue() {
    busy = true;
    issued = await controller.issueRecovery(playerId, code);
    busy = false;
  }
</script>
<Dialog bind:open title={`Reconnect ${name}`}>
  {#if issued}
    <p>Enter this on the replacement device with the room code. Valid for 5 minutes.</p>
    <strong class="recovery-code">{code}</strong>
    <p>
      Your character and choices are preserved. The previous device loses control when redeemed.
    </p>
  {:else}
    <p>Generate a private code for a replacement device?</p>
  {/if}
  {#snippet footer()}
    {#if !issued}
      <Button primary pending={busy} onclick={issue}>Generate recovery code</Button>
    {/if}
    <Button onclick={onclose}>Close</Button>
  {/snippet}
</Dialog>
