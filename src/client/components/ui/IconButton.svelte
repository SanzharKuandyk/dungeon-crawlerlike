<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    children,
    label,
    onclick,
    disabled = false,
  }: { children: Snippet; label: string; onclick?: () => void; disabled?: boolean } = $props();
</script>
<button type="button" class="ui-icon-button" aria-label={label} title={label} {onclick} {disabled}>
  {@render children()}
</button>
