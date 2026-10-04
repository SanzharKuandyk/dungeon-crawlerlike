<script lang="ts">
  import type { HostRoomView } from "../../shared/view-types.js";
  import type { HostController } from "../host-controller.js";
  import Button from "./ui/Button.svelte";

  let {
    view,
    crewId,
    controller,
    onrecover,
  }: {
    view: HostRoomView;
    crewId: string;
    controller: HostController;
    onrecover: (id: string) => void;
  } = $props();
  let run = $derived(view.crewRuns.find((r) => r.crewId === crewId));
  let duel = $derived(view.duels.find((d) => d.status === "active" && d.crewIds.includes(crewId)));
  let capability = $derived(view.moderation.crews.find((c) => c.crewId === crewId));
  let ordinary = $derived(
    !!run &&
      !view.quizActive &&
      !duel &&
      ["route", "combat", "camp", "equipment"].includes(run.phase.kind),
  );
  let paused = $derived(run?.pauseReasons.includes("host") ?? false);
  function crew(kind: "crew-pause" | "crew-resume" | "crew-extend" | "crew-resolve") {
    if (!run) return;
    if (
      kind === "crew-resolve" &&
      !confirm("Resolve this crew now? Accepted choices stay; missing choices use defaults.")
    )
      return;
    if (
      duel &&
      kind === "crew-pause" &&
      !confirm(
        `Pause both ${duel.crewIds.map((id) => view.crews.find((c) => c.id === id)?.name).join(" and ")}?`,
      )
    )
      return;
    void controller.command({ kind, crewId, expectedCrewPhaseId: run.phaseId });
  }
</script>
<details class="crew-host-menu">
  <summary aria-label={`Controls for ${view.crews.find((c) => c.id === crewId)?.name}`}>
    ···
  </summary>
  <section>
    {#if run && !run.finished}
      <Button
        type="button"
        disabled={view.readOnly}
        onclick={() => crew(paused ? "crew-resume" : "crew-pause")}
      >
        {paused ? "Resume crew" : "Pause crew"}
      </Button>
      <Button
        type="button"
        disabled={view.readOnly || !ordinary || !capability || capability.extendReason !== null}
        title={capability?.extendReason ?? "Add 30 seconds"}
        onclick={() => crew("crew-extend")}
      >
        Add 30 seconds
      </Button>
      <Button
        type="button"
        disabled={view.readOnly || !ordinary || !capability || capability.resolveReason !== null}
        title={capability?.resolveReason ?? "Use missing-choice defaults"}
        onclick={() => crew("crew-resolve")}
      >
        Resolve missing choices
      </Button>
      {#if capability?.extendReason}
        <small>{capability.extendReason}</small>
      {/if}
      {#if capability?.resolveReason && capability.resolveReason !== capability.extendReason}
        <small>{capability.resolveReason}</small>
      {/if}
    {/if}
    {#if duel}
      <Button
        type="button"
        disabled={view.readOnly || (duel.turn === 3 && duel.phase === "reveal")}
        onclick={() => {
          if (confirm("Cancel the duel? Stakes return; damage already taken remains."))
            void controller.command({
              kind: "duel-cancel",
              duelId: duel.id,
              expectedTurn: duel.turn,
              expectedDuelPhase: duel.phase,
            });
        }}
      >
        Cancel duel
      </Button>
    {/if}
    {#each view.players.filter((p) => p.crewId === crewId) as player}
      <Button
        type="button"
        disabled={view.readOnly || view.closed}
        onclick={() => onrecover(player.id)}
      >
        Reconnect {player.name} on another device
      </Button>
    {/each}
  </section>
</details>
