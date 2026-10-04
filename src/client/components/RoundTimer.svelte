<script lang="ts">
  import { onMount } from "svelte";
  import type { RoomView } from "../../shared/view-types.js";

  let { view }: { view: RoomView } = $props();
  let now = $state(Date.now());
  let offset = $state(0);
  $effect(() => {
    offset = view.serverNow - Date.now();
  });
  onMount(() => {
    const timer = setInterval(() => {
      now = Date.now();
    }, 200);
    return () => clearInterval(timer);
  });
  let seconds = $derived(
    view.deadline === null ? null : Math.max(0, Math.ceil((view.deadline - now - offset) / 1000)),
  );
</script>
<span role="timer" class="timer" aria-label="Time remaining"
  >{view.status === "finished"
    ? "Done"
    : view.status === "lobby"
      ? "Lobby"
      : view.status === "paused"
        ? "Paused"
        : seconds === null
          ? view.speed === "manual"
            ? "Manual"
            : "No timer"
          : `${seconds}s`}</span
>
