<script lang="ts">
  import GameIcon from "./GameIcon.svelte";

  let { value, health }: { value: number; health: number } = $props();
</script>
<div
  class="block-meter"
  title="Block absorbs damage before health. Unused Block expires at your next turn."
>
  <span><GameIcon name="shield" size={12} /><small>Block</small><strong>{value}</strong></span>
  <meter
    class="visually-hidden"
    aria-label="Your current Block"
    min="0"
    max={Math.max(health, value, 1)}
    {value}
  ></meter>
  <div class="stat-track" aria-hidden="true">
    <i style:width={`${(100 * value) / Math.max(health, value, 1)}%`}></i>
  </div>
</div>
