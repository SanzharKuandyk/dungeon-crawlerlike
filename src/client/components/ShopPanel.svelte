<script lang="ts">
  import { itemDefinition, itemDescription } from "../../game/inventory/catalog.js";
  import { treatmentCost } from "../../game/inventory/shops.js";
  import type { Treatment } from "../../shared/inventory-types.js";
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import type { PlayerController } from "../player-controller.js";
  import GameIcon from "./GameIcon.svelte";
  import ItemArtwork from "./ItemArtwork.svelte";
  import Button from "./ui/Button.svelte";
  import DecisionFooter from "./ui/DecisionFooter.svelte";
  import InlineNotice from "./ui/InlineNotice.svelte";
  import InspectPopover from "./ui/InspectPopover.svelte";
  import TransactionFeedback from "./ui/TransactionFeedback.svelte";

  let {
    view,
    controller,
    locked,
    service = "supplies",
  }: {
    view: PlayerRoomView;
    controller: PlayerController;
    locked: boolean;
    service?: "supplies" | "treatment" | "upgrades";
  } = $props();
  let selectedTreatment = $state<Treatment | null>(null);
  let busy = $state(false),
    error = $state("");
  async function buySelected() {
    if (!selected || !hero || busy) return;
    busy = true;
    error = "";
    const ok = await controller.buy(selected.id, hero.inventory.revision);
    busy = false;
    if (!ok) error = controller.error || "Purchase not confirmed.";
  }
  async function treatment(t: import("../../shared/inventory-types.js").Treatment) {
    busy = true;
    error = "";
    const ok = await controller.treat(t);
    busy = false;
    if (!ok) error = controller.error || "Treatment not confirmed.";
  }
  let selectedId = $state("");
  let hero = $derived(view.hero);
  let offers = $derived(view.shop?.offers[hero?.id ?? ""] ?? []);
  let selected = $derived(offers.find((o) => o.id === selectedId));
  let allowance = $derived(
    Math.min(
      view.shop?.allowances[hero?.id ?? ""] ?? 0,
      view.crews.find((c) => c.id === hero?.crewId)?.economy.gold ?? 0,
    ),
  );
  let disabled = $derived(locked || view.decisionReady);
  let upgradeId = $state("");
  let upgrades = $derived(view.shop?.upgrades[hero?.id ?? ""] ?? []);
  let upgrade = $derived(upgrades.find((o) => o.id === upgradeId));
  let upgradeItem = $derived(
    hero &&
      [...hero.inventory.backpack, ...Object.values(hero.inventory.equipment)].find(
        (i) => i?.id === upgrade?.targetItemId,
      ),
  );
  async function upgradeSelected() {
    if (!upgrade || !hero) return;
    busy = true;
    error = "";
    const ok = await controller.upgrade(upgrade.id, upgrade.targetItemId, hero.inventory.revision);
    busy = false;
    if (!ok) error = controller.error;
  }
</script>
{#if hero && view.shop}
  <section class="shop-panel decision-layout" aria-label="Merchant">
    <div class="shop-heading">
      <GameIcon name="merchant" />
      <strong
        >{service === "supplies"
          ? "Supplies"
          : service === "upgrades"
            ? "Upgrade gear"
            : "Treatment"}</strong
      ><span class="budget" title="Your budget"><GameIcon name="gold" size={16} />{allowance}</span>
      <InspectPopover label="Your budget"
        ><p>
          Your share of the crew wallet is reserved on arrival. Unspent gold stays with the crew.
        </p></InspectPopover
      >
    </div>
    <div class="decision-body">
      {#if service === "upgrades"}
        <div class="shop-stock">
          {#each upgrades as offer}
            {@const item =
              hero &&
              [...hero.inventory.backpack, ...Object.values(hero.inventory.equipment)].find(
                (i) => i?.id === offer.targetItemId,
              )}
            {#if item}
              <Button
                class="item-tile"
                disabled={disabled || offer.used}
                aria-pressed={upgradeId === offer.id}
                onclick={() => (upgradeId = offer.id)}
                ><ItemArtwork kind={item.kind} size={32} />
                <span>{itemDefinition(item.kind)?.name}</span
                ><span>I → II · {offer.price} gold</span></Button
              >
            {/if}
          {:else}
            <p>No rank-I gear was owned on arrival.</p>
          {/each}
        </div>
      {:else if service === "supplies"}
        <div class="shop-stock">
          {#each offers as offer}
            <Button
              type="button"
              aria-pressed={selectedId === offer.id}
              aria-label={itemDefinition(offer.kind)?.name}
              disabled={disabled || !offer.stock}
              onclick={() => (selectedId = offer.id)}
              class={`item-tile ${selectedId === offer.id ? "chosen" : ""}`}
            >
              <ItemArtwork kind={offer.kind} size={32} />
              <span>{itemDefinition(offer.kind)?.name}</span>
              <span class="price"><GameIcon name="gold" size={14} />{offer.price}</span>
            </Button>
          {/each}
        </div>
      {:else}
        <div class="build-section-label">
          <GameIcon name="heart" size={16} /><strong>Treatment</strong>
        </div>
        <div class="treatment-row">
          {#if hero.status === "alive"}
            <Button
              type="button"
              aria-label={`Heal ${Math.min(2 * hero.power, hero.maxHp - hero.hp)}`}
              aria-pressed={selectedTreatment?.kind === "heal"}
              disabled={disabled || busy || hero.hp === hero.maxHp || allowance < hero.power}
              onclick={() => (selectedTreatment = { kind: "heal" })}
            >
              <GameIcon name="heart" /><span>+{2 * hero.power}</span
              ><span class="cost"><GameIcon name="gold" size={14} />{hero.power}</span>
            </Button>
            <Button
              type="button"
              aria-label="Remove 3 stress"
              aria-pressed={selectedTreatment?.kind === "calm"}
              disabled={disabled || busy || !hero.stress || allowance < hero.power}
              onclick={() => (selectedTreatment = { kind: "calm" })}
            >
              <GameIcon name="stress" /><span>−3</span
              ><span class="cost"><GameIcon name="gold" size={14} />{hero.power}</span>
            </Button>
          {/if}
          {#each hero.conditions.injuries as injury}
            <Button
              type="button"
              aria-label={`Treat ${injury} injury`}
              disabled={disabled || busy || allowance < 2 * hero.power}
              onclick={() => (selectedTreatment = { kind: "injury", injury })}
            >
              <GameIcon name={injury} /><span>Treat {injury}</span
              ><span class="cost"><GameIcon name="gold" size={14} />{2 * hero.power}</span>
            </Button>
          {/each}
          {#each hero.conditions.afflictions as condition}
            <Button
              type="button"
              aria-label={`Treat ${condition.kind}`}
              disabled={disabled || busy || allowance < 2 * hero.power}
              onclick={() =>
                (selectedTreatment = { kind: "affliction", affliction: condition.kind })}
            >
              <GameIcon name={condition.kind} /><span>{condition.kind}</span
              ><span class="cost"><GameIcon name="gold" size={14} />{2 * hero.power}</span>
            </Button>
          {/each}
        </div>
      {/if}
    </div>
    <section class="shop-inspector" aria-live="polite" aria-label="Selected item">
      {#if service === "upgrades" && upgradeItem}
        <ItemArtwork kind={upgradeItem.kind} size={32} />
        <div>
          <strong>{itemDefinition(upgradeItem.kind)?.name} · rank II</strong>
          <p>{itemDescription(upgradeItem.kind, hero.power, 2)}</p>
          <small>Same item and slot · no Bag space needed.</small>
        </div>
      {:else if service === "supplies" && selected}
        <ItemArtwork kind={selected.kind} size={32} />
        <div>
          <strong>{itemDefinition(selected.kind)?.name}</strong>
          <p>{itemDescription(selected.kind, hero.power)}</p>
          {#if selected.price > allowance}
            <small>Not enough gold in your budget.</small>
          {/if}
        </div>
      {:else if service === "treatment" && selectedTreatment}
        <GameIcon name="heart" />
        <p>
          {selectedTreatment.kind === "heal"
            ? `Restore ${Math.min(2 * hero.power, hero.maxHp - hero.hp)} health`
            : selectedTreatment.kind === "calm"
              ? `Remove ${Math.min(3, hero.stress)} stress`
              : "Remove the selected condition"}
        </p>
      {:else}
        <small
          >{service === "supplies"
            ? "Select an item to see its effect"
            : "Select a treatment"}</small
        >
      {/if}
    </section>
    <DecisionFooter>
      <div class="shop-receipt">
        {#if error}
          <InlineNotice error>{error}</InlineNotice>
        {:else}
          <TransactionFeedback
            feedback={view.transaction}
            operation={service === "supplies" ? "buy" : "treat"}
            compact
            reserved
          />
        {/if}
      </div>
      {#if service === "upgrades"}
        <Button
          primary
          pending={busy}
          disabled={disabled || !upgrade || upgrade.used || upgrade.price > allowance}
          onclick={() => void upgradeSelected()}
          >Confirm upgrade{upgrade ? ` · ${upgrade.price} gold` : ""}</Button
        >
      {:else if service === "supplies"}
        <Button
          primary
          pending={busy}
          disabled={disabled || !selected || !selected.stock || selected.price > allowance}
          onclick={() => void buySelected()}
          ><GameIcon name="gold" />Buy{selected ? ` · ${selected.price}` : ""}</Button
        >
      {:else}
        <Button
          primary
          pending={busy}
          disabled={disabled ||
            !selectedTreatment ||
            treatmentCost(hero, selectedTreatment) > allowance}
          onclick={() => selectedTreatment && void treatment(selectedTreatment)}
          >Confirm treatment{selectedTreatment
            ? ` · ${treatmentCost(hero, selectedTreatment)} gold`
            : ""}</Button
        >
      {/if}
    </DecisionFooter>
  </section>
{/if}
