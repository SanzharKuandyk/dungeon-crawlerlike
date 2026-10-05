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
  let haste = $state(false),
    slot = $state(0),
    first = $state<HeroAction | null>(null),
    second = $state<HeroAction | null>(null);
  let charm = $derived(view.hero?.inventory.equipment.charm);
  let canHaste = $derived(
    charm?.kind === "haste-charm" && !view.hero?.encounterUses.includes("haste"),
  );
  function chooseSlot(index: number) {
    if (slot === 0) first = selected;
    else second = selected;
    slot = index;
    const action = index === 0 ? first : second;
    mode = action?.kind ?? "attack";
    target = action ? actionKey(action) : "";
  }
  function commit() {
    if (!selected || !view.hero) return;
    if (slot === 0) first = selected;
    else second = selected;
    if (!haste) {
      void controller.action(selected);
      return;
    }
    if (
      !first ||
      !second ||
      !charm ||
      first.kind === "ward" ||
      first.kind === "observe" ||
      second.kind === "ward" ||
      second.kind === "observe"
    )
      return;
    void controller.plan({
      kind: "hero",
      actions: [first, second],
      activation: { kind: "haste", itemId: charm.id },
      inventoryRevision: view.hero.inventory.revision,
    });
  }
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
  let planComplete = $derived(!haste || (slot === 0 ? !!second : !!first));
  let otherAction = $derived(slot === 0 ? second : first);
  let duplicateLimited = $derived(
    !!selected &&
      !!otherAction &&
      ((selected.kind === "use-item" && otherAction.kind === "use-item") ||
        (selected.kind === skill && otherAction.kind === skill)),
  );
  let solo = $derived(view.crewInputs.length === 1);
  $effect(() => {
    if (phase !== view.phaseId || playerId !== view.self.id) {
      phase = view.phaseId;
      playerId = view.self.id;
      mode = view.selectedAction?.kind ?? attack;
      target = view.selectedAction ? actionKey(view.selectedAction) : "";
      haste = view.selectedPlan?.kind === "hero" && !!view.selectedPlan.activation;
      first = view.selectedPlan?.kind === "hero" ? view.selectedPlan.actions[0] : null;
      second = view.selectedPlan?.kind === "hero" ? (view.selectedPlan.actions[1] ?? null) : null;
      slot = 0;
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
  class:battle-console={panel === "combat" && !currentDuel}
  aria-label="Expedition scene"
>
  <div class="combat-main">
    {#if crew}
      <CrewStage
        {view}
        {arena}
        {crew}
        obscured={panel === "map" || panel === "question"}
        {actor}
        combatHud={panel === "combat" && !currentDuel}
        targetActions={active ? options : []}
        selectedAction={selected}
        locked={inputLocked}
        onchoose={chooseTarget}
      />
    {/if}
    {#if currentDuel && panel !== "question"}
      <DuelPanel {view} duel={currentDuel} {controller} {locked} />
    {/if}
    {#if panel === "combat" && !currentDuel}
      <div class="combat-hud" class:awaiting-turn={!active}>
        {#if active}
          <div class="decision-body">
            {#if canHaste || haste}
              <div class="plan-slots">
                <Button
                  variant={haste ? "secondary" : "quiet"}
                  disabled={inputLocked}
                  aria-pressed={haste}
                  onclick={() => {
                    haste = !haste;
                    slot = 0;
                    second = null;
                  }}
                  ><GameIcon name="haste-charm" />Haste ·
                  {haste ? "2 actions" : "once / fight"}</Button
                >
                {#if haste}
                  <Button
                    disabled={inputLocked}
                    aria-pressed={slot === 0}
                    onclick={() => chooseSlot(0)}
                    >Action 1</Button
                  >
                  <Button
                    disabled={inputLocked}
                    aria-pressed={slot === 1}
                    onclick={() => chooseSlot(1)}
                    >Action 2</Button
                  >
                {/if}
              </div>
            {/if}
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
        {:else}
          <div class="decision-body">
            <BattleOutcome {view} {arena} {cursor} {message} />
          </div>
        {/if}
      </div>
    {:else if !currentDuel || panel === "question"}
      <div class="phase-pane" bind:this={pane}>
        {#key view.self.id}
          {#if children}
            {@render children()}
          {/if}
        {/key}
      </div>
    {/if}
  </div>
  {#if panel === "combat" && !currentDuel && active}
    <DecisionFooter>
      <ActionPreview action={selected} {view} />
      <div class="combat-commit">
        <div class="commit-action">
          <Button
            primary
            class="confirm-action"
            pending={locked && controller.pending > 0}
            disabled={inputLocked ||
              !selected ||
              !planComplete ||
              duplicateLimited ||
              view.decisionReady}
            label={`${solo ? "Play turn" : "Ready"} · ${actionLabel(selected, view)}`}
            onclick={commit}
          >
            <ActionIcon kind="confirm" />
            {view.decisionReady
              ? "Ready"
              : !planComplete
                ? "Choose action 2"
                : duplicateLimited
                  ? "Change duplicate action"
                  : solo
                    ? "Play turn"
                    : "Ready"}
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
        <div class="battle-utilities">
          <div class="last-turn-slot"><LastTurn summary={view.lastTurn} compact /></div>
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
        </div>
      </div>
      <div class="confirmed">
        {#if haste && !planComplete}
          <span>Choose both action slots before Ready.</span>
        {/if}
        {#if duplicateLimited}
          <span>One skill and one consumable maximum per turn.</span>
        {/if}
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
    </DecisionFooter>
  {/if}
</section>
