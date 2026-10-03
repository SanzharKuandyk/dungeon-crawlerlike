<script lang="ts">
  import type { Snippet } from "svelte";
  import { actionKey } from "../../game/action-options.js";
  import type { HeroAction } from "../../shared/command-types.js";
  import type { ArenaState } from "../../shared/game-types.js";
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import { actionLabel } from "../action-labels.js";
  import type { PlayerController } from "../player-controller.js";
  import ActionIcon from "./ActionIcon.svelte";
  import CrewStage from "./CrewStage.svelte";
  import DuelPanel from "./DuelPanel.svelte";
  import WithdrawalVote from "./WithdrawalVote.svelte";

  let {
    view,
    controller,
    locked,
    arena,
    actor = null,
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
    active?: boolean;
    panel?: "combat" | "phase" | "question" | "map";
    message?: string;
    children?: Snippet;
  } = $props();
  let mode = $state<HeroAction["kind"]>("attack"),
    target = $state(""),
    phase = $state(-1),
    playerId = $state("");
  let duel = $derived(view.legalActions.some((a) => a.kind === "duel-attack"));
  let attack = $derived<HeroAction["kind"]>(duel ? "duel-attack" : "attack");
  let classSkill = $derived(
    (
      {
        knight: "protect",
        physician: "mend",
        occultist: "hex",
        scavenger: "pilfer",
        wanderer: "skirmish",
        exorcist: "channel",
      } as const
    )[view.hero?.classId ?? "knight"],
  );
  let skill = $derived<HeroAction["kind"]>(
    duel && ["hex", "pilfer", "skirmish", "channel"].includes(classSkill)
      ? (`duel-${classSkill}` as HeroAction["kind"])
      : classSkill,
  );
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
    if (view.decisionReady) void controller.edit();
    target = actionKey(action);
  }
  let inputLocked = $derived(locked || !active);
  $effect(() => {
    if (phase !== view.phaseId || playerId !== view.self.id) {
      phase = view.phaseId;
      playerId = view.self.id;
      mode = attack;
      target = "";
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
  <div
    class="combat-hud"
    hidden={panel !== "combat" || !!currentDuel}
    class:awaiting-turn={!active}
  >
    <div class="action-tabs">
      {#each [attack, "brace", "loot", skill] as kind}
        <button
          type="button"
          class:chosen={mode === kind}
          aria-pressed={mode === kind}
          disabled={inputLocked || !view.legalActions.some((a) => a.kind === kind)}
          onclick={() => {
            if (view.decisionReady) void controller.edit();
            mode = kind as HeroAction["kind"];
            target = "";
          }}
        >
          <ActionIcon {kind} />
          <span
            >{kind.replace("duel-", "")[0].toUpperCase() + kind.replace("duel-", "").slice(1)}</span
          >
        </button>
      {/each}
    </div>
    <fieldset class="action-targets" aria-label="Enemy target">
      {#each options.filter((action) => "part" in action) as action}
        <button
          type="button"
          class:chosen={!!selected && actionKey(selected) === actionKey(action)}
          aria-pressed={!!selected && actionKey(selected) === actionKey(action)}
          disabled={inputLocked}
          onclick={() => chooseTarget(action)}
        >
          {"part" in action && action.part === "body" ? "Body" : "Weak point"}
        </button>
      {/each}
    </fieldset>
    <p class="order-preview">{active ? actionLabel(selected, view) : message}</p>
    <button
      type="button"
      class="primary confirm-action"
      disabled={inputLocked || !selected || view.decisionReady}
      aria-label={active
        ? `Confirm · ${actionLabel(selected, view)}`
        : "Waiting for the next choice"}
      onclick={() => selected && void controller.action(selected)}
    >
      <ActionIcon kind="confirm" />{view.decisionReady ? "Ready" : active ? "Confirm" : "Waiting"}
    </button>
    <div class="confirmed">
      <span
        >{!active
          ? "Expedition update"
          : view.selectedAction
            ? "Confirmed ✓"
            : "No action submitted"}</span
      ><strong aria-live="polite"
        >{active
          ? view.selectedAction
            ? actionLabel(view.selectedAction, view)
            : ""
          : message}</strong
      >
    </div>
    <div class="crew-tactics">
      <button type="button" class="quiet tactics-trigger" popovertarget={`tactics-${view.self.id}`}>
        <ActionIcon kind="crew" /><span>Crew</span>
      </button>
      <div class="tactics-content" id={`tactics-${view.self.id}`} popover="auto">
        <ul class="vote-list">
          {#each view.crewInputs as member}
            <li><span>{member.name}</span><strong>{actionLabel(member.action, view)}</strong></li>
          {/each}
        </ul>
        <WithdrawalVote {view} {controller} locked={inputLocked} />
      </div>
    </div>
  </div>
  <div class="phase-pane" bind:this={pane} hidden={panel === "combat"}>
    {#if children}
      {@render children()}
    {/if}
  </div>
</section>
