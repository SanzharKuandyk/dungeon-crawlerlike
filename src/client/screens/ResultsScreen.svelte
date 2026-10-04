<script lang="ts">
  import { itemDefinition, itemDescription } from "../../game/inventory/catalog.js";
  import { CLASS_NAMES } from "../../shared/display-names.js";
  import type { RoomView } from "../../shared/view-types.js";
  import GameIcon from "../components/GameIcon.svelte";
  import InspectPopover from "../components/ui/InspectPopover.svelte";

  let { view }: { view: RoomView } = $props();
  const progress = (ids: string[]) =>
    ids.reduce(
      (max, id) => Math.max(max, Number(id.split("-")[1]) * 7 + Number(id.split("-")[2])),
      0,
    );
  let ranked = $derived(
    [...view.crews].sort(
      (a, b) =>
        b.bossesDefeated - a.bossesDefeated ||
        progress(b.completedNodeIds) - progress(a.completedNodeIds) ||
        b.trialScoreUnits - a.trialScoreUnits,
    ),
  );
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
  <small>Bosses → completed rooms → trial points</small>
  {#each ranked as crew}
    <div class="result-row">
      <strong>{crew.symbol} · {crew.name}</strong
      ><span class="result-stats"
        ><span title="Bosses defeated"
          ><GameIcon name="boss" size={16} />{crew.bossesDefeated}/3</span
        ><span title="Completed rooms"
          ><GameIcon name="forward" size={16} />{crew.completedNodeIds.length}</span
        ><span title="Trial points"
          ><GameIcon name="blessing" size={16} />
          {(crew.trialScoreUnits / 12).toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })}</span
        ></span
      >
    </div>
  {/each}
  {#if view.role === "player" && view.hero}
    <h3>Your expedition build</h3>
    <p>{CLASS_NAMES[view.hero.classId]} · {view.hero.status === "alive" ? "Survived" : "Spirit"}</p>
    <div class="gear-slots result-gear">
      {#each Object.entries(view.hero.inventory.equipment) as [slot, item]}
        <InspectPopover label={item ? (itemDefinition(item.kind)?.name ?? slot) : `Empty ${slot}`}>
          {#snippet trigger()}
            <GameIcon name={item?.kind ?? slot} size={28} />
            <span>{item ? itemDefinition(item.kind)?.name : slot}</span>
          {/snippet}
          <p>
            {item
              ? itemDescription(item.kind, view.role === "player" ? (view.hero?.power ?? 12) : 12)
              : `Empty ${slot} slot`}
          </p>
        </InspectPopover>
      {/each}
    </div>
    <p>
      {view.hero.conditions.blessings
        .map((b) => `${b.kind} ${b.rank === 2 ? "II" : "I"}`)
        .join(" · ") || "No Blessings"}
    </p>
  {/if}
</section>
