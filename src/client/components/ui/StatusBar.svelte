<script lang="ts">
  import GameIcon from "../GameIcon.svelte";

  let {
    label,
    value,
    max,
    ariaLabel = label,
    icon = "heart",
    caption = "",
  }: {
    label: string;
    value: number;
    max: number;
    ariaLabel?: string;
    icon?: string;
    caption?: string;
  } = $props();
</script>
<div class="ui-status" data-stat={icon} title={label}>
  <span
    ><GameIcon name={icon} size={16} />
    {#if caption}
      <small>{caption}</small>
    {/if}
    <strong>{value}/{max}</strong></span
  >
  <meter class="visually-hidden" aria-label={ariaLabel} min="0" {max} {value}></meter>
  <div class="stat-track" aria-hidden="true">
    <i style:width={`${Math.max(0, Math.min(100, (value / max) * 100))}%`}></i>
  </div>
</div>
