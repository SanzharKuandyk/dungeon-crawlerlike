<script lang="ts">
  import type { BlessingKind } from "../../shared/condition-types.js";
  import { blessingDescription } from "../../shared/trait-descriptions.js";
  import type { WagerLevel } from "../../shared/trial-types.js";
  import type { RoomView } from "../../shared/view-types.js";
  import type { PlayerController } from "../player-controller.js";
  import GameIcon from "./GameIcon.svelte";
  import RoundTimer from "./RoundTimer.svelte";
  import Button from "./ui/Button.svelte";
  import InspectPopover from "./ui/InspectPopover.svelte";

  let {
    view,
    controller = null,
    locked = true,
  }: { view: RoomView; controller?: PlayerController | null; locked?: boolean } = $props();
  let trial = $derived(view.trial),
    player = $derived(view.role === "player" ? view : null);
  let replace = $state<BlessingKind | null>(null);
</script>
{#if trial}
  <section class="trial-panel" aria-label="Trial of Wagers">
    <header class="section-heading">
      <strong>Trial {trial.chapter} · {trial.questionNumber}/3</strong><RoundTimer {view} />
    </header>
    <p class="trial-context">{trial.cause}{trial.fixture ? " · DEVELOPMENT FIXTURES" : ""}</p>
    {#if trial.phase.kind === "intro"}
      <h2>Trial of Wagers</h2>
      <p>One vote per crew. Choose your own stakes.</p>
    {:else if trial.phase.kind === "board-vote"}
      <h3>Choose a question</h3>
      <div class="trial-board">
        {#each [...new Set(trial.tiles.map((tile) => tile.category))] as category}
          <span class="trial-category-label">{category}</span>
          {#each trial.tiles.filter((tile) => tile.category === category) as tile}
            <Button
              type="button"
              disabled={locked || trial.usedValues.includes(tile.value)}
              onclick={() => void controller?.trialVote(trial?.id, tile.id)}
              class={`${player?.trialInput.vote === tile.id ? "chosen" : ""}`}
            >
              <strong>{tile.value}</strong>
            </Button>
          {/each}
        {/each}
      </div>
    {:else if trial.phase.kind === "wager"}
      <h3>{trial.selectedTile?.category} · {trial.selectedTile?.value}</h3>
      <p>Choose your stake</p>
      <div class="wager-choices">
        {#each ["steady", "bold", "oath"] as wager}
          <div class="wager-card">
            <Button
              type="button"
              disabled={locked || !!player?.trialInput.wager}
              onclick={() => void controller?.wager(trial?.id, wager as WagerLevel)}
              class={`${player?.trialInput.wager === wager ? "chosen" : ""}`}
            >
              <GameIcon
                name={wager === "steady" ? "shield" : wager === "bold" ? "fire" : "curse"}
                size={28}
              />
              <span>{wager}</span
              ><strong>{wager === "steady" ? "1×" : wager === "bold" ? "2×" : "3×"}</strong>
            </Button>
            <InspectPopover label={`${wager} consequence`}>
              {#snippet trigger()}
                <GameIcon name={wager === "oath" ? "curse" : "stress"} size={16} />
                <span>{wager === "oath" ? trial?.oath : wager === "bold" ? "+3" : "+1"}</span>
              {/snippet}
              <p>
                Correct: {wager === "steady" ? "1×" : wager === "bold" ? "2×" : "3×"} question
                value.
              </p>
              <p>
                Incorrect or missing:
                {wager === "oath"
                  ? `gain ${trial.oath}`
                  : `gain ${wager === "bold" ? 3 : 1} stress`}.
              </p>
            </InspectPopover>
          </div>
        {/each}
      </div>
      <small>The question opens after stakes lock.</small>
    {:else if trial.phase.kind === "answer" || trial.phase.kind === "reveal"}
      {#if trial.question}
        <small
          >{trial.question.category}
          · {trial.question.value} · {player?.trialInput.wager ?? "steady"}</small
        >
        <h3>{trial.question.prompt}</h3>
        {#if trial.question.code}
          <pre><code>{trial.question.code}</code></pre>
        {/if}
        <div
          class="trial-options"
          class:locked-options={trial.phase.kind === "reveal" || player?.trialInput.answer !== null}
        >
          {#each trial.question.choices as choice, index}
            <Button
              type="button"
              disabled={locked ||
                trial.phase.kind !== "answer" ||
                player?.trialInput.answer !== null}
              onclick={() => {
                if (trial?.question)
                  void controller?.trialAnswer(trial.id, trial.question.id, index);
              }}
              class={`${trial.correctIndex === index ? "correct" : ""} ${player?.trialInput.answer === index ? "own-answer" : ""}`}
            >
              <strong>{String.fromCharCode(65 + index)}</strong>{choice}{trial.correctIndex ===
              index
                ? " ✓"
                : ""}{player?.trialInput.answer === index ? " · yours" : ""}
            </Button>
          {/each}
        </div>
        {#if trial.phase.kind === "answer" && player?.trialInput.answer !== null}
          <small role="status">Answer locked</small>
        {/if}
        {#if trial.phase.kind === "reveal"}
          <p>{trial.explanation}</p>
          <details>
            <summary>Why the other answers differ</summary>
            {#each trial.distractors as explanation, index}
              <p><strong>{String.fromCharCode(65 + index)}</strong> · {explanation}</p>
            {/each}
          </details>
          <small>{trial.question.reference.file} · {trial.question.reference.slide}</small>
          {#each trial.accuracy as row}
            <p>
              {view.crews.find((c) => c.id === row.crewId)?.symbol}
              · {row.correct}/{row.total}
              correct · {(trial.totals[row.crewId] ?? 0) / 12} points
            </p>
          {/each}
          {#if player}
            <details>
              <summary>Your crew’s answers</summary>
              {#each player.trialInput.crewResults as result}
                <p>
                  {view.players.find((p) => p.id === result.playerId)?.name}
                  · {result.choice === null ? "missing" : String.fromCharCode(65 + result.choice)} ·
                  {result.consequence}
                </p>
              {/each}
            </details>
          {/if}
        {/if}
      {/if}
    {:else if trial.phase.kind === "blessing-choice"}
      <h3>Trial results</h3>
      <div class="trial-results">
        {#each view.crews as crew}
          <p>
            <strong>{crew.symbol} · {crew.name}</strong>
            ·
            {((trial.totals[crew.id] ?? 0) / 12).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
            points
          </p>
        {/each}
      </div>
      <h3>Choose a Blessing</h3>
      {#if player?.trialInput.offers.length}
        {#if player.hero && player.hero.conditions.blessings.length >= 2}
          <label for="replace-blessing">Replace</label
          ><select id="replace-blessing" bind:value={replace}>
            <option value={null}>Choose a trait</option>
            {#each player.hero.conditions.blessings as blessing}
              <option value={blessing.kind}>{blessing.kind}</option>
            {/each}
          </select>
        {/if}
        <div class="trait-slots">
          {#each player.trialInput.offers as offer}
            <div class="trait-offer">
              <InspectPopover label={offer.kind.replaceAll("-", " ")}>
                {#snippet trigger()}
                  <GameIcon name={offer.kind} size={28} />
                  <span>{offer.kind.replaceAll("-", " ")}</span
                  ><small>{"I".repeat(offer.rank)}</small>
                {/snippet}
                <p>{blessingDescription(offer.kind, offer.rank, player?.hero?.power ?? 12)}</p>
              </InspectPopover>
              <Button
                type="button"
                disabled={locked || !!player?.trialInput.choice}
                onclick={() => void controller?.blessing(trial?.id, offer.id, replace)}
              >
                Choose
              </Button>
            </div>
          {/each}
          <Button
            type="button"
            disabled={locked || !!player?.trialInput.choice}
            onclick={() => void controller?.blessing(trial?.id, "decline")}
          >
            Keep current build
          </Button>
        </div>
      {:else}
        <p>
          {player
            ? "No correct answers this trial. Your expedition continues."
            : "Characters are choosing their Blessings."}
        </p>
      {/if}
    {:else}
      <h3>The expedition continues</h3>
    {/if}
  </section>
{/if}
