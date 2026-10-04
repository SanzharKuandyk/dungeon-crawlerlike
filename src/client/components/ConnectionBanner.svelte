<script lang="ts">
  import { reconnect } from "../connection.js";
  import { room } from "../room.svelte.js";
  import Button from "./ui/Button.svelte";

  let { active = true }: { active?: boolean } = $props();
</script>
{#if active &&
  (room.status !== "ready" ||
    room.view?.storageError ||
    (room.view?.role !== "host" && !!room.view?.pauseReasons.length) ||
    room.error ||
    (room.view && "readOnly" in room.view && room.view.readOnly))}
  <div class="banner" role="status">
    <span
      >{room.view?.storageError ??
        room.error ??
        (room.view?.pauseReasons.length
          ? `Expedition paused: ${room.view.pauseReasons.map((r) => r.replaceAll("-", " ")).join(", ")}. Waiting for host resume.`
          : null) ??
        (room.view?.closed
          ? "Session ended. Return home to start a new expedition."
          : room.status === "invalid"
            ? "Session needs recovery."
            : room.status !== "ready"
              ? `Connection ${room.status}. Your accepted choices remain saved.`
              : "A newer tab controls this identity. This tab is read-only.")}</span
    >
    {#if !room.view?.closed}
      <Button
        type="button"
        class="quiet"
        onclick={() => (room.controller ? room.controller.reconnect(true) : reconnect())}
      >
        Reconnect here
      </Button>
    {/if}
  </div>
{/if}
