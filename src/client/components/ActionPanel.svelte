<script lang="ts">
  import type { Snippet } from "svelte";
  import { actionKey } from "../../game/action-options.js";
  import type { HeroAction } from "../../shared/command-types.js";
  import type { ArenaState } from "../../shared/game-types.js";
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import { actionLabel } from "../action-labels.js";
  import type { PlayerController } from "../player-controller.js";
  import CrewStage from "./CrewStage.svelte";
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
  let inputLocked = $derived(locked || !active);
  $effect(() => {
    if (phase !== view.phaseId || playerId !== view.self.id) {
      phase = view.phaseId;
      playerId = view.self.id;
      mode = attack;
      target = "";
    }
  });
</script>
<section
  class="combat-console stable-console"
  class:question-panel={panel === "question"}
  class:map-panel={panel === "map"}
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
      onchoose={(action) => (target = actionKey(action))}
    />
  {/if}
  <div class="combat-hud" hidden={panel !== "combat"} class:awaiting-turn={!active}>
    <div class="action-tabs">
      {#each [attack, "brace", "loot", skill] as kind}
        <button
          type="button"
          class:chosen={mode === kind}
          aria-pressed={mode === kind}
          disabled={inputLocked || !view.legalActions.some((a) => a.kind === kind)}
          onclick={() => {
            mode = kind as HeroAction["kind"];
            target = "";
          }}
        >
          {kind.replace("duel-", "")[0].toUpperCase() + kind.replace("duel-", "").slice(1)}
        </button>
      {/each}
    </div>
    <p class="target-hint">
      {!active
        ? message
        : options.some((a) => "targetHeroId" in a)
          ? "Tap a highlighted hero to target."
          : options.some((a) => "part" in a)
            ? "Choose Body or Weak point on the enemy."
            : mode === "brace"
              ? "Reduce damage and stress this turn."
              : "Compete for treasure. Collect only if you survive."}
    </p>
    <button
      type="button"
      class="primary confirm-action"
      disabled={inputLocked || !selected}
      onclick={() => selected && void controller.action(selected)}
    >
      {active ? `Confirm · ${actionLabel(selected, view)}` : "Waiting for the next choice"}
    </button>
    <div class="confirmed">
      <span
        >{!active
          ? "Expedition update"
          : view.selectedAction
            ? "Confirmed ✓"
            : "Not confirmed yet"}</span
      ><strong aria-live="polite"
        >{active ? actionLabel(view.selectedAction, view) : message}</strong
      >
    </div>
    <div class="crew-tactics">
      <button type="button" class="quiet tactics-trigger" popovertarget={`tactics-${view.self.id}`}>
        Crew actions & withdrawal
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
