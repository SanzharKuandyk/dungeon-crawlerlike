<script lang="ts">
  import { onMount } from "svelte";
  import type { RoomView } from "../../shared/view-types.js";
  import DungeonArena from "../arena/DungeonArena.svelte";
  import CrewGrid from "../components/CrewGrid.svelte";
  import EventLog from "../components/EventLog.svelte";
  import QuizCard from "../components/QuizCard.svelte";
  import RoundTimer from "../components/RoundTimer.svelte";
  import { presentation } from "../event-presenter.js";
  import { preferences } from "../room.svelte.js";
  import ResultsScreen from "./ResultsScreen.svelte";

  let { view, embedded = false }: { view: RoomView; embedded?: boolean } = $props();
  let now = $state(Date.now()),
    received = $state(Date.now()),
    selected = $state<string | null>(null);
  $effect(() => {
    view.revision;
    received = Date.now();
  });
  onMount(() => {
    const timer = setInterval(() => (now = Date.now()), 100);
    return () => clearInterval(timer);
  });
  let current = $derived(
    presentation(view, now + view.serverNow - received, preferences.reducedMotion),
  );
  let crew = $derived(current.arena.crews.find((c) => c.id === selected));
  let encounter = $derived(
    current.arena.encounters.find((e) => e.crewIds.includes(selected ?? "")),
  );
  let quiz = $derived(
    ["question-intro", "question", "explanation", "equipment", "return"].includes(view.phase.kind),
  );
</script>
<section class="board-screen expedition-board">
  <header class="expedition-heading">
    <div>
      <p class="eyebrow">
        {embedded ? "" : `Room ${view.code} · `}Depth {view.depth}/5 · Turn {view.turn}/4
      </p>
      <h1 aria-live="polite">{current.message}</h1>
    </div>
    <RoundTimer {view} />
  </header>
  {#if quiz}
    <section class="inscription-panel"><QuizCard view={{ ...view, role: "projector" }} /></section>
  {/if}
  {#if view.status === "finished"}
    <ResultsScreen {view} />
  {/if}
  <CrewGrid
    {view}
    arena={current.arena}
    actor={current.actor}
    {selected}
    onselect={(id) => (selected = selected === id ? null : id)}
  />
  <section class="encounter-detail" class:open={selected !== null} aria-hidden={selected === null}>
    <header>
      <h2>{crew?.name ?? "Encounter"} · {encounter?.definition.name ?? "Campfire"}</h2>
      <button type="button" class="quiet" onclick={() => (selected = null)}>Close</button>
    </header>
    <DungeonArena
      {view}
      arena={current.arena}
      roomId={encounter?.id ?? null}
      actor={current.actor}
    />
  </section>
  <EventLog {view} cursor={current.cursor} />
</section>
