<script lang="ts">
  import type { Snippet } from "svelte";

  let { children, error = false }: { children: Snippet; error?: boolean } = $props();
</script>
<div class="inline-notice" class:error role={error ? "alert" : "status"}>{@render children()}</div>
