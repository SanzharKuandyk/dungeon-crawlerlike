<script lang="ts">
  import { itemDefinition, itemDescription } from "../../game/inventory/catalog.js";
  import type { Hero } from "../../shared/game-types.js";
  import type { EquipmentSlot } from "../../shared/inventory-types.js";
  import type { PlayerController } from "../player-controller.js";
  import GameIcon from "./GameIcon.svelte";
  import ItemTile from "./ItemTile.svelte";
  import Button from "./ui/Button.svelte";
  import ItemDetail from "./ui/ItemDetail.svelte";

  let {
    hero,
    controller,
    editable,
    selectedId = $bindable(""),
  }: {
    hero: Hero;
    controller: PlayerController;
    editable: boolean;
    selectedId?: string;
  } = $props();
  const slots: EquipmentSlot[] = ["weapon", "armor", "charm"];
  let replacement = $state("");
  let selectedSlot = $derived(
    slots.find((slot) => hero.inventory.equipment[slot]?.id === selectedId),
  );
  let selected = $derived(
    hero.inventory.backpack.find((item) => item.id === selectedId) ??
      (selectedSlot ? hero.inventory.equipment[selectedSlot] : null),
  );
  let equipmentSlot = $derived(selected ? itemDefinition(selected.kind)?.slot : null);
</script>
<div class="build-section-label"><GameIcon name="armor" size={16} /><strong>Equipped</strong></div>
<div class="gear-slots">
  {#each slots as slot}
    <ItemTile
      item={hero.inventory.equipment[slot]}
      {slot}
      selected={hero.inventory.equipment[slot]?.id === selectedId}
      onclick={() => (selectedId = hero.inventory.equipment[slot]?.id ?? "")}
    />
  {/each}
</div>
<div class="build-section-label">
  <GameIcon name="backpack" size={16} /><strong>Backpack</strong
  ><span>{hero.inventory.backpack.length}/6</span>
</div>
<div class="backpack-slots">
  {#each Array.from({ length: 6 }) as _, index}
    <ItemTile
      item={hero.inventory.backpack[index] ?? null}
      selected={!!hero.inventory.backpack[index] &&
        hero.inventory.backpack[index].id === selectedId}
      onclick={() => (selectedId = hero.inventory.backpack[index]?.id ?? "")}
    />
  {/each}
</div>
<section class="inventory-inspector" aria-label="Selected equipment">
  {#if selected}
    <ItemDetail
      kind={selected.kind}
      power={hero.power}
      comparison={selectedSlot
        ? undefined
        : equipmentSlot
          ? (hero.inventory.equipment[equipmentSlot]?.kind ?? null)
          : undefined}
    />
  {:else}
    <p class="slot-hint">Select an item to inspect or use it.</p>
  {/if}
</section>
{#if hero.inventory.overflow.length}
  <div class="build-section-label"><GameIcon name="swap" /><strong>Unclaimed gear</strong></div>
  {#each hero.inventory.overflow as item}
    <section class="item-detail">
      <strong>{itemDefinition(item.kind)?.name}</strong>
      <p>{itemDescription(item.kind, hero.power)}</p>
      <div class="item-operation-row">
        {#if hero.inventory.backpack.length < 6}
          <Button
            type="button"
            disabled={!editable}
            onclick={() =>
              void controller.inventory(
                { kind: "keep-overflow", itemId: item.id },
                hero.inventory.revision,
              )}
          >
            <GameIcon name="backpack" />Keep
          </Button>
        {:else}
          <select aria-label="Item to replace" bind:value={replacement}>
            <option value="">Replace…</option>
            {#each hero.inventory.backpack as old}
              <option value={old.id}>{itemDefinition(old.kind)?.name}</option>
            {/each}
          </select>
          <Button
            type="button"
            disabled={!editable || !replacement}
            onclick={() =>
              void controller.inventory(
                { kind: "overflow", itemId: item.id, replaceItemId: replacement },
                hero.inventory.revision,
              )}
          >
            <GameIcon name="swap" />Replace
          </Button>
        {/if}
        <Button
          type="button"
          disabled={!editable}
          onclick={() =>
            void controller.inventory(
              { kind: "overflow", itemId: item.id, replaceItemId: null },
              hero.inventory.revision,
            )}
        >
          <GameIcon name="leave" />Leave
        </Button>
      </div>
    </section>
  {/each}
{/if}
