<script lang="ts">
  import type { Snippet } from "svelte";
  import { actionKey } from "../../game/action-options.js";
  import { itemDefinition } from "../../game/inventory/catalog.js";
  import type { HeroAction } from "../../shared/command-types.js";
  import { ACTION_NAMES, CLASS_SKILLS } from "../../shared/display-names.js";
  import type { ArenaState } from "../../shared/game-types.js";
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import { actionLabel } from "../action-labels.js";
  import type { PlayerController } from "../player-controller.js";
  import ActionIcon from "./ActionIcon.svelte";
  import ActionPreview from "./ActionPreview.svelte";
  import BattleOutcome from "./BattleOutcome.svelte";
  import CrewStage from "./CrewStage.svelte";
  import DuelPanel from "./DuelPanel.svelte";
  import GameIcon from "./GameIcon.svelte";
  import LastTurn from "./LastTurn.svelte";
  import Button from "./ui/Button.svelte";
  import DecisionFooter from "./ui/DecisionFooter.svelte";
  import WithdrawalVote from "./WithdrawalVote.svelte";

  let {
    view,
    controller,
    locked,
    arena,
    actor = null,
    cursor = Infinity,
    active = false,
    panel = "combat",
    message = "",
    children,
  }: {
    view: PlayerRoomView;
    controller: PlayerController;
    locked: boolean;
    arena: ArenaState;
    actor?: string | null;
    cursor?: number;
    active?: boolean;
    panel?: "combat" | "phase" | "question" | "map";
    message?: string;
    children?: Snippet;
  } = $props();
  let mode = $state<HeroAction["kind"]>("attack"),
    target = $state(""),
    phase = $state(-1),
    playerId = $state("");
  const attack = "attack";
  let classSkill = $derived(CLASS_SKILLS[view.hero?.classId ?? "knight"]);
  let skill = $derived<HeroAction["kind"]>(classSkill);
  let options = $derived(view.legalActions.filter((a) => a.kind === mode));
  let selected = $derived(
    options.find((a) => actionKey(a) === target) ??
      options.find(
        (a) =>
          "targetHeroId" in a &&
          arena.heroes.some((h) => h.id === a.targetHeroId && h.crewId === view.self.crewId),
      ) ??
      options[0] ??
      null,
  );
  let crew = $derived(arena.crews.find((c) => c.id === view.self.crewId));
  let pane = $state<HTMLDivElement | null>(null);
  $effect(() => {
    view.phaseId;
    if (pane) pane.scrollTop = 0;
  });
  function chooseTarget(action: HeroAction) {
    target = actionKey(action);
  }
  let inputLocked = $derived(locked || !active || view.decisionReady);
  let solo = $derived(view.crewInputs.length === 1);
  $effect(() => {
    if (phase !== view.phaseId || playerId !== view.self.id) {
      phase = view.phaseId;
      playerId = view.self.id;
      mode = view.selectedAction?.kind ?? attack;
      target = view.selectedAction ? actionKey(view.selectedAction) : "";
    }
  });
  let currentDuel = $derived(
    view.duels.find(
      (duel) => duel.status === "active" && duel.crewIds.includes(view.self.crewId ?? ""),
    ),
  );
</script>
<section
  class="combat-console stable-console"
  class:question-panel={panel === "question"}
  class:map-panel={panel === "map"}
  class:phase-panel={panel === "phase"}
  aria-label="Expedition scene"
>
  {#if crew}
    <CrewStage
      {view}
      {arena}
      {crew}
      obscured={panel === "map" || panel === "question"}
      {actor}
      targetActions={active ? options : []}
      selectedAction={selected}
      locked={inputLocked}
      onchoose={chooseTarget}
    />
  {/if}
  {#if currentDuel}
    <DuelPanel {view} duel={currentDuel} {controller} {locked} />
  {/if}
  {#if panel === "combat" && !currentDuel}
    <div class="combat-hud" class:awaiting-turn={!active}>
      {#if active}
        <div class="decision-body">
          <div class="action-tabs">
            {#each [attack, "brace", "use-item", skill] as kind}
              <Button
                type="button"
                aria-pressed={mode === kind}
                disabled={inputLocked || !view.legalActions.some((a) => a.kind === kind)}
                onclick={() => {
                  mode = kind as HeroAction["kind"];
                  target = "";
                }}
                class={`${mode === kind ? "chosen" : ""}`}
              >
                <ActionIcon {kind} />
                <span>{ACTION_NAMES[kind as HeroAction["kind"]]}</span>
                {#if kind === skill && view.hero && view.hero.skillReadyTurn > view.turn}
                  <small>Ready on turn {view.hero.skillReadyTurn}</small>
                {/if}
              </Button>
            {/each}
          </div>
          <fieldset class="action-targets" aria-label="Enemy target">
            {#each options.filter((action) => "part" in action) as action}
              <Button
                type="button"
                aria-pressed={!!selected && actionKey(selected) === actionKey(action)}
                disabled={inputLocked}
                onclick={() => chooseTarget(action)}
                class={`${selected && actionKey(selected) === actionKey(action) ? "chosen" : ""}`}
              >
                {"part" in action && action.part === "body" ? "Body" : "Seal"}
              </Button>
            {/each}
          </fieldset>
          {#if mode === "use-item"}
            <div class="action-targets">
              {#each options as action}
                {#if action.kind === "use-item"}
                  <Button
                    type="button"
                    disabled={inputLocked}
                    onclick={() => chooseTarget(action)}
                    class={`${selected && actionKey(selected) === actionKey(action) ? "chosen" : ""}`}
                  >
                    {@const item = view.hero?.inventory.backpack.find(
                      (i) => i.id === action.itemId,
                    )}
                    {item ? itemDefinition(item.kind)?.name : "Item"}
                    ·
                    {view.players.find(
                      (p) =>
                        p.id === view.heroes.find((h) => h.id === action.targetHeroId)?.playerId,
                    )?.name}
                  </Button>
                {/if}
              {/each}
            </div>
          {/if}
        </div>
        <DecisionFooter>
          <ActionPreview action={selected} {view} />
          <div class="commit-action">
            <Button
              primary
              class="confirm-action"
              pending={locked && controller.pending > 0}
              disabled={inputLocked || !selected || view.decisionReady}
              label={`${solo ? "Play turn" : "Ready"} · ${actionLabel(selected, view)}`}
              onclick={() => selected && void controller.action(selected)}
            >
              <ActionIcon kind="confirm" />
              {view.decisionReady ? "Ready" : solo ? "Play turn" : "Ready"}
            </Button>
            {#if view.decisionReady}
              <Button
                type="button"
                class="edit-action"
                disabled={locked}
                onclick={() => void controller.edit()}
              >
                Change
              </Button>
            {/if}
          </div>
          <div class="confirmed">
            <span
              >{view.decisionReady
                ? view.speed === "manual"
                  ? "Ready · manual step pending"
                  : "Ready · waiting for the crew"
                : solo
                  ? "Play turn commits this action"
                  : "Preview · press Ready to commit"}</span
            >
          </div>
          <LastTurn summary={view.lastTurn} compact />
          <div class="crew-tactics">
            <Button
              type="button"
              class="quiet ui-icon-button tactics-trigger"
              aria-label="Retreat"
              popovertarget={`tactics-${view.self.id}`}
            >
              <GameIcon name="leave" />
            </Button>
            <div class="tactics-content" id={`tactics-${view.self.id}`} popover="auto">
              <WithdrawalVote {view} {controller} locked={inputLocked} />
            </div>
          </div>
        </DecisionFooter>
      {:else}
        <div class="decision-body">
          <BattleOutcome {view} {arena} {cursor} {message} />
        </div>
      {/if}
    </div>
  {:else if !currentDuel}
    <div class="phase-pane" bind:this={pane}>
      {#key view.self.id}
        {#if children}
          {@render children()}
        {/if}
      {/key}
    </div>
  {/if}
</section>
