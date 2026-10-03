<script lang="ts">
  import { ANSWER_COLORS } from "../../shared/palette.js";
  import type { RoomView } from "../../shared/view-types.js";
  import type { PlayerController } from "../player-controller.js";
  import { preferences } from "../room.svelte.js";
  import EquipmentPicker from "./EquipmentPicker.svelte";
  import SealArt from "./SealArt.svelte";

  let {
    view,
    controller = null,
    locked = true,
  }: { view: RoomView; controller?: PlayerController | null; locked?: boolean } = $props();
  let player = $derived(view.role === "player" ? view : null);
  let eligible = $derived(player?.hero?.status === "alive" && player.inscriptionReward !== null);
  let pact = $state<"careful" | "blood">("careful");
  let selected = $state<number | null>(null);
  let currentQuestion = "";
  $effect(() => {
    if (currentQuestion !== view.question?.id) {
      currentQuestion = view.question?.id ?? "";
      selected = null;
      pact = "careful";
    }
  });
  async function answer(index: number) {
    if (!controller || !view.question) return;
    selected = index;
    if (!(await controller.answer(view.question.id, index, pact))) selected = null;
  }
</script>
<section
  class="quiz-card"
  class:reduced={preferences.reducedMotion}
  class:seal-return={view.phase.kind === "return"}
  class:answering={view.phase.kind === "question"}
>
  <div class="inscription-heading">
    <SealArt
      opening={view.phase.kind === "question-intro"}
      resolved={view.phase.kind === "return"}
    />
    <p class="eyebrow">Ancient inscription</p>
    <p class="trigger">{view.quizCause}</p>
  </div>
  {#if view.phase.kind === "question-intro"}
    <h2>The seal is opening…</h2>
  {:else if view.phase.kind === "return"}
    <h2>Equipment ready</h2>
  {:else if view.question}
    <h2>{view.question.prompt}</h2>
    {#if player && view.phase.kind === "question"}
      <fieldset
        class="pact-options"
        disabled={locked || player.answerChoice !== null || selected !== null}
      >
        <legend>Your pact</legend>
        <button type="button" class:chosen={pact === "careful"} onclick={() => (pact = "careful")}>
          Study · correct earns 1 charge
        </button>
        <button
          type="button"
          class:chosen={pact === "blood"}
          disabled={player.hero?.status !== "alive" || player.hero.hp <= player.hero.power}
          onclick={() => (pact = "blood")}
        >
          Blood · pay {player.hero?.power ?? 0} HP · 1 charge, 2 if correct
        </button>
      </fieldset>
    {/if}
    {#if view.phase.kind === "question"}
      <div class="answers">
        {#each view.question.choices as choice, i}
          <button
            type="button"
            class:chosen={(player?.answerChoice ?? selected) === i}
            style:--answer-color={ANSWER_COLORS[i]}
            style:--answer-delay={`${i * 65}ms`}
            disabled={!player ||
              !controller ||
              locked ||
              player.answerChoice !== null ||
              selected !== null}
            onclick={() => void answer(i)}
          >
            <span>{["A", "B", "C", "D"][i]}</span>{choice}
          </button>
        {/each}
      </div>
      {#if player?.answerChoice !== null && player}
        <p class="answer-status">Answer received.</p>
      {/if}
    {:else}
      <p class="correct-answer">Correct: {view.question.choices[view.correctChoice ?? 0]}</p>
      <p>{view.explanation}</p>
      {#if player?.answerPact === "blood"}
        <p>
          Blood pact: paid {player.hero?.power} HP. {player.inscriptionReward} equipment charges
          earned.
        </p>
      {/if}
      <small>{view.question.topic} · {view.question.source}</small>
      <div class="quiz-results">
        {#each view.quizResults.filter((r) =>
          player ? r.crewId === player.self.crewId : false,
        ) as result}
          <p>
            <strong>{view.crews.find((c) => c.id === result.crewId)?.name}</strong>
            {result.correct}/{result.total}
            crew answers correct
          </p>
        {/each}
      </div>
      {#if view.phase.kind === "equipment" && player && controller && eligible}
        <h3>
          Your equipment · {player.inscriptionReward} charge{player.inscriptionReward === 2
            ? "s"
            : ""}
        </h3>
        <EquipmentPicker view={player} {controller} {locked} />
      {/if}
    {/if}
  {/if}
</section>
