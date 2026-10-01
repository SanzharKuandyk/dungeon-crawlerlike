<script lang="ts">
  import { reconnect } from "../connection.js";
  import { room } from "../room.svelte.js";

  let { active = true }: { active?: boolean } = $props();
</script>
{#if active &&
  (room.status !== "ready" ||
    room.view?.storageError ||
    room.error ||
    (room.view && "readOnly" in room.view && room.view.readOnly))}
  <div class="banner" role="status">
    <span
      >{room.view?.storageError ??
        room.error ??
        (room.status === "invalid"
          ? "Session needs recovery."
          : room.status !== "ready"
            ? `Connection ${room.status}. Your accepted choices remain saved.`
            : "A newer tab controls this identity. This tab is read-only.")}</span
    >
    <button
      type="button"
      class="quiet"
      onclick={() => (room.controller ? room.controller.reconnect() : reconnect())}
    >
      Reconnect here
    </button>
  </div>
{/if}
