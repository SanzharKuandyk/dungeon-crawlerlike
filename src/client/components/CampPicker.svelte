<script lang="ts">
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import type { PlayerController } from "../player-controller.js";
  import GameIcon from "./GameIcon.svelte";
  import Button from "./ui/Button.svelte";
  import InspectPopover from "./ui/InspectPopover.svelte";

  let {
    view,
    controller,
    locked,
  }: { view: PlayerRoomView; controller: PlayerController; locked: boolean } = $props();
  let selected = $state<import("../../shared/command-types.js").CampChoice | null>(null);

  import DecisionFooter from "./ui/DecisionFooter.svelte";
  import ReadyStatus from "./ui/ReadyStatus.svelte";

  let crew = $derived(view.crews.find((c) => c.id === view.self.crewId));
  let node = $derived(view.expeditionMap?.nodes.find((n) => n.id === crew?.mapPosition?.nodeId));
  let needsRescue = $derived(
    !view.heroes.some((h) => h.crewId === view.self.crewId && h.status === "alive"),
  );
  let selectionContext = $state("");
  $effect(() => {
    const context = `${view.self.id}:${view.phaseId}:${needsRescue}`;
    if (context !== selectionContext) {
      selectionContext = context;
      selected = null;
    }
  });
</script>
<section class="decision-layout">
  <div class="decision-body">
    <div class="camp-emblem">
      <GameIcon
        name={needsRescue
          ? "revive"
          : node?.kind === "event"
            ? "dice"
            : node?.kind === "merchant"
              ? "merchant"
              : "fire"}
        size={44}
      />
      <h3>{needsRescue ? "Rescue party" : (node?.room.name ?? "Recovery")}</h3>
    </div>
    {#if needsRescue}
      <p>Lose half the gold · 24 rescue debt · return at half health</p>
      <Button
        type="button"
        disabled={locked || view.decisionReady}
        class={selected === "rescue" ? "chosen" : ""}
        aria-pressed={selected === "rescue"}
        onclick={() => (selected = "rescue")}
      >
        Accept rescue
      </Button>
    {:else}
      {#if view.recoveryAvailable ||
        (view.restAvailable && ["camp", "altar", "shrine"].includes(node?.kind ?? ""))}
        <Button
          type="button"
          disabled={locked || view.decisionReady}
          class={selected === "rest" ? "chosen" : ""}
          aria-pressed={selected === "rest"}
          onclick={() => (selected = "rest")}
        >
          <GameIcon name="rest" />Rest
          <span class="hud-effects"
            ><span
              ><GameIcon name="heart" size={16} />+{Math.min(
                2 * (view.hero?.power ?? 0),
                (view.hero?.maxHp ?? 0) - (view.hero?.hp ?? 0),
              )}</span
            ><span
              ><GameIcon name="stress" size={16} />−{Math.min(
                view.hero?.stress ?? 0,
                view.hero?.conditions.afflictions.some((a) => a.kind === "haunted") ? 1 : 2,
              )}</span
            ></span
          >
        </Button>
      {/if}
      {#if node?.kind === "event"}
        <InspectPopover label="Possible outcomes">
          {#snippet trigger()}
            <GameIcon name="dice" />
            <strong
              >{node.eventId === "trapped-cache"
                ? "75%"
                : node.eventId === "coin-fountain"
                  ? "50%"
                  : "Guaranteed"}</strong
            ><GameIcon name="info" size={16} />
          {/snippet}
          <p>
            {node.eventId === "trapped-cache"
              ? "75% +12 gold · otherwise arm injury"
              : node.eventId === "coin-fountain"
                ? "50% rank-I Blessing · otherwise +3 stress"
                : node.eventId === "sacrificial-altar"
                  ? `Pay ${view.hero?.power ?? 0} health · guaranteed Ward vest`
                  : `Heal ${2 * (view.hero?.power ?? 0)} or remove 3 stress`}{view.heroes.some(
              (h) => h.crewId === view.self.crewId && h.status === "alive" && h.stress >= 7,
            )
              ? " · chance reduced by 10%"
              : ""}
          </p>
        </InspectPopover>
        {#if ["coin-fountain", "trapped-cache"].includes(node.eventId ?? "")}
          <Button
            type="button"
            disabled={locked || view.decisionReady}
            class={selected === "risk" ? "chosen" : ""}
            aria-pressed={selected === "risk"}
            onclick={() => (selected = "risk")}
          >
            <GameIcon name="dice" />Take the risk
          </Button>
        {:else if node.eventId === "sacrificial-altar"}
          <Button
            type="button"
            disabled={locked ||
              view.decisionReady ||
              view.heroes.some(
                (h) => h.status === "alive" && h.crewId === view.self.crewId && h.hp <= h.power,
              )}
            class={selected === "sacrifice" ? "chosen" : ""}
            aria-pressed={selected === "sacrifice"}
            onclick={() => (selected = "sacrifice")}
          >
            <GameIcon name="heart" />Offer {view.hero?.power} · <GameIcon name="armor" />
          </Button>
        {:else}
          <Button
            type="button"
            disabled={locked || view.decisionReady}
            class={selected === "recover-health" ? "chosen" : ""}
            aria-pressed={selected === "recover-health"}
            onclick={() => (selected = "recover-health")}
          >
            <GameIcon name="heart" />+{Math.min(
              2 * (view.hero?.power ?? 0),
              (view.hero?.maxHp ?? 0) - (view.hero?.hp ?? 0),
            )}
          </Button><Button
            type="button"
            disabled={locked || view.decisionReady}
            class={selected === "recover-stress" ? "chosen" : ""}
            aria-pressed={selected === "recover-stress"}
            onclick={() => (selected = "recover-stress")}
          >
            <GameIcon name="stress" />−{Math.min(3, view.hero?.stress ?? 0)}
          </Button>
        {/if}
      {/if}
      {#if node?.kind === "arena"}
        <InspectPopover label="Arena rules"
          ><small
            >Optional arena: dungeon equipment, stress, injuries and Blessings are suspended. Health
            loss remains. One duel per expedition.</small
          >
        </InspectPopover>
      {/if}
      <Button
        type="button"
        disabled={locked || view.decisionReady}
        class={selected === "continue" ? "chosen" : ""}
        aria-pressed={selected === "continue"}
        onclick={() => (selected = "continue")}
      >
        <GameIcon name="forward" />{view.recoveryAvailable ? "Retry" : "Continue"}
      </Button>
    {/if}
  </div>
  <DecisionFooter
    hint={view.decisionReady
      ? "Waiting for your crew"
      : selected
        ? "Preview · press Ready to confirm"
        : "Choose rest or leave"}
  >
    <ReadyStatus
      ready={view.crewInputs.filter((p) => p.ready).length}
      total={view.crewInputs.filter((p) =>
        view.heroes.some((h) => h.playerId === p.playerId && (h.status === "alive" || needsRescue)),
      ).length}
    />
    {#if view.decisionReady}
      <Button type="button" disabled={locked} onclick={() => void controller.edit()}>Change</Button>
    {:else}
      <Button
        type="button"
        class="primary"
        pending={locked && controller.pending > 0}
        disabled={locked || !selected}
        onclick={() => selected && void controller.camp(selected)}
        >Ready</Button
      >
    {/if}
  </DecisionFooter>
</section>
