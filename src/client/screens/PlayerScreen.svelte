<script lang="ts">
  import { onMount } from "svelte";
  import { teamColor } from "../../shared/palette.js";
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import ActionPanel from "../components/ActionPanel.svelte";
  import CampPicker from "../components/CampPicker.svelte";
  import EquipmentSlot from "../components/EquipmentSlot.svelte";
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
  let rotationDismissed = $state(sessionStorage.getItem("siege-rotation-hint") === "dismissed");
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
  let interactiveCombat = $derived(
    view.status === "running" &&
      view.phase.kind === "combat" &&
      encounter?.status === "active" &&
      hero?.status === "alive",
  );
  let campChoice = $derived(view.phase.kind === "camp" && view.canCamp && hero?.status === "alive");

  let mapNode = $derived(
    view.expeditionMap?.nodes.find((node) => node.id === crew?.mapPosition?.nodeId),
  );
</script>
<div
  class="phone-panel combat-player"
  data-phase={view.phase.kind}
  data-depth={view.depth}
  style:--team={teamColor(crew?.colorId ?? "blue").hex}
>
  {#if !rotationDismissed}
    <aside class="rotation-hint" aria-label="Phone orientation tip">
      <span>↻ Rotate your phone for a better battle view.</span>
      <button
        type="button"
        class="quiet rotation-dismiss"
        aria-label="Dismiss rotation hint"
        onclick={() => {
          rotationDismissed = true;
          sessionStorage.setItem("siege-rotation-hint", "dismissed");
        }}
      >
        ×
      </button>
    </aside>
  {/if}
  <div class="player-heading">
    <span class="team-badge">{crew?.symbol}</span><strong>{crew?.name} · YOU</strong>
    <RoundTimer {view} />
  </div>
  {#if hero}
    <div class="player-vitals">
      <div>
        <strong>{view.self.name} · {hero.classId}</strong
        ><span
          >{hero.hp}/{hero.maxHp}
          HP · {hero.stress}/6 stress{hero.mastery ? ` · ★${hero.mastery.rank}` : ""}</span
        >
      </div>
      <EquipmentSlot {hero} globalTurn={view.globalTurn} />
    </div>
  {/if}
  <div class="treasure-strip">
    <span>{crew?.carriedTreasure ?? 0} carried</span
    ><strong>{crew?.securedTreasure ?? 0} secured</strong>
  </div>
  <p class="phase-instruction">Turn {view.turn}/4 · {phaseInstruction(view)}</p>
  <p class="combat-depth">
    {view.expeditionMap
      ? `Chapter ${view.expeditionMap.chapter} · Room ${((view.depth - 1) % view.expeditionMap.rows) + 1}/${view.expeditionMap.rows}`
      : `Depth ${view.depth}/5`}
    ·
    {encounter?.rivalry
      ? "Lethal rivalry"
      : (encounter?.definition.name ??
        mapNode?.room.name ??
        (view.expeditionMap ? "At the start" : "Campfire"))}
  </p>
  {#if view.readOnly}
    <p class="banner">A newer tab controls this character.</p>
  {/if}
  {#if view.status === "finished"}
    <ResultsScreen {view} />
  {:else}
    <ActionPanel
      {view}
      {controller}
      {locked}
      arena={current.arena}
      actor={current.actor}
      active={interactiveCombat}
      message={view.status === "paused" ? "Expedition paused" : current.message}
      panel={quiz
        ? "question"
        : view.phase.kind === "route" && view.expeditionMap
          ? "map"
          : ((view.phase.kind === "route" || campChoice) && hero?.status === "alive") ||
              (view.phase.kind === "combat" && !interactiveCombat)
            ? "phase"
            : "combat"}
    >
      {#if view.status === "paused"}
        <section class="decision-card"><h2>Expedition paused</h2></section>
      {:else if quiz}
        <QuizCard {view} {controller} {locked} />
      {:else if view.phase.kind === "route" && (hero?.status === "alive" || view.expeditionMap)}
        <RoutePicker {view} {controller} locked={locked || hero?.status !== "alive"} />
      {:else if campChoice}
        <CampPicker {view} {controller} {locked} />
      {:else if view.phase.kind === "combat" && !interactiveCombat}
        <SpiritPanel {view} {controller} {locked} />
      {/if}
    </ActionPanel>
  {/if}
</div>
