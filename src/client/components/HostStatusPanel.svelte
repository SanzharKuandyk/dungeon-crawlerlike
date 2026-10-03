<script lang="ts">
  import type { HostRoomView } from "../../shared/view-types.js";

  let { view }: { view: HostRoomView } = $props();
</script>
{#if view.pauseReasons.length || view.storageError}
  <div class="connection-banner" role="status">
    {view.storageError ??
      `Expedition paused: ${view.pauseReasons.map((reason) => ({ host: "by host", "host-offline": "host disconnected", "server-restart": "server restarted", "save-failed": "save failed" })[reason]).join(", ")}. Resume when ready.`}
  </div>
{/if}
<details class="host-status">
  <summary>Connections · {view.players.filter((p) => !p.connected).length} offline</summary>
  {#each view.operations ?? [] as entry}
    <p>
      {view.players.find((p) => p.id === entry.playerId)?.name}:
      {entry.controlling ? "connected" : `offline · ${Math.floor(entry.absentMs / 1000)}s`}
    </p>
  {/each}
</details>
