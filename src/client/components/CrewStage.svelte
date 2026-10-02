<script lang="ts">
  import { enemyIntent } from "../../game/enemy-actions.js";
  import type { ArenaState, Crew } from "../../shared/game-types.js";
  import { teamColor } from "../../shared/palette.js";
  import type { RoomView } from "../../shared/view-types.js";
  import HeroModel from "./HeroModel.svelte";

  let {
    view,
    arena,
    crew,
    actor = null,
    selected = false,
    onselect = null,
  }: {
    view: RoomView;
    arena: ArenaState;
    crew: Crew;
    actor?: string | null;
    selected?: boolean;
    onselect?: ((id: string) => void) | null;
  } = $props();
  let color = $derived(teamColor(crew.colorId).hex);
  let heroes = $derived(arena.heroes.filter((h) => h.crewId === crew.id));
  let members = $derived(view.players.filter((p) => p.crewId === crew.id));
  let encounter = $derived(arena.encounters.find((e) => e.crewIds.includes(crew.id)));
  let fighting = $derived(crew.location.kind === "room" && encounter?.status === "active");
  let rival = $derived(
    encounter?.rivalry
      ? arena.crews.find((c) => c.id !== crew.id && encounter?.crewIds.includes(c.id))
      : null,
  );
  let own = $derived(view.role === "player" && view.self.crewId === crew.id);
  let readiness = $derived(view.participation.find((p) => p.crewId === crew.id));
  let result = $derived(view.quizResults.find((r) => r.crewId === crew.id));
  let stateLabel = $derived(
    view.status === "lobby"
      ? "Preparing"
      : crew.status === "eliminated"
        ? "Fallen crew"
        : fighting && rival
          ? `Rivalry · vs ${rival.name}`
          : fighting
            ? (encounter?.definition.name ?? "In the dungeon")
            : "At the campfire",
  );
</script>
<article class="crew-stage" class:selected={selected} class:own={own} style:--team={color}>
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
    <span class="crew-state">{stateLabel}</span>
  </header>
  <div class="crew-battle" class:camp={!fighting} class:eliminated={crew.status === "eliminated"}>
    <img
      class="battle-backdrop"
      src={`/assets/rooms/${fighting ? encounter?.definition.family : "camp"}.svg`}
      alt=""
    >
    {#if fighting && encounter && !encounter.rivalry && heroes.some((h) => h.status === "alive")}
      <p class="battle-intent">
        Intent:
        {enemyIntent(
          encounter,
          heroes.find((h) => h.status === "alive") ?? heroes[0],
          view.depth,
          view.turn,
        ).description}
      </p>
    {/if}
    <div class="crew-party" style:--party-size={members.length}>
      {#each members as member}
        {@const hero = heroes.find((h) => h.playerId === member.id)}
        <div class="party-character" class:acting={actor === hero?.id}>
          <HeroModel
            classId={hero?.classId ?? member.classId}
            {color}
            name={member.name}
            fallen={hero?.status === "dead"}
          />
          <strong title={member.name}>{member.name}</strong>
          {#if hero}
            <span>{hero.status === "dead" ? "Spirit" : `${hero.hp}/${hero.maxHp} HP`}</span>
            <meter aria-label={`${member.name} health`} value={hero.hp} max={hero.maxHp}></meter>
            <span class="party-stress">{hero.stress}/6 stress</span>
            {#if hero.mastery}
              <span class="mastery-label">{"★".repeat(hero.mastery.rank)}</span>
            {/if}
          {:else}
            <span>{member.classId}</span>
          {/if}
        </div>
      {/each}
    </div>
    {#if fighting && encounter && !encounter.rivalry}
      <div class="party-enemy">
        <img
          src={`/assets/enemies/${encounter.definition.family}.svg`}
          alt={encounter.definition.family}
        >
        <div class="enemy-vitals">
          <span>{encounter.bodyHp}/{encounter.maxBodyHp} HP</span>
          <meter
            aria-label={`${crew.name} enemy health`}
            value={encounter.bodyHp}
            max={encounter.maxBodyHp}
          ></meter>
          <span
            >{encounter.weakHp > 0 ? `Weak point ${encounter.weakHp}` : "Weak point broken"}</span
          >
        </div>
      </div>
    {:else if fighting && rival}
      <div class="rival-party">
        <span class="team-badge" style:--team={teamColor(rival.colorId).hex}>{rival.symbol}</span
        ><strong>vs {rival.name}</strong
        ><span
          >{arena.heroes.filter((h) => h.crewId === rival.id && h.status === "alive").length}
          alive</span
        >
      </div>
    {/if}
  </div>
  <footer>
    <span><strong>{crew.securedTreasure}</strong> secured · {crew.carriedTreasure} carried</span>
    {#if view.status === "lobby"}
      <span>{members.length}/4 members</span>
    {:else if view.phase.kind === "question" && readiness}
      <span>{readiness.answered}/{crew.startingSize} answered</span>
    {:else if result && ["explanation", "equipment"].includes(view.phase.kind)}
      <span>{result.correct}/{result.total} correct</span>
    {:else if ["route", "combat", "camp"].includes(view.phase.kind) && readiness}
      <span>{readiness.ready}/{readiness.total} ready</span>
    {:else}
      <span>{heroes.filter((h) => h.status === "alive").length}/{crew.startingSize} alive</span>
    {/if}
  </footer>
</article>
