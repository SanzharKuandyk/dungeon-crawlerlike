<script lang="ts">
  import { onMount } from "svelte";
  import type { RoomView } from "../../shared/view-types.js";
  import DungeonArena from "../arena/DungeonArena.svelte";
  import CrewGrid from "../components/CrewGrid.svelte";
  import DungeonProgress from "../components/DungeonProgress.svelte";
  import EventLog from "../components/EventLog.svelte";
  import QuizCard from "../components/QuizCard.svelte";
  import RoundTimer from "../components/RoundTimer.svelte";
  import { phaseInstruction, presentation } from "../event-presenter.js";
  import { preferences } from "../room.svelte.js";
  import ResultsScreen from "./ResultsScreen.svelte";

  let { view, embedded = false }: { view: RoomView; embedded?: boolean } = $props();
  let now = $state(Date.now()),
    received = $state(Date.now()),
    selected = $state<string | null>(null),
    tab = $state<"board" | "log">("board"),
    page = $state(0),
    pageSize = $state(2),
    detail = $state<HTMLDialogElement | null>(null);
  $effect(() => {
    view.revision;
    received = Date.now();
  });
  onMount(() => {
    const timer = setInterval(() => (now = Date.now()), 100);
    const narrow = matchMedia("(max-width: 760px)");
    const resize = () => {
      pageSize = narrow.matches ? 1 : 2;
      page = 0;
    };
    resize();
    narrow.addEventListener("change", resize);
    return () => {
      clearInterval(timer);
      narrow.removeEventListener("change", resize);
    };
  });
  let current = $derived(
    presentation(view, now + view.serverNow - received, preferences.reducedMotion),
  );
  let pages = $derived(Math.max(1, Math.ceil(current.arena.crews.length / pageSize)));
  let currentPage = $derived(Math.min(page, pages - 1));
  let visibleCrews = $derived(
    current.arena.crews.slice(currentPage * pageSize, (currentPage + 1) * pageSize),
  );
  let crew = $derived(current.arena.crews.find((c) => c.id === selected));
  let encounter = $derived(
    current.arena.encounters.find(
      (e) => crew?.location.kind === "room" && e.id === crew.location.roomId,
    ),
  );
  let quiz = $derived(
    ["question-intro", "question", "explanation", "equipment", "return"].includes(view.phase.kind),
  );
  $effect(() => {
    if (!detail) return;
    if (selected !== null && tab === "board" && !quiz) {
      if (!detail.open) detail.showModal();
    } else if (detail.open) detail.close();
  });

  function move(direction: number) {
    page = Math.max(0, Math.min(pages - 1, currentPage + direction));
  }
</script>

<section class="board-screen expedition-board">
  <header class="expedition-heading">
    <div>
      <p class="eyebrow">
        {embedded ? "" : `Room ${view.code} · `}{view.status === "lobby"
          ? "Gather your crews"
          : `Depth ${view.depth} · Turn ${view.turn}`}
      </p>
      <h1>{phaseInstruction(view)}</h1>
    </div>
    <RoundTimer {view} />
  </header>
  {#if view.status !== "lobby"}
    <DungeonProgress depth={view.depth} finished={view.status === "finished"} />
  {/if}
  <nav class="board-tabs" aria-label="Board views">
    <button
      type="button"
      class:chosen={tab === "board"}
      aria-pressed={tab === "board"}
      onclick={() => (tab = "board")}
    >
      Dungeon
    </button>
    <button
      type="button"
      class:chosen={tab === "log"}
      aria-pressed={tab === "log"}
      onclick={() => (tab = "log")}
    >
      Log
    </button>
  </nav>
  <div hidden={tab !== "board"} class="board-panel">
    {#if quiz}
      <section class="inscription-panel">
        <QuizCard view={{ ...view, role: "projector" }} />
      </section>
    {:else if view.status === "finished"}
      <ResultsScreen {view} />
    {:else}
      {#if current.message !== phaseInstruction(view)}
        <p class="board-narration" aria-live="polite">{current.message}</p>
      {/if}
      <div class="crew-pages" class:single-page={pages === 1}>
        {#if pages > 1}
          <button
            type="button"
            class="page-arrow"
            aria-label="Previous crews"
            disabled={currentPage === 0}
            onclick={() => move(-1)}
          >
            ‹
          </button>
        {/if}
        <CrewGrid
          {view}
          arena={current.arena}
          actor={current.actor}
          {selected}
          crewIds={visibleCrews.map((c) => c.id)}
          onselect={(id) => (selected = selected === id ? null : id)}
        />
        {#if pages > 1}
          <button
            type="button"
            class="page-arrow"
            aria-label="Next crews"
            disabled={currentPage >= pages - 1}
            onclick={() => move(1)}
          >
            ›
          </button>
        {/if}
      </div>
      {#if current.arena.crews.length}
        <p class="page-count" aria-live="polite">
          Crews {currentPage * pageSize + 1}–{Math.min(
            (currentPage + 1) * pageSize,
            current.arena.crews.length,
          )}
          of {current.arena.crews.length}
        </p>
      {/if}
    {/if}
  </div>
  <div hidden={tab !== "log"} class="board-log">
    <EventLog {view} cursor={current.cursor} full />
  </div>
  <dialog
    bind:this={detail}
    class="encounter-detail"
    aria-label={`${crew?.name ?? "Crew"} encounter`}
    onclose={() => (selected = null)}
  >
    <header>
      <h2>{crew?.name ?? "Encounter"} · {encounter?.definition.name ?? "Campfire"}</h2>
      <button type="button" class="quiet" onclick={() => (selected = null)}>Close</button>
    </header>
    <DungeonArena
      {view}
      arena={current.arena}
      roomId={encounter?.id ?? null}
      actor={current.actor}
      crewId={selected}
    />
  </dialog>
</section>
