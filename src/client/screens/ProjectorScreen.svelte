<script lang="ts">
  import { onMount } from "svelte";
  import type { RoomView } from "../../shared/view-types.js";
  import DungeonArena from "../arena/DungeonArena.svelte";
  import CrewGrid from "../components/CrewGrid.svelte";
  import DungeonProgress from "../components/DungeonProgress.svelte";
  import EventLog from "../components/EventLog.svelte";
  import ExpeditionMap from "../components/ExpeditionMap.svelte";
  import HeroInspect from "../components/HeroInspect.svelte";
  import RoundTimer from "../components/RoundTimer.svelte";
  import SiegePanel from "../components/SiegePanel.svelte";
  import TrialPanel from "../components/TrialPanel.svelte";
  import Button from "../components/ui/Button.svelte";
  import { crewView } from "../crew-view.js";
  import { phaseInstruction, presentation } from "../event-presenter.js";
  import { preferences } from "../room.svelte.js";
  import ResultsScreen from "./ResultsScreen.svelte";

  let {
    view,
    embedded = false,
    onmanage,
    hostController = null,
    onrecover = () => {},
  }: {
    view: RoomView;
    embedded?: boolean;
    onmanage?: (id: string) => void;
    hostController?: import("../host-controller.js").HostController | null;
    onrecover?: (id: string) => void;
  } = $props();
  let now = $state(Date.now()),
    received = $state(Date.now()),
    selected = $state<string | null>(null),
    tab = $state<"board" | "map" | "log">("board"),
    chapter = $state(1),
    detail = $state<HTMLDialogElement | null>(null);
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
    current.arena.encounters.find(
      (e) => crew?.location.kind === "room" && e.id === crew.location.roomId,
    ),
  );
  let quiz = $derived(
    view.independent
      ? view.quizActive
      : ["question-intro", "question", "explanation", "equipment", "return"].includes(
          view.phase.kind,
        ),
  );
  let shownTab = $derived(
    view.status === "lobby" || view.status === "finished" || !view.expeditionMap
      ? tab === "map"
        ? "board"
        : tab
      : tab,
  );
  $effect(() => {
    if (!detail) return;
    if (selected !== null && shownTab === "board" && !quiz) {
      if (!detail.open) detail.showModal();
    } else if (detail.open) detail.close();
  });
</script>

<section class="board-screen expedition-board">
  <div class="board-toolbar">
    <header class="expedition-heading">
      <div>
        <p class="eyebrow">
          {embedded ? "" : `Room ${view.code} · `}{view.status === "lobby"
            ? "Gather your crews"
            : view.expeditionMap
              ? view.independent
                ? "Two chapters · bosses, progress, trial points"
                : `Chapter ${view.expeditionMap.chapter} · Room ${((view.depth - 1) % view.expeditionMap.rows) + 1}`
              : `Depth ${view.depth} · Turn ${view.turn}`}
        </p>
        <h1>{phaseInstruction(view)}</h1>
      </div>
      {#if !view.independent || quiz}
        <RoundTimer {view} />
      {/if}
    </header>
    <nav class="board-tabs" aria-label="Board views">
      {#if view.expeditionMap && view.status !== "lobby" && view.status !== "finished"}
        <Button
          type="button"
          aria-pressed={shownTab === "map"}
          onclick={() => (tab = "map")}
          class={`${shownTab === "map" ? "chosen" : ""}`}
        >
          Map
        </Button>
      {/if}
      <Button
        type="button"
        aria-pressed={shownTab === "board"}
        onclick={() => (tab = "board")}
        class={`${shownTab === "board" ? "chosen" : ""}`}
      >
        Dungeon
      </Button>
      <Button
        type="button"
        aria-pressed={tab === "log"}
        onclick={() => (tab = "log")}
        class={`${tab === "log" ? "chosen" : ""}`}
      >
        Log
      </Button>
    </nav>
  </div>
  {#if view.status !== "lobby" && !view.expeditionMap}
    <DungeonProgress depth={view.depth} finished={view.status === "finished"} />
  {/if}
  {#if view.expeditionMap && view.status !== "lobby" && view.status !== "finished"}
    <div hidden={shownTab !== "map"} class="board-panel map-board-panel">
      {#if quiz && shownTab === "map"}
        <section class="inscription-panel">
          {#if view.siege}
            <SiegePanel {view} />
          {:else}
            <TrialPanel view={{ ...view, role: "projector" }} />
          {/if}
        </section>
      {:else if !quiz}
        <nav class="board-tabs" aria-label="Chapter maps">
          {#each view.chapterMaps as map}
            <Button
              type="button"
              aria-pressed={chapter === map.chapter}
              onclick={() => (chapter = map.chapter)}
              class={`${chapter === map.chapter ? "chosen" : ""}`}
            >
              Chapter {map.chapter}
            </Button>
          {/each}
        </nav>
        <ExpeditionMap
          roomId={view.id}
          map={view.chapterMaps[chapter - 1] ?? view.expeditionMap}
          crews={current.arena.crews}
        />
      {/if}
    </div>
  {/if}

  <div hidden={shownTab !== "board"} class="board-panel">
    {#if quiz && shownTab === "board"}
      <section class="inscription-panel">
        {#if view.siege}
          <SiegePanel {view} />
        {:else}
          <TrialPanel view={{ ...view, role: "projector" }} />
        {/if}
      </section>
    {/if}
    {#if view.status === "finished"}
      <ResultsScreen {view} />
    {/if}
    <div hidden={view.status === "finished"}>
      {#if current.message !== phaseInstruction(view)}
        <p class="board-narration" aria-live="polite">{current.message}</p>
      {/if}
      <CrewGrid
        {hostController}
        {onrecover}
        {view}
        arena={current.arena}
        actor={current.actor}
        {selected}
        onselect={(id) => {
          if (view.status === "lobby" && onmanage) onmanage(id);
          else selected = selected === id ? null : id;
        }}
      />
    </div>
  </div>
  <div hidden={shownTab !== "log"} class="board-log">
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
      <Button type="button" class="quiet" onclick={() => (selected = null)}>Close</Button>
    </header>
    <div class="inspectable-arena">
      {#if selected}
        <HeroInspect
          heroes={current.arena.heroes.filter((h) => h.crewId === selected)}
          players={view.players}
        />
      {/if}
      <DungeonArena
        view={selected ? crewView(view, selected) : view}
        arena={current.arena}
        roomId={encounter?.id ?? null}
        actor={current.actor}
        crewId={selected}
      />
    </div>
  </dialog>
</section>
