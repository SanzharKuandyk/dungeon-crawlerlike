<script lang="ts">
  import type { RoomView } from "../../shared/view-types.js";

  let { view }: { view: RoomView } = $props();
</script>
<section class="results">
  <p class="eyebrow">Expedition complete</p>
  <h2>
    {view.crews
      .filter((c) => view.winners.includes(c.id))
      .map((c) => c.name)
      .join(" & ")}
    wins
  </h2>
  <p>Most secured treasure</p>
  {#each [...view.crews].sort((a, b) => b.securedTreasure - a.securedTreasure) as c}
    <div class="result-row">
      <strong>{c.symbol} · {c.name}</strong
      ><span
        >{c.securedTreasure}
        secured · {c.status === "eliminated" ? "Fallen" : "Survived"}</span
      >
    </div>
  {/each}
</section>
