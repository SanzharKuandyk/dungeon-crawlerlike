<script lang="ts">
  import { onMount } from "svelte";
  import { actionKey } from "../../game/action-options.js";
  import type { HeroAction } from "../../shared/command-types.js";
  import type { ArenaState, Crew } from "../../shared/game-types.js";
  import { teamColor } from "../../shared/palette.js";
  import type { RoomView } from "../../shared/view-types.js";
  import DungeonArena from "../arena/DungeonArena.svelte";
  import { actorY, SCENE_READOUT_HEIGHT, sceneFrame, sceneHeight } from "../arena/scene-layout.js";
  import { crewView } from "../crew-view.js";
  import { phaseInstruction, presentation } from "../event-presenter.js";
  import CrewOrders from "./CrewOrders.svelte";
  import EnemyIntent from "./EnemyIntent.svelte";
  import GameIcon from "./GameIcon.svelte";
  import HeroInspect from "./HeroInspect.svelte";
  import SceneTargets from "./SceneTargets.svelte";
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
    combatHud = false,
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
    combatHud?: boolean;
    onchoose?: (action: HeroAction) => void;
  } = $props();
  let battle: HTMLDivElement;
  let width = $state(0),
    height = $state(0);
  let portrait = $state(false);
  let now = $state(Date.now());
  let received = $state(Date.now());
  $effect(() => {
    view.revision;
    received = Date.now();
  });
  onMount(() => {
    const observer = new ResizeObserver(([entry]) => {
      width = entry.borderBoxSize[0].inlineSize;
      height = entry.borderBoxSize[0].blockSize;
    });
    observer.observe(battle, { box: "border-box" });
    const query = matchMedia("(max-width: 600px) and (orientation: portrait)");
    const update = () => {
      portrait = query.matches;
    };
    update();
    query.addEventListener("change", update);
    const timer = setInterval(() => (now = Date.now()), 50);
    return () => {
      observer.disconnect();
      clearInterval(timer);
      query.removeEventListener("change", update);
    };
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
  let rows = $derived(
    combatHud && portrait && Math.max(heroes.length, encounter?.enemies.length ?? 0) > 2,
  );
  let fighting = $derived(encounter?.status === "active" && shownCrew.location.kind === "room");
  let own = $derived(view.role === "player" && view.self.crewId === crew.id);
  let run = $derived(view.crewRuns.find((entry) => entry.crewId === crew.id));
  let ready = $derived(view.participation.find((entry) => entry.crewId === crew.id));
  let exploration = $derived(view.explorations.find((event) => event.crewId === crew.id));
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
  class:combat-scene={combatHud}
  class:rows-of-two={rows}
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
  <div
    class="crew-battle animated-battle"
    bind:this={battle}
    style:--combat-art-height={`${sceneFrame(width, height, rows, combatHud).artHeight}px`}
    style:--scene-hud-space={`${Math.max(0, SCENE_READOUT_HEIGHT - ((sceneHeight(rows) - actorY(rows ? 2 : 0, rows)) * width) / 1200)}px`}
  >
    <DungeonArena
      {combatHud}
      {rows}
      view={local}
      arena={display.arena}
      roomId={encounter?.id ?? null}
      actor={display.actor}
      crewId={crew.id}
      targetId={selectedAction && "targetHeroId" in selectedAction
        ? selectedAction.targetHeroId
        : selectedAction && "enemyId" in selectedAction
          ? selectedAction.enemyId
          : null}
    />
    {#if fighting && encounter && !encounter.rivalry && targetHero && !view.quizActive}
      <EnemyIntent {combatHud} {rows} enemy={encounter} hero={targetHero} players={view.players} />
    {/if}
    {#if combatHud && encounter && !encounter.rivalry}
      <SceneTargets
        {rows}
        {encounter}
        {heroes}
        players={view.players}
        {targetActions}
        {selectedAction}
        {locked}
        {onchoose}
        selfId={view.role === "player" ? view.self.id : null}
      />
    {/if}
    <p class="battle-narration" aria-live="polite">
      {run?.suspended ? "Waiting for reconnection" : display.message}
    </p>
    <HeroInspect {combatHud} {rows} {heroes} players={view.players} />
  </div>
  {#if exploration &&
    view.role !== "player" &&
    ["event", "event-reveal", "result"].includes(local.phase.kind)}
    <section class="crew-exploration" aria-label={`${crew.name} event choices`}>
      {#each Object.entries(exploration.choices) as [playerId, choice]}
        {@const member = heroes.find((hero) => hero.playerId === playerId)}
        {@const revealed = local.events.find(
          (event) =>
            event.cause === "event-outcome" &&
            event.actor === member?.id &&
            event.sequence <= ("cursor" in display ? display.cursor : Infinity),
        )}
        <p>
          <GameIcon name={choice.kind === "coin" ? "gold" : "dice"} size={16} />
          <strong>{view.players.find((player) => player.id === playerId)?.name}</strong>
          {choice.kind === "coin"
            ? `${choice.side} · ${member?.power ?? 0} stake · ${choice.prize}`
            : choice.kind.replaceAll("-", " ")}
          {#if revealed}
            <span>{revealed.message}</span>
          {/if}
        </p>
      {/each}
    </section>
  {/if}
  {#if own &&
    view.role === "player" &&
    !view.quizActive &&
    ["combat", "combat-reveal", "combat-recap"].includes(local.phase.kind)}
    <CrewOrders {view} arena={display.arena} />
  {/if}
  {#if !combatHud && targetActions.some((action) => "targetHeroId" in action)}
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
  {#if !combatHud && encounter && !encounter.rivalry && !view.quizActive}
    <div class="enemy-bars">
      <StatusBar
        label="Enemy health"
        caption={encounter.definition.family}
        ariaLabel="Enemy health"
        value={encounter.hp}
        max={encounter.maxHp}
      />
      <div class="shield-badge" title="Enemy Block expires after the next player phase">
        <GameIcon name="shield" size={16} /><strong>{encounter.block}</strong><span>Block</span>
      </div>
    </div>
  {/if}
  <footer>
    <span
      ><GameIcon name="boss" size={16} /><strong>{shownCrew.bossesDefeated}/2</strong>
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
