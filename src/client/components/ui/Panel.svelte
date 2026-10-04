<script lang="ts">
  import type { Snippet } from "svelte";

  let { children, class: css = "" }: { children: Snippet; class?: string } = $props();
</script>
<section class={`ui-panel ${css}`}>{@render children()}</section>
