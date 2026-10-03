<script lang="ts">
  import type { HostController } from "../host-controller.js";
  import { newRecoveryCode } from "../recovery-client.js";

  let {
    playerId,
    name,
    controller,
    onclose,
  }: { playerId: string; name: string; controller: HostController; onclose: () => void } = $props();
  let code = $state(newRecoveryCode()),
    issued = $state(false),
    busy = $state(false);
  async function issue() {
    busy = true;
    issued = await controller.issueRecovery(playerId, code);
    busy = false;
  }
</script>
<div class="recovery-overlay">
  <div
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-label="Reconnect player"
    class="recovery-dialog"
  >
    <h2>Reconnect {name}</h2>
    {#if issued}
      <p>Enter this on the replacement device with the room code. Valid for 5 minutes.</p>
      <strong class="recovery-code">{code}</strong>
      <p>
        Existing character and choices are preserved. The previous device loses control when this
        code is redeemed.
      </p>
    {:else}
      <p>Generate a private code for a replacement device?</p>
      <button type="button" disabled={busy} onclick={issue}>Generate recovery code</button>
    {/if}
    <button type="button" onclick={onclose}>Close</button>
  </div>
</div>
