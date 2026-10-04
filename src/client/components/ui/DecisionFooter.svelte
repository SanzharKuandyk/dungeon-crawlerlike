<script lang="ts">
  import type { Snippet } from "svelte";

  let { children, hint }: { children: Snippet; hint?: string } = $props();
</script>
<footer class="decision-footer">
  {#if hint}
    <small>{hint}</small>
  {/if}
  <div>{@render children()}</div>
</footer>
