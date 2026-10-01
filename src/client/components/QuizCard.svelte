<script lang="ts">
  import type { RoomView } from "../../shared/view-types.js";
  import type { PlayerController } from "../player-controller.js";
  import EquipmentPicker from "./EquipmentPicker.svelte";

  let {
    view,
    controller = null,
    locked = true,
  }: { view: RoomView; controller?: PlayerController | null; locked?: boolean } = $props();
  let player = $derived(view.role === "player" ? view : null);
  let eligible = $derived(
    player?.hero?.status === "alive" &&
      view.quizResults.some((r) => r.crewId === player?.self.crewId && r.tier !== "none"),
  );
</script>
<section class="quiz-card">
  <p class="eyebrow">Ancient inscription</p>
  <p class="trigger">{view.quizCause}</p>
  {#if view.phase.kind === "question-intro"}
    <h2>The seal is opening…</h2>
  {:else if view.phase.kind === "return"}
    <h2>Equipment ready</h2>
  {:else if view.question}
    <h2>{view.question.prompt}</h2>
    {#if view.phase.kind === "question"}
      <div class="answers">
        {#each view.question.choices as choice, i}
          <button
            type="button"
            class:chosen={player?.answerChoice === i}
            disabled={!player || !controller || locked || player.answerChoice !== null}
            onclick={() => controller && void controller.answer(view.question?.id ?? "", i)}
          >
            <span>{["A", "B", "C", "D"][i]}</span>{choice}
          </button>
        {/each}
      </div>
      {#if player?.answerChoice !== null && player}
        <p>Answer received.</p>
      {/if}
    {:else}
      <p class="correct-answer">Correct: {view.question.choices[view.correctChoice ?? 0]}</p>
      <p>{view.explanation}</p>
      <small>{view.question.topic} · {view.question.source}</small>
      <div class="quiz-results">
        {#each view.quizResults.filter((r) =>
          player ? r.crewId === player.self.crewId : false,
        ) as result}
          <p>
            <strong>{view.crews.find((c) => c.id === result.crewId)?.name}</strong>
            {result.correct}/{result.total}
            correct ·
            {result.tier === "perfect"
              ? "2 charges"
              : result.tier === "partial"
                ? "1 charge"
                : "No equipment"}
          </p>
        {/each}
      </div>
      {#if view.phase.kind === "equipment" && player && controller && eligible}
        <h3>Your equipment</h3>
        <EquipmentPicker view={player} {controller} {locked} />
      {/if}
    {/if}
  {/if}
</section>
