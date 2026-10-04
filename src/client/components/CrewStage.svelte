<script lang="ts">
  import { onMount } from "svelte";
  import { actionKey } from "../../game/action-options.js";
  import type { HeroAction } from "../../shared/command-types.js";
  import type { ArenaState, Crew } from "../../shared/game-types.js";
  import { teamColor } from "../../shared/palette.js";
  import type { RoomView } from "../../shared/view-types.js";
  import DungeonArena from "../arena/DungeonArena.svelte";
  import { crewView } from "../crew-view.js";
  import { phaseInstruction, presentation } from "../event-presenter.js";
  import CrewOrders from "./CrewOrders.svelte";
  import EnemyIntent from "./EnemyIntent.svelte";
  import GameIcon from "./GameIcon.svelte";
  import Button from "./ui/Button.svelte";
  import StatusBar from "./ui/StatusBar.svelte";

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
    obscured = false,
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
    obscured?: boolean;
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
  let targetHero = $derived(
    (view.role === "player"
      ? heroes.find((h) => h.playerId === view.self.id && h.status === "alive")
      : null) ?? heroes.find((h) => h.status === "alive"),
  );
</script>

<article
  inert={obscured}
  aria-hidden={obscured ? true : undefined}
  class="crew-stage"
  class:selected={selected}
  class:own={own}
  style:--team={teamColor(crew.colorId).hex}
>
  <header>
    <span class="team-badge">{crew.symbol}</span>
    {#if onselect}
      <Button
        type="button"
        class="crew-title"
        onclick={() => onselect?.(crew.id)}
        aria-label={`View ${crew.name}`}
      >
        {crew.name}{own ? " · YOU" : ""}
      </Button>
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
      targetId={selectedAction && "targetHeroId" in selectedAction
        ? selectedAction.targetHeroId
        : null}
    />
    {#if fighting && encounter && !encounter.rivalry && targetHero && !view.quizActive}
      <EnemyIntent enemy={encounter} hero={targetHero} turn={local.turn} />
    {/if}
    <p class="battle-narration" aria-live="polite">
      {run?.suspended ? "Waiting for reconnection" : display.message}
    </p>
  </div>
  {#if own &&
    view.role === "player" &&
    !view.quizActive &&
    ["combat", "combat-reveal", "combat-recap"].includes(local.phase.kind)}
    <CrewOrders {view} arena={display.arena} />
  {/if}
  {#if targetActions.some((action) => "targetHeroId" in action)}
    <fieldset class="character-targets" aria-label="Choose a character">
      {#each targetActions as action}
        {#if "targetHeroId" in action}
          {@const hero = display.arena.heroes.find((entry) => entry.id === action.targetHeroId)}
          <Button
            type="button"
            disabled={locked}
            onclick={() => onchoose?.(action)}
            class={`${selectedAction && actionKey(selectedAction) === actionKey(action) ? "chosen" : ""}`}
          >
            {view.players.find((entry) => entry.id === hero?.playerId)?.name ?? "Character"}
            · {hero?.hp}/{hero?.maxHp}
          </Button>
        {/if}
      {/each}
    </fieldset>
  {/if}
  {#if encounter && !encounter.rivalry && !view.quizActive}
    <div
      class="enemy-bars"
      style:--shield={`${Math.min(100, (encounter.shield / encounter.maxBodyHp) * 100)}%`}
    >
      <StatusBar
        label="Enemy health"
        caption={encounter.definition.family}
        ariaLabel="Enemy health"
        value={encounter.bodyHp}
        max={encounter.maxBodyHp}
      />
      <StatusBar
        label="Enemy seal"
        caption="Seal"
        ariaLabel="Enemy seal"
        icon="seal"
        value={encounter.weakHp}
        max={encounter.maxWeakHp}
      />
      <div class="shield-badge" title="Enemy shield">
        <GameIcon name="shield" size={16} /><strong>{encounter.shield}</strong>
      </div>
    </div>
  {/if}
  <footer>
    <span
      ><GameIcon name="boss" size={16} /><strong>{shownCrew.bossesDefeated}/3</strong>
      <GameIcon name="gold" size={16} />{shownCrew.economy.gold}</span
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
