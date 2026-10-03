<script lang="ts">
  let { opening = false, resolved = false }: { opening?: boolean; resolved?: boolean } = $props();
</script>
<svg
  class="seal-art"
  class:opening={opening}
  class:resolved={resolved}
  viewBox="0 0 100 100"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  aria-hidden="true"
>
  <circle cx="50" cy="50" r="44" stroke-dasharray="20 8" />
  <circle cx="50" cy="50" r="35" />
  <path d="M50 22Q29 34 23 50q27 29 54 0Q71 34 50 22Z" fill="currentColor" fill-opacity=".06" />
  <path d="M50 33q-15 17 0 34q15-17 0-34ZM50 6v10m0 68v10M6 50h10m68 0h10" />
  <path d="M26 23l7 9m34 36 7 9M23 74l9-7m36-34 9-7" />
</svg>
