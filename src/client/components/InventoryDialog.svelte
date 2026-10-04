<script lang="ts">
  import { CLASS_NAMES } from "../../shared/display-names.js";
  import type { Hero } from "../../shared/game-types.js";
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import type { PlayerController } from "../player-controller.js";
  import InventorySlots from "./InventorySlots.svelte";
  import ItemActions from "./ItemActions.svelte";
  import TraitPanel from "./TraitPanel.svelte";
  import Button from "./ui/Button.svelte";
  import Dialog from "./ui/Dialog.svelte";
  import Tabs from "./ui/Tabs.svelte";
  import TransactionFeedback from "./ui/TransactionFeedback.svelte";
  import VitalsStrip from "./VitalsStrip.svelte";

  let {
    view,
    controller,
    locked,
    open = $bindable(false),
    presentedHero,
  }: {
    view: PlayerRoomView;
    controller: PlayerController;
    locked: boolean;
    open?: boolean;
    presentedHero?: Hero | null;
  } = $props();
  let hero = $derived(
    view.hero && presentedHero
      ? {
          ...view.hero,
          hp: presentedHero.hp,
          stress: presentedHero.stress,
          conditions: presentedHero.conditions,
          status: presentedHero.status,
        }
      : view.hero,
  );
  let selectedId = $state("");
  let selectedSlot = $derived(
    hero
      ? (["weapon", "armor", "charm"] as const).find(
          (slot) => hero.inventory.equipment[slot]?.id === selectedId,
        )
      : undefined,
  );
  let selected = $derived(
    hero?.inventory.backpack.find((i) => i.id === selectedId) ??
      (selectedSlot ? hero?.inventory.equipment[selectedSlot] : null),
  );
  let selectedTab = $state("gear");
  let editable = $derived(
    !locked &&
      !view.trial &&
      !view.decisionReady &&
      ["camp", "route", "result", "floor-result"].includes(view.phase.kind),
  );
</script>
<Dialog bind:open title="Backpack">
  {#snippet context()}
    {#if hero}
      <div class="build-identity">
        <strong>{view.self.name}</strong><span>{CLASS_NAMES[hero.classId]}</span>
      </div>
      <VitalsStrip {hero} />
    {/if}
  {/snippet}
  {#if hero}
    <Tabs
      bind:value={selectedTab}
      label="Character build"
      items={[
        { id: "gear", label: "Gear" },
        { id: "traits", label: "Traits" },
      ]}
    >
      {#snippet children(
        tab,
      )}
        {#if tab === "gear"}
          <InventorySlots {hero} bind:selectedId {controller} {editable} />
        {:else}
          <TraitPanel {hero} {controller} {editable} />
        {/if}
      {/snippet}
    </Tabs>
  {/if}
  {#snippet footer()}
    <div class="inventory-footer">
      <TransactionFeedback
        compact
        reserved
        feedback={view.transaction && ["equip", "inventory"].includes(view.transaction.operation)
          ? view.transaction
          : null}
      />
      <div class="inventory-operation">
        {#if selected && hero && selectedTab === "gear"}
          <ItemActions
            {selected}
            {selectedSlot}
            {hero}
            {view}
            {controller}
            {editable}
            {locked}
            details={false}
            onuse={() => (open = false)}
          />
        {/if}
      </div>
      <Button variant="quiet" onclick={() => (open = false)}>Done</Button>
    </div>
  {/snippet}
</Dialog>
