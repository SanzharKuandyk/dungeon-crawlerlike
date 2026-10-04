<script lang="ts">
  import GameIcon from "../GameIcon.svelte";

  let {
    ready,
    total,
    confirmed = false,
  }: { ready: number; total: number; confirmed?: boolean } = $props();
</script>
<span class="ready-status" role="status"
  ><GameIcon name="ready" size={16} />{ready}/{total}
  ready{confirmed ? " · You are ready" : ""}</span
>
