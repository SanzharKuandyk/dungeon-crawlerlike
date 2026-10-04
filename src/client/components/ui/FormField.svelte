<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    label,
    id,
    children,
    hint,
  }: { label: string; id: string; children: Snippet; hint?: string } = $props();
</script>
<div class="form-field">
  <label for={id}>{label}</label>
  {@render children()}
  {#if hint}
    <small>{hint}</small>
  {/if}
</div>
