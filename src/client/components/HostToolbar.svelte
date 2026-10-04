<script lang="ts">
  import type { HostRoomView } from "../../shared/view-types.js";
  import type { HostController } from "../host-controller.js";
  import Button from "./ui/Button.svelte";

  let {
    view,
    controller,
    locked,
  }: { view: HostRoomView; controller: HostController; locked: boolean } = $props();
</script>
{#if view.status === "lobby"}
  <Button
    type="button"
    class="primary"
    disabled={locked || !view.crews.length || view.players.some((p) => !p.crewId)}
    onclick={() => void controller.command({ kind: "start" })}
  >
    Start expedition
  </Button>
{:else if view.status !== "finished"}
  <Button
    type="button"
    disabled={locked}
    onclick={() => void controller.command({ kind: view.status === "paused" ? "resume" : "pause" })}
    class={`${view.status === "paused" ? "primary" : ""}`}
  >
    {view.status === "paused" ? "Resume" : "Pause"}
  </Button>
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
        >Decision timers</label
      >
      <label
        ><input
          type="checkbox"
          checked={view.learningEnabled}
          disabled={locked || (!view.trialContentReady && !view.testMode)}
          onchange={(e) =>
            void controller.command({ kind: "learning", enabled: e.currentTarget.checked })}
        >Trials of Wagers</label
      >
    {/if}
    {#if view.status === "lobby" && !view.trialContentReady}
      <small>Trials need a reviewed course pack. Fixtures are available in developer mode.</small>
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
      <Button
        type="button"
        disabled={locked || !view.trial}
        onclick={() => {
          const id = view.trial?.id;
          if (
            id &&
            confirm(
              "End this trial? Completed answers and rewards stay; unresolved questions award nothing.",
            )
          )
            void controller.command({ kind: "question-skip", questionId: id });
        }}
      >
        End current trial
      </Button>
    {/if}
    {#if view.status === "running" || view.status === "paused"}
      <Button
        type="button"
        disabled={locked}
        onclick={() => {
          if (
            confirm(
              "End this expedition? Rank crews by bosses, completed progress, then trial points.",
            )
          )
            void controller.command({ kind: "end" });
        }}
      >
        End expedition
      </Button>
    {/if}
  </section>
</details>
