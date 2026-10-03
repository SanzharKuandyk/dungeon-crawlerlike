<script lang="ts">
  import { onMount } from "svelte";
  import { actionKey } from "../../game/action-options.js";
  import { enemyIntent } from "../../game/enemy-actions.js";
  import type { HeroAction } from "../../shared/command-types.js";
  import type { ArenaState, Crew } from "../../shared/game-types.js";
  import { teamColor } from "../../shared/palette.js";
  import type { RoomView } from "../../shared/view-types.js";
  import DungeonArena from "../arena/DungeonArena.svelte";
  import { crewView } from "../crew-view.js";
  import { phaseInstruction, presentation } from "../event-presenter.js";

  let {
    view,
    arena,
    crew,
    actor = null,
    selected = false,
    onselect = null,
    targetActions = [],
    selectedAction = null,
    locked = false,
    onchoose,
  }: {
    view: RoomView;
    arena: ArenaState;
    crew: Crew;
    actor?: string | null;
    selected?: boolean;
    onselect?: ((id: string) => void) | null;
    targetActions?: HeroAction[];
    selectedAction?: HeroAction | null;
    locked?: boolean;
    onchoose?: (action: HeroAction) => void;
  } = $props();
  let now = $state(Date.now());
  let received = $state(Date.now());
  $effect(() => {
    view.revision;
    received = Date.now();
  });
  onMount(() => {
    const timer = setInterval(() => (now = Date.now()), 50);
    return () => clearInterval(timer);
  });
  let local = $derived(crewView(view, crew.id));
  let display = $derived(
    view.independent
      ? presentation(local, now + view.serverNow - received)
      : { arena, actor, message: phaseInstruction(view) },
  );
  let shownCrew = $derived(display.arena.crews.find((entry) => entry.id === crew.id) ?? crew);
  let heroes = $derived(display.arena.heroes.filter((hero) => hero.crewId === crew.id));
  let encounter = $derived(
    display.arena.encounters.find(
      (entry) => shownCrew.location.kind === "room" && entry.id === shownCrew.location.roomId,
    ),
  );
  let fighting = $derived(encounter?.status === "active" && shownCrew.location.kind === "room");
  let own = $derived(view.role === "player" && view.self.crewId === crew.id);
  let run = $derived(view.crewRuns.find((entry) => entry.crewId === crew.id));
  let ready = $derived(view.participation.find((entry) => entry.crewId === crew.id));
  let targetHero = $derived(heroes.find((hero) => hero.status === "alive"));
  let intent = $derived(
    encounter && !encounter.rivalry && targetHero
      ? enemyIntent(encounter, targetHero, local.depth, local.turn)
      : null,
  );
</script>

<article
  class="crew-stage"
  class:selected={selected}
  class:own={own}
  style:--team={teamColor(crew.colorId).hex}
>
  <header>
    <span class="team-badge">{crew.symbol}</span>
    {#if onselect}
      <button
        type="button"
        class="crew-title"
        onclick={() => onselect?.(crew.id)}
        aria-label={`View ${crew.name}`}
      >
        {crew.name}{own ? " · YOU" : ""}
      </button>
    {:else}
      <strong>{crew.name}{own ? " · YOU" : ""}</strong>
    {/if}
    <span class="crew-state"
      >{run?.finished
        ? "Expedition complete"
        : view.status === "lobby"
          ? "Preparing"
          : `Room ${local.depth} · ${encounter?.definition.name ?? "Camp"}`}</span
    >
  </header>
  <div class="crew-battle animated-battle">
    <DungeonArena
      view={local}
      arena={display.arena}
      roomId={encounter?.id ?? null}
      actor={display.actor}
      crewId={crew.id}
    />
    {#if fighting && intent}
      <p class="battle-intent">
        <strong
          >{encounter?.definition.family === "sentinel" &&
          encounter.weakHp > 0 &&
          local.turn % 2 === 0
            ? "Heavy strike"
            : "Incoming"}</strong
        >
        {intent.description}
        {#if view.independent &&
          encounter?.definition.family === "sentinel" &&
          encounter.weakHp > 0 &&
          local.turn % 2 === 0}
          <span>Break the seal to interrupt</span>
        {/if}
      </p>
    {/if}
    <p class="battle-narration" aria-live="polite">
      {run?.suspended ? "Waiting for reconnection" : display.message}
    </p>
  </div>
  {#if targetActions.some((action) => "targetHeroId" in action)}
    <fieldset class="character-targets" aria-label="Choose a character">
      {#each targetActions as action}
        {#if "targetHeroId" in action}
          {@const hero = display.arena.heroes.find((entry) => entry.id === action.targetHeroId)}
          <button
            type="button"
            class:chosen={selectedAction && actionKey(selectedAction) === actionKey(action)}
            disabled={locked}
            onclick={() => onchoose?.(action)}
          >
            {view.players.find((entry) => entry.id === hero?.playerId)?.name ?? "Character"}
            · {hero?.hp}/{hero?.maxHp}
          </button>
        {/if}
      {/each}
    </fieldset>
  {/if}
  <footer>
    <span
      ><strong>{shownCrew.securedTreasure}</strong>
      secured · {shownCrew.carriedTreasure} carried</span
    >
    <span
      >{view.status === "lobby"
        ? `${crew.playerIds.length}/4 members`
        : run?.finished
          ? "Finished"
          : `${run?.readyCount ?? ready?.ready ?? 0}/${run?.memberCount ?? ready?.total ?? crew.playerIds.length} ready`}</span
    >
  </footer>
</article>
