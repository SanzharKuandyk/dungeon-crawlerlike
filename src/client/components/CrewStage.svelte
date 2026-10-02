<script lang="ts">
  import { actionKey } from "../../game/action-options.js";
  import { enemyIntent } from "../../game/enemy-actions.js";
  import type { HeroAction } from "../../shared/command-types.js";
  import type { ArenaState, Crew } from "../../shared/game-types.js";
  import { teamColor } from "../../shared/palette.js";
  import type { RoomView } from "../../shared/view-types.js";
  import BattleHero from "./BattleHero.svelte";

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
  let color = $derived(teamColor(crew.colorId).hex);
  let body = $derived(targetActions.find((a) => "part" in a && a.part === "body"));
  let weak = $derived(targetActions.find((a) => "part" in a && a.part === "weak-point"));
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
  let nearbyAllies = $derived(
    arena.heroes.filter(
      (h) =>
        h.crewId !== crew.id &&
        h.crewId !== rival?.id &&
        targetActions.some((a) => "targetHeroId" in a && a.targetHeroId === h.id),
    ),
  );
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
        {@const action =
          targetActions.find((a) => "targetHeroId" in a && a.targetHeroId === hero?.id) ?? null}
        <BattleHero
          {hero}
          classId={hero?.classId ?? member.classId}
          {color}
          name={member.name}
          own={view.role === "player" && view.self.id === member.id}
          acting={actor === hero?.id}
          {action}
          selected={!!action && !!selectedAction && actionKey(action) === actionKey(selectedAction)}
          {locked}
          {onchoose}
        />
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
          {#if onchoose}
            <div class="enemy-targets">
              <button
                type="button"
                class:chosen={body &&
                  selectedAction &&
                  actionKey(selectedAction) === actionKey(body)}
                aria-pressed={!!body &&
                  !!selectedAction &&
                  actionKey(selectedAction) === actionKey(body)}
                disabled={locked || !body}
                onclick={() => body && onchoose?.(body)}
              >
                Body
              </button>
              <button
                type="button"
                class:chosen={weak &&
                  selectedAction &&
                  actionKey(selectedAction) === actionKey(weak)}
                aria-pressed={!!weak &&
                  !!selectedAction &&
                  actionKey(selectedAction) === actionKey(weak)}
                disabled={locked || !weak}
                onclick={() => weak && onchoose?.(weak)}
              >
                Weak point
              </button>
            </div>
          {/if}
          <span
            >{encounter.weakHp > 0 ? `Weak point ${encounter.weakHp}` : "Weak point broken"}</span
          >
        </div>
      </div>
    {:else if fighting && rival}
      <div class="rival-party">
        <strong>vs {rival.name}</strong>
        <div class="crew-party" style:--party-size={rival.playerIds.length}>
          {#each arena.heroes.filter((h) => h.crewId === rival.id) as hero (hero.id)}
            {@const action =
              targetActions.find((a) => "targetHeroId" in a && a.targetHeroId === hero.id) ?? null}
            <BattleHero
              {hero}
              classId={hero.classId}
              color={teamColor(rival.colorId).hex}
              name={view.players.find((p) => p.id === hero.playerId)?.name ?? "Rival"}
              {action}
              selected={!!action &&
                !!selectedAction &&
                actionKey(action) === actionKey(selectedAction)}
              {locked}
              {onchoose}
            />
          {/each}
        </div>
      </div>
    {/if}
  </div>
  {#if nearbyAllies.length}
    <details class="nearby-allies">
      <summary>Other crews in this room · {nearbyAllies.length} allies</summary>
      <div class="crew-party" style:--party-size={Math.min(4, nearbyAllies.length)}>
        {#each nearbyAllies as hero (hero.id)}
          {@const action =
            targetActions.find((a) => "targetHeroId" in a && a.targetHeroId === hero.id) ?? null}
          <BattleHero
            {hero}
            classId={hero.classId}
            color={teamColor(arena.crews.find((c) => c.id === hero.crewId)?.colorId ?? "blue").hex}
            name={view.players.find((p) => p.id === hero.playerId)?.name ?? "Ally"}
            {action}
            selected={!!action &&
              !!selectedAction &&
              actionKey(action) === actionKey(selectedAction)}
            {locked}
            {onchoose}
          />
        {/each}
      </div>
    </details>
  {/if}
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
