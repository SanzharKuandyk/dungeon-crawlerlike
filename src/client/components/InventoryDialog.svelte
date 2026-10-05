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
  let safeDecision = $derived(
    ["camp", "route", "result", "floor-result"].includes(view.phase.kind),
  );
  let duel = $derived(
    view.duels.some((d) => d.status === "active" && d.crewIds.includes(view.self.crewId ?? "")),
  );
  let unavailableReason = $derived(
    view.readOnly
      ? "Another tab controls this character."
      : view.status !== "running"
        ? "Gear changes are locked while the expedition is paused or finished."
        : view.trial || view.siege
          ? "Finish the shared event before changing gear."
          : duel || !safeDecision
            ? "Gear stays fixed during a fight. Change it after the fight or at a safe stop."
            : view.decisionReady
              ? "You are Ready. Press Change to reopen your gear choices."
              : locked
                ? "Waiting for your request to be confirmed."
                : "",
  );
  let editable = $derived(
    !locked &&
      !view.trial &&
      !view.siege &&
      !duel &&
      !view.decisionReady &&
      ["camp", "route", "result", "floor-result"].includes(view.phase.kind),
  );
</script>
<Dialog bind:open title="Backpack" class="inventory-dialog">
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
            {unavailableReason}
            details={false}
            onuse={() => (open = false)}
          />
        {/if}
      </div>
      {#if safeDecision && view.decisionReady && !view.trial && !view.siege && !duel}
        <Button disabled={locked} onclick={() => void controller.edit()}>Change</Button>
      {/if}
      <Button variant="quiet" onclick={() => (open = false)}>Done</Button>
    </div>
  {/snippet}
</Dialog>
