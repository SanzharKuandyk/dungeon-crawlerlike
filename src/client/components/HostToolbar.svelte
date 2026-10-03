<script lang="ts">
  import type { HostRoomView } from "../../shared/view-types.js";
  import type { HostController } from "../host-controller.js";

  let {
    view,
    controller,
    locked,
  }: { view: HostRoomView; controller: HostController; locked: boolean } = $props();
</script>
{#if view.status === "lobby"}
  <button
    type="button"
    class="primary"
    disabled={locked || !view.crews.length || view.players.some((p) => !p.crewId)}
    onclick={() => void controller.command({ kind: "start" })}
  >
    Start expedition
  </button>
{:else if view.status !== "finished"}
  <button
    type="button"
    class:primary={view.status === "paused"}
    disabled={locked}
    onclick={() => void controller.command({ kind: view.status === "paused" ? "resume" : "pause" })}
  >
    {view.status === "paused" ? "Resume" : "Pause"}
  </button>
{/if}
<details class="host-options">
  <summary aria-label="Host options">More ···</summary>
  <section>
    {#if view.status === "lobby"}
      <label
        ><input
          type="checkbox"
          checked={view.inactivityFallback}
          disabled={locked}
          onchange={(e) =>
            void controller.command({ kind: "fallback", enabled: e.currentTarget.checked })}
        >60s fallback</label
      >
      <label
        ><input
          type="checkbox"
          checked={view.learningEnabled}
          disabled={locked}
          onchange={(e) =>
            void controller.command({ kind: "learning", enabled: e.currentTarget.checked })}
        >Inscriptions</label
      >
    {/if}
    <label
      ><input
        type="checkbox"
        checked={view.pvpEnabled}
        disabled={locked || view.status === "finished"}
        onchange={(e) =>
          void controller.command({ kind: "pvp-policy", enabled: e.currentTarget.checked })}
      >New crew challenges</label
    >
    {#if view.quizActive}
      <button
        type="button"
        disabled={locked || !["question-intro", "question"].includes(view.phase.kind)}
        title="Only before answers lock"
        onclick={() => {
          if (view.question?.id || view.phase.kind === "question-intro") {
            const id =
              view.phase.kind === "question-intro" ? view.phase.questionId : view.question?.id;
            if (id && confirm("Skip this inscription? No costs or rewards will apply."))
              void controller.command({ kind: "question-skip", questionId: id });
          }
        }}
      >
        Skip inscription
      </button>
    {/if}
    {#if view.status === "running" || view.status === "paused"}
      <button
        type="button"
        disabled={locked}
        onclick={() => {
          if (confirm("End this expedition? Only secured treasure scores."))
            void controller.command({ kind: "end" });
        }}
      >
        End expedition
      </button>
    {/if}
  </section>
</details>
