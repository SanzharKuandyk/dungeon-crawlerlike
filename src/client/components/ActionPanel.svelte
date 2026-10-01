<script lang="ts">
  import { actionKey } from "../../game/action-options.js";
  import type { HeroAction } from "../../shared/command-types.js";
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import { actionLabel } from "../action-labels.js";
  import type { PlayerController } from "../player-controller.js";
  import TargetPicker from "./TargetPicker.svelte";
  import WithdrawalVote from "./WithdrawalVote.svelte";

  let {
    view,
    controller,
    locked,
  }: { view: PlayerRoomView; controller: PlayerController; locked: boolean } = $props();
  let mode = $state<HeroAction["kind"]>("attack"),
    target = $state(""),
    phase = $state(-1);
  let skill = $derived(
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
  let options = $derived(view.legalActions.filter((a) => a.kind === mode));
  let selected = $derived(options.find((a) => actionKey(a) === target) ?? options[0] ?? null);
  $effect(() => {
    if (phase !== view.phaseId) {
      phase = view.phaseId;
      mode = "attack";
      target = "";
    }
  });
</script>
<section class="decision-card">
  <h2>Your action</h2>
  <div class="action-tabs">
    {#each ["attack", "brace", "loot", skill] as kind}
      <button
        type="button"
        class:chosen={mode === kind}
        disabled={locked || !view.legalActions.some((a) => a.kind === kind)}
        onclick={() => {
          mode = kind as HeroAction["kind"];
          target = "";
        }}
      >
        {kind[0].toUpperCase() + kind.slice(1)}
      </button>
    {/each}
  </div>
  <TargetPicker {options} {view} {selected} {locked} onselect={(key) => (target = key)} />
  <p class="action-effect">{selected ? actionLabel(selected, view) : "No valid targets."}</p>
  {#if mode === "loot" || mode === "pilfer"}
    <small>Claims compete with other crews. You collect only if you survive.</small>
  {/if}
  <button
    type="button"
    class="primary"
    disabled={locked || !selected}
    onclick={() => selected && void controller.action(selected)}
  >
    Confirm · {actionLabel(selected, view)}
  </button>
  <div class="confirmed">
    <span>Server-confirmed action</span><strong>{actionLabel(view.selectedAction, view)}</strong>
  </div>
  <ul class="vote-list">
    {#each view.crewInputs as member}
      <li><span>{member.name}</span><strong>{actionLabel(member.action, view)}</strong></li>
    {/each}
  </ul>
  <WithdrawalVote {view} {controller} {locked} />
</section>
