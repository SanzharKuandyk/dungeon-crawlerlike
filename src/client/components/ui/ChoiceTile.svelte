<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    children,
    selected = false,
    disabled = false,
    onclick,
  }: { children: Snippet; selected?: boolean; disabled?: boolean; onclick?: () => void } = $props();
</script>
<button
  type="button"
  class="ui-choice"
  class:chosen={selected}
  aria-pressed={selected}
  {disabled}
  {onclick}
>
  {@render children()}
</button>
