<script lang="ts">
  import type { EquipmentKind } from "../../shared/game-types.js";
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import type { PlayerController } from "../player-controller.js";

  let {
    view,
    controller,
    locked,
  }: { view: PlayerRoomView; controller: PlayerController; locked: boolean } = $props();
</script>
<div class="equipment-options">
  {#each [
    { id: "ward", description: "Absorbs enemy damage after barriers." },
    { id: "salve", description: "Heals when alive at half health or below." },
    { id: "lantern", description: "Removes stress before panic." },
  ] as item}
    <button
      type="button"
      class:chosen={view.equipmentChoice === item.id}
      disabled={locked}
      onclick={() => void controller.equipment(item.id as EquipmentKind)}
    >
      <strong>{item.id[0].toUpperCase() + item.id.slice(1)}</strong
      ><small>{item.description}</small>
    </button>
  {/each}
  {#if view.hero?.equipment}
    <button
      type="button"
      class:chosen={view.equipmentChoice === "keep"}
      disabled={locked}
      onclick={() => void controller.equipment("keep")}
    >
      Keep current equipment
    </button>
  {/if}
</div>
