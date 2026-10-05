<script lang="ts">
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import GameIcon from "./GameIcon.svelte";
  import RoundTimer from "./RoundTimer.svelte";

  let { view, serverNow }: { view: PlayerRoomView; serverNow: number } = $props();
  let elapsed = $derived(
    view.status === "paused"
      ? view.phaseDuration - (view.remaining ?? view.phaseDuration)
      : Math.max(0, serverNow - view.phaseStartedAt),
  );
  let fraction = $derived(elapsed / Math.max(1, view.phaseDuration));
  let stage = $derived(
    view.phase.kind === "combat"
      ? 0
      : view.phase.kind === "combat-reveal"
        ? fraction < 0.6
          ? 1
          : fraction < 0.8
            ? 2
            : 3
        : 3,
  );
  let ready = $derived(view.crewInputs.filter((p) => p.ready).length);
  let waiting = $derived(view.crewInputs.filter((p) => !p.ready));
  let description = $derived(
    view.status === "paused"
      ? "Expedition paused"
      : view.phase.kind !== "combat"
        ? ["", "Crew actions resolve together", "Enemy response", "Turn outcome"][stage]
        : view.speed === "manual"
          ? "Manual test · Next phase resolves"
          : view.intermissionPending
            ? "A Trial is starting"
            : view.crewInputs.length === 1
              ? "Choose your move"
              : view.decisionReady
                ? `Waiting for ${waiting.map((p) => p.name).join(", ") || "the crew"}`
                : "Choose your move · all ready starts the turn",
  );
</script>
<section class="turn-flow" aria-label="Turn progress">
  <div class="turn-heading">
    <strong>Turn {view.turn}</strong>
    <span class="turn-stage"
      >{view.status === "paused"
        ? "Paused"
        : view.decisionReady && stage === 0
          ? "Waiting for crew"
          : ["Choose", "Crew acts", "Enemy acts", "Outcome"][stage]}</span
    >
    <span class="turn-status">{description}</span>
    {#if view.phase.kind === "combat" && view.crewInputs.length > 1}
      <span class="turn-ready"
        ><GameIcon name="ready" size={14} />{ready}/{view.crewInputs.length}</span
      >
    {/if}
    {#if view.deadline !== null || view.status === "paused" || view.speed === "manual"}
      <RoundTimer {view} compact />
    {:else}
      <small class="turn-clock">At your pace</small>
    {/if}
  </div>
  <ol class="turn-steps">
    {#each ["Choose", "Crew", "Enemy", "Outcome"] as label, index}
      <li
        class:current={stage === index}
        class:complete={stage > index}
        aria-current={stage === index ? "step" : undefined}
      >
        <span>{index + 1}</span>{label}
      </li>
    {/each}
  </ol>
</section>
