<script lang="ts">
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import type { PlayerController } from "../player-controller.js";
  import GameIcon from "./GameIcon.svelte";
  import LastTurn from "./LastTurn.svelte";
  import RewardsDialog from "./RewardsDialog.svelte";
  import Button from "./ui/Button.svelte";
  import DecisionFooter from "./ui/DecisionFooter.svelte";
  import ReadyStatus from "./ui/ReadyStatus.svelte";
  import TransactionFeedback from "./ui/TransactionFeedback.svelte";

  let {
    view,
    controller,
    locked,
  }: { view: PlayerRoomView; controller: PlayerController; locked: boolean } = $props();
  const labels = {
    victory: "Victory",
    escaped: "Escaped",
    defeated: "Defeated",
    cache: "Cache opened",
    rested: "Rested",
    recovered: "Rescued",
    departed: "Ready to depart",
  };
  let rewardsOpen = $state(false);
  let presentedResult = $state<string | null>(null);
  let result = $derived(view.result);
  let change = $derived(result?.heroChanges.find((c) => c.heroId === view.hero?.id));
  let unclaimed = $derived(view.rewards.length > 0);
  $effect(() => {
    if (result?.id && presentedResult !== result.id) {
      presentedResult = result.id;
      rewardsOpen = unclaimed;
    }
  });
</script>
<RewardsDialog bind:open={rewardsOpen} {view} {controller} {locked} postFight />
<section class="result-decision decision-layout">
  <div class="decision-body">
    {#if result}
      <header class="result-heading">
        <GameIcon
          name={result.outcome === "victory"
            ? "ready"
            : result.outcome === "cache"
              ? "treasure"
              : "rest"}
          size={48}
        />
        <div>
          <h2>{labels[result.outcome]}</h2>
          <small>{result.title}</small>
        </div>
      </header>
      <div class="result-stats">
        <span><GameIcon name="gold" />+{result.goldEarned}</span>
        {#if result.debtPaid}
          <small>{result.debtPaid} paid toward rescue debt</small>
        {/if}
      </div>
      {#each view.exploration?.outcomes.filter((o) => o.heroId === view.hero?.id) ?? [] as outcome}
        <div class="exploration-outcome" role="status">
          <GameIcon
            name={outcome.landing ? "gold" : outcome.success === false ? "stress" : "ready"}
          />
          <div>
            {#if outcome.landing}
              <strong>{outcome.landing === "heads" ? "Heads" : "Tails"}</strong>
            {/if}
            <p>{outcome.message}</p>
          </div>
        </div>
      {/each}
      {#if change}
        <div class="result-changes">
          <span><GameIcon name="heart" size={16} />{change.hpBefore} → {change.hpAfter}</span
          ><span
            ><GameIcon name="stress" size={16} />{change.stressBefore}
            → {change.stressAfter}</span
          >
        </div>
        {#each change.conditions as condition}
          <small>{condition}</small>
        {/each}
      {/if}
      {#if !result.rewardIds.length}
        <small>No equipment drop</small>
      {/if}
      <TransactionFeedback feedback={view.transaction} operation="reward" />
      <LastTurn summary={view.lastTurn} />
    {:else}
      <h2>Encounter complete</h2>
    {/if}
  </div>
  <DecisionFooter
    hint={view.speed === "manual"
      ? "Manual test · Next phase advances"
      : unclaimed
        ? "Choose your reward: equip, store in Bag, or leave it"
        : "All ready continues the expedition"}
  >
    <ReadyStatus
      ready={view.crewInputs.filter((p) => p.ready).length}
      total={view.crewInputs.length}
      confirmed={view.decisionReady}
    />
    {#if unclaimed}
      <Button primary onclick={() => (rewardsOpen = true)}
        ><GameIcon name="treasure" />Choose reward</Button
      >
    {:else if view.decisionReady}
      <Button disabled={locked} onclick={() => void controller.edit()}>Change</Button>
    {:else}
      <Button
        primary
        pending={locked && controller.pending > 0}
        disabled={locked || unclaimed}
        onclick={() => void controller.resultReady()}
        >Ready to travel</Button
      >
    {/if}
  </DecisionFooter>
</section>
