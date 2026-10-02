<script lang="ts">
  let { depth, finished = false }: { depth: number; finished?: boolean } = $props();
</script>

<ol class="dungeon-progress" aria-label="Dungeon progress">
  {#each [1, 2, 3, 4, 5] as floor}
    <li
      class:complete={floor < depth || finished}
      class:current={floor === depth && !finished}
      aria-current={floor === depth && !finished ? "step" : undefined}
    >
      <span>{floor < depth || finished ? "✓" : floor}</span>
      <small>{floor === 5 ? "Extraction" : `Depth ${floor}`}</small>
    </li>
  {/each}
</ol>
