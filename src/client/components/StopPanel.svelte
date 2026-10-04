<script lang="ts">
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import type { PlayerController } from "../player-controller.js";
  import CampPicker from "./CampPicker.svelte";
  import GameIcon from "./GameIcon.svelte";
  import InventoryDialog from "./InventoryDialog.svelte";
  import ShopPanel from "./ShopPanel.svelte";
  import Button from "./ui/Button.svelte";

  let {
    view,
    controller,
    locked,
  }: { view: PlayerRoomView; controller: PlayerController; locked: boolean } = $props();
  let service = $state<"menu" | "supplies" | "treatment" | "decision">("menu"),
    bag = $state(false),
    phase = $state(-1);
  $effect(() => {
    if (phase !== view.phaseId) {
      phase = view.phaseId;
      service = "menu";
    }
  });
  let crew = $derived(view.crews.find((c) => c.id === view.self.crewId));
  let node = $derived(view.expeditionMap?.nodes.find((n) => n.id === crew?.mapPosition?.nodeId));
  let market = $derived(
    ["merchant", "altar", "shrine"].includes(node?.kind ?? "") && !view.recoveryAvailable,
  );
</script>
<section
  class="stop-panel decision-layout"
  data-service={service}
  data-location={market ? "market" : "camp"}
>
  {#if service !== "menu"}
    <nav class="service-navigation" aria-label="Stop services">
      <Button variant="quiet" aria-label="← Services" onclick={() => (service = "menu")}
        ><GameIcon name="leave" />Services</Button
      >
      <strong
        >{service === "supplies"
          ? "Shop"
          : service === "treatment"
            ? "Treatment"
            : "Crew decision"}</strong
      >
    </nav>
  {/if}
  {#if service === "menu"}
    <div class="decision-body">
      <header class="result-heading">
        <GameIcon
          name={view.recoveryAvailable ? "revive" : node?.kind === "merchant" ? "merchant" : "fire"}
          size={48}
        />
        <div>
          <h2>
            {view.recoveryAvailable
              ? "Recovery"
              : market
                ? "Trading post"
                : node?.kind === "event"
                  ? node.room.name
                  : "Camp"}
          </h2>
          <small
            >{market
              ? "Buy gear · paid treatment"
              : node?.kind === "event"
                ? "Inspect your choices"
                : "Rest with your crew · recover"}</small
          >
        </div>
      </header>
      <div class="service-menu">
        {#if view.shop && market}
          <Button disabled={view.decisionReady} onclick={() => (service = "supplies")}
            ><GameIcon name="merchant" />Supplies</Button
          >
        {/if}
        {#if view.shop}
          <Button disabled={view.decisionReady} onclick={() => (service = "treatment")}
            ><GameIcon name="heart" />Treatment</Button
          >
        {/if}
        <Button onclick={() => (bag = true)}><GameIcon name="backpack" />Backpack</Button>
        <Button primary onclick={() => (service = "decision")}
          ><GameIcon name="forward" />
          {view.decisionReady
            ? "Crew readiness"
            : view.recoveryAvailable
              ? "Rest / Retry"
              : market
                ? "Leave shop"
                : "Rest / Leave"}</Button
        >
      </div>
    </div>
  {:else if service === "decision" && view.hero?.status === "dead" && crew?.status !== "eliminated"}
    <div class="decision-body">
      <p>
        Living crew members choose when to leave. Use Treatment to revive, or Return with rescue
        debt.
      </p>
    </div>
  {:else if service === "decision"}
    <CampPicker {view} {controller} {locked} />
  {:else}
    <ShopPanel {view} {controller} {locked} {service} />
  {/if}
</section>
<InventoryDialog bind:open={bag} {view} {controller} {locked} />
