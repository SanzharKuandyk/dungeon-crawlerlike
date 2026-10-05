<script lang="ts">
  import { itemDefinition, itemDescription } from "../../game/inventory/catalog.js";
  import type { Hero } from "../../shared/game-types.js";
  import type { EquipmentSlot, ItemInstance } from "../../shared/inventory-types.js";
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import type { PlayerController } from "../player-controller.js";
  import GameIcon from "./GameIcon.svelte";
  import Button from "./ui/Button.svelte";
  import InlineNotice from "./ui/InlineNotice.svelte";
  import InspectPopover from "./ui/InspectPopover.svelte";

  let {
    selected,
    selectedSlot,
    hero,
    view,
    controller,
    editable,
    locked,
    onuse,
    details = true,
    unavailableReason = "Gear can be changed at a safe stop.",
  }: {
    selected: ItemInstance;
    selectedSlot?: EquipmentSlot;
    hero: Hero;
    view: PlayerRoomView;
    controller: PlayerController;
    editable: boolean;
    locked: boolean;
    onuse: () => void;
    details?: boolean;
    unavailableReason?: string;
  } = $props();
  let busy = $state(false),
    error = $state("");
  async function inventory(command: import("../../shared/inventory-types.js").InventoryCommand) {
    busy = true;
    error = "";
    const ok = await controller.inventory(command, hero.inventory.revision);
    busy = false;
    if (!ok) error = controller.error || "Operation not confirmed.";
  }
  let recipient = $state("");
  let definition = $derived(itemDefinition(selected.kind));
  let teammates = $derived(view.heroes.filter((h) => h.crewId === hero.crewId && h.id !== hero.id));
  let usable = $derived(
    view.legalActions.find(
      (a) => a.kind === "use-item" && a.itemId === selected.id && a.targetHeroId === hero.id,
    ),
  );
  let previous = $derived(
    !selectedSlot && definition?.slot ? hero.inventory.equipment[definition.slot] : null,
  );
  let noSpace = $derived(!!selectedSlot && hero.inventory.backpack.length >= 6);
</script>
<section class="item-detail" aria-live="polite">
  {#if details}
    <header>
      <GameIcon name={selected.kind} size={28} /><strong>{definition?.name}</strong
      ><small>{selectedSlot ?? "Backpack"}</small>
    </header>
    <p>{itemDescription(selected.kind, hero.power, "rank" in selected ? selected.rank : 1)}</p>
  {:else}
    <p>{itemDescription(selected.kind, hero.power, "rank" in selected ? selected.rank : 1)}</p>
  {/if}
  {#if previous}
    <p class="swap-destination">
      Equip replaces {itemDefinition(previous.kind)?.name}; it moves to your Bag.
    </p>
  {/if}
  <div class="item-operation-row">
    {#if !details}
      <strong class="selected-item-caption">{definition?.name}</strong>
    {/if}
    {#if selectedSlot}
      <Button
        type="button"
        pending={busy}
        disabled={!editable || noSpace}
        disabledReason={!editable
          ? unavailableReason
          : noSpace
            ? "Bag full. Make space before unequipping."
            : undefined}
        onclick={() => selectedSlot && void inventory({ kind: "unequip", slot: selectedSlot })}
      >
        <GameIcon name="backpack" />Unequip
      </Button>
    {:else if definition?.slot}
      <Button
        type="button"
        class="primary"
        pending={busy}
        disabled={!editable}
        disabledReason={!editable ? unavailableReason : undefined}
        onclick={() => void inventory({ kind: "equip", itemId: selected.id })}
      >
        <GameIcon name="equip" />Equip
      </Button>
    {:else if view.phase.kind === "combat" && selected.kind !== "splint"}
      <Button
        type="button"
        class="primary"
        pending={busy}
        disabled={locked || view.decisionReady || !usable}
        onclick={async () => {
          if (usable) {
            busy = true;
            const ok = await controller.action(usable);
            busy = false;
            if (ok) onuse();
            else error = controller.error || "Item not confirmed.";
          }
        }}
      >
        <GameIcon name={selected.kind} />Use on self
      </Button>
    {:else if selected.kind === "splint"}
      {#each hero.conditions.injuries as injury}
        <Button
          type="button"
          pending={busy}
          disabled={!editable}
          onclick={() => void inventory({ kind: "splint", itemId: selected.id, injury })}
        >
          <GameIcon name={injury} />Treat {injury}
        </Button>
      {/each}
    {/if}
  </div>
  {#if selectedSlot || definition?.slot}
    {#if !editable}
      <small class="inventory-lock" role="status">{unavailableReason}</small>
    {:else if noSpace}
      <small class="inventory-lock" role="status">Bag full. Make space before unequipping.</small>
    {/if}
  {/if}
  {#if (!selectedSlot && (teammates.length || view.shop)) ||
    (!editable && view.phase.kind !== "combat")}
    <InspectPopover label="More">
      {#if !selectedSlot && view.shop}
        <Button
          type="button"
          pending={busy}
          disabled={!editable}
          onclick={() => void inventory({ kind: "sell", itemId: selected.id })}
        >
          <GameIcon name="sell" />Sell
        </Button>
      {/if}

      {#if !selectedSlot && teammates.length}
        <div class="item-operation-row">
          <select aria-label="Give item to" bind:value={recipient}>
            <option value="">Give to…</option>
            {#each teammates as member}
              <option value={member.id}>
                {view.players.find((p) => p.id === member.playerId)?.name}
              </option>
            {/each}
          </select>
          <Button
            type="button"
            pending={busy}
            disabled={!editable || !recipient}
            onclick={() =>
              void inventory({ kind: "transfer", itemId: selected.id, targetHeroId: recipient })}
          >
            <GameIcon name="forward" />Give
          </Button>
        </div>
      {/if}
      {#if !editable && view.phase.kind !== "combat"}
        <small>Gear can be changed at a safe stop.</small>
      {/if}
    </InspectPopover>
  {/if}
  {#if error}
    <InlineNotice error>{error}</InlineNotice>
  {/if}
</section>
