<script lang="ts">
  import type { Snippet } from "svelte";

  let { children, label }: { children: Snippet; label: string } = $props();
</script>
<section class="scroll-area" aria-label={label}>{@render children()}</section>
