<script lang="ts">
  import type { ExplorationChoice } from "../../shared/exploration-types.js";
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import type { PlayerController } from "../player-controller.js";
  import GameIcon from "./GameIcon.svelte";
  import Button from "./ui/Button.svelte";
  import DecisionFooter from "./ui/DecisionFooter.svelte";

  let {
    view,
    controller,
    locked,
  }: { view: PlayerRoomView; controller: PlayerController; locked: boolean } = $props();
  let selected = $state<ExplorationChoice>({ kind: "leave" }),
    side = $state<"heads" | "tails">("heads"),
    prize = $state<"gold" | "blessing">("gold");
  let hero = $derived(view.hero),
    event = $derived(view.exploration);
  let node = $derived(view.expeditionMap?.nodes.find((n) => n.id === event?.nodeId));
  let accepted = $derived(event?.choices[view.self.id]);
  let coin = $derived(node?.eventId === "coin-fountain");
  let disabled = $derived(locked || !!accepted);
</script>
<section class="decision-layout exploration-panel">
  <div class="decision-body">
    <h2><GameIcon name="dice" />{node?.room.name}</h2>
    {#if coin && hero}
      <p>Stake {hero.power} gold · fair 50/50 · lose: +1 stress.</p>
      <div class="action-tabs">
        {#each ["heads", "tails"] as value}
          <Button
            aria-pressed={side === value}
            {disabled}
            onclick={() => {
              side = value as "heads" | "tails";
              selected = { kind: "coin", side, prize };
            }}
            >{value}</Button
          >
        {/each}
      </div>
      <div class="action-tabs">
        {#each ["gold", "blessing"] as value}
          <Button
            aria-pressed={prize === value}
            {disabled}
            onclick={() => {
              prize = value as "gold" | "blessing";
              selected = { kind: "coin", side, prize };
            }}
            >{value === "gold" ? `Win ${2 * hero.power} gold` : "Rank-I Blessing"}</Button
          >
        {/each}
      </div>
      <Button
        disabled={disabled || (event?.allowances[hero.id] ?? 0) < hero.power}
        onclick={() => (selected = { kind: "coin", side, prize })}
        >Toss {side} · {hero.power} stake</Button
      >
    {:else if hero?.status === "alive"}
      {#if node?.eventId === "trapped-cache"}
        <p>{hero.stress >= 7 ? 65 : 75}%: +{2 * hero.power} gold. Failure: arm injury.</p>
        <Button {disabled} onclick={() => (selected = { kind: "risk" })}>Open trapped cache</Button>
      {:else if node?.eventId === "sacrificial-altar"}
        <p>Pay {hero.power} health · guaranteed personal equipment choice.</p>
        <Button
          disabled={disabled || hero.hp <= hero.power}
          onclick={() => (selected = { kind: "sacrifice" })}
          >Offer health</Button
        >
      {:else}
        <Button {disabled} onclick={() => (selected = { kind: "recover-health" })}
          ><GameIcon name="heart" />Restore {Math.min(2 * hero.power, hero.maxHp - hero.hp)}</Button
        ><Button {disabled} onclick={() => (selected = { kind: "recover-stress" })}
          ><GameIcon name="stress" />Remove {Math.min(3, hero.stress)}</Button
        >
      {/if}
    {/if}
    <Button
      {disabled}
      aria-pressed={selected.kind === "leave"}
      onclick={() => (selected = { kind: "leave" })}
      >Leave safely</Button
    >
    <p>
      {accepted
        ? "Committed · waiting for crew"
        : `Selected: ${selected.kind === "coin" ? `${selected.side} / ${selected.prize}` : selected.kind.replaceAll("-", " ")}`}
    </p>
  </div>
  <DecisionFooter hint="One personal choice · committed risks cannot be undone">
    <Button primary {disabled} onclick={() => void controller.event(selected)}
      >Commit choice</Button
    >
  </DecisionFooter>
</section>
