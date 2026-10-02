<script lang="ts">
  import { onMount } from "svelte";
  import { teamColor } from "../../shared/palette.js";
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import ActionPanel from "../components/ActionPanel.svelte";
  import CampPicker from "../components/CampPicker.svelte";
  import CrewStage from "../components/CrewStage.svelte";
  import DungeonProgress from "../components/DungeonProgress.svelte";
  import EnemyIntent from "../components/EnemyIntent.svelte";
  import HeroCard from "../components/HeroCard.svelte";
  import QuizCard from "../components/QuizCard.svelte";
  import RoundTimer from "../components/RoundTimer.svelte";
  import RoutePicker from "../components/RoutePicker.svelte";
  import SpiritPanel from "../components/SpiritPanel.svelte";
  import { phaseInstruction, presentation } from "../event-presenter.js";
  import type { PlayerController } from "../player-controller.js";
  import ResultsScreen from "./ResultsScreen.svelte";

  let {
    view,
    controller,
    connected = true,
    pending = 0,
  }: {
    view: PlayerRoomView;
    controller: PlayerController;
    connected?: boolean;
    pending?: number;
  } = $props();
  let now = $state(Date.now());
  let received = $state(Date.now());
  $effect(() => {
    view.revision;
    received = Date.now();
  });
  onMount(() => {
    const timer = setInterval(() => (now = Date.now()), 100);
    return () => clearInterval(timer);
  });
  let current = $derived(presentation(view, now + view.serverNow - received));
  let hero = $derived(current.arena.heroes.find((h) => h.playerId === view.self.id) ?? view.hero),
    crew = $derived(current.arena.crews.find((c) => c.id === view.self.crewId));
  let encounter = $derived(
    current.arena.encounters.find(
      (e) => crew?.location.kind === "room" && e.id === crew.location.roomId,
    ),
  );
  let locked = $derived(
    !connected || pending > 0 || !controller.ready || view.readOnly || view.status !== "running",
  );
  let quiz = $derived(
    ["question-intro", "question", "explanation", "equipment", "return"].includes(view.phase.kind),
  );
</script>
<div
  class="phone-panel"
  data-phase={view.phase.kind}
  data-depth={view.depth}
  style:--team={teamColor(crew?.colorId ?? "blue").hex}
>
  <div class="player-heading">
    <span class="team-badge">{crew?.symbol}</span><strong>{crew?.name} · YOU</strong>
    <RoundTimer {view} />
  </div>
  {#if hero}
    <HeroCard {hero} name={view.self.name} crewName={crew?.name ?? ""} selected />
  {/if}
  <div class="treasure-strip">
    <span>{crew?.carriedTreasure ?? 0} carried</span
    ><strong>{crew?.securedTreasure ?? 0} secured</strong>
  </div>
  <p class="phase-instruction">Turn {view.turn}/4 · {phaseInstruction(view)}</p>
  <DungeonProgress depth={view.depth} finished={view.status === "finished"} />
  {#if view.readOnly}
    <p class="banner">A newer tab controls this character.</p>
  {/if}
  {#if crew && !quiz && view.status !== "finished"}
    <CrewStage {view} arena={current.arena} {crew} actor={current.actor} />
  {/if}
  {#if view.status === "finished"}
    <ResultsScreen {view} />
  {:else if quiz}
    <QuizCard {view} {controller} {locked} />
  {:else if view.status === "paused"}
    <section class="decision-card"><h2>Expedition paused</h2></section>
  {:else if view.phase.kind === "route" && hero?.status === "alive"}
    <RoutePicker {view} {controller} {locked} />
  {:else if view.phase.kind === "camp" && hero?.status === "alive"}
    <CampPicker {view} {controller} {locked} />
  {:else if view.phase.kind === "combat"}
    {#if encounter?.status === "active" && hero?.status === "alive"}
      {#if encounter.rivalry}
        <section class="enemy-intent rivalry-intent">
          <strong>Lethal rivalry</strong>
          <p>Target a rival hero. Both crews act together; fallen heroes become spirits.</p>
        </section>
      {:else}
        <EnemyIntent {encounter} {hero} depth={view.depth} turn={view.turn} />
      {/if}
      <ActionPanel {view} {controller} {locked} />
    {:else}
      <SpiritPanel {view} {controller} {locked} />
    {/if}
  {:else}
    <section class="decision-card">
      <h2>{hero?.status === "dead" ? "Your spirit remains" : phaseInstruction(view)}</h2>
      <p aria-live="polite">{current.message}</p>
    </section>
  {/if}
  {#if encounter}
    <small class="participation"
      >Victory purse contribution: {encounter.contribution[crew?.id ?? ""] ?? 0}/{encounter
        .enteringPower[crew?.id ?? ""] ?? 0}</small
    >
  {/if}
</div>
