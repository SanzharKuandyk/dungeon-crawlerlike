<script lang="ts">
  import { onMount } from "svelte";
  import type { HeroAction } from "../../shared/command-types.js";
  import type { Hero, Player, RoomEncounter } from "../../shared/game-types.js";
  import { actorY, enemyX, heroX, sceneFrame } from "../arena/scene-layout.js";
  import GameIcon from "./GameIcon.svelte";

  let {
    encounter,
    heroes,
    players,
    targetActions,
    selectedAction,
    locked,
    onchoose,
    selfId,
    rows = false,
  }: {
    encounter: RoomEncounter;
    heroes: Hero[];
    players: Pick<Player, "id" | "name">[];
    targetActions: HeroAction[];
    selectedAction: HeroAction | null;
    locked: boolean;
    onchoose?: (action: HeroAction) => void;
    selfId: string | null;
    rows?: boolean;
  } = $props();
  let element: HTMLFieldSetElement,
    width = $state(0),
    height = $state(0);
  let frame = $derived(sceneFrame(width, height, rows, true));
  let scale = $derived(frame.scale);
  let left = $derived(frame.left);
  let top = $derived(frame.top);
  onMount(() => {
    const observer = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
    });
    observer.observe(element);
    return () => observer.disconnect();
  });
</script>
<fieldset class="scene-targets" bind:this={element} aria-label="Encounter targets">
  {#each encounter.enemies as enemy, index (enemy.id)}
    {@const action = targetActions.find((a) => "enemyId" in a && a.enemyId === enemy.id)}
    <div
      class="scene-actor-hud enemy-actor-hud"
      class:fallen={enemy.hp === 0}
      style:left={`${left + enemyX(index, encounter.enemies.length, rows) * scale}px`}
      style:top={`${top + (actorY(index, rows) - 146) * scale}px`}
      style:--actor-height={`${146 * scale}px`}
      style:--actor-width={`${rows ? 72 : Math.max(44, 140 * scale)}px`}
    >
      <button
        type="button"
        class="scene-target"
        data-enemy-id={enemy.id}
        aria-label={`Target ${enemy.name} · ${enemy.hp}/${enemy.maxHp} health · ${enemy.block} Block`}
        aria-pressed={!!selectedAction &&
          "enemyId" in selectedAction &&
          selectedAction.enemyId === enemy.id}
        disabled={locked || !action || enemy.hp === 0}
        onclick={() => action && onchoose?.(action)}
      >
        <span class="actor-name">{enemy.name}</span>
        <span class="actor-health-track"
          ><span style:width={`${(100 * enemy.hp) / enemy.maxHp}%`}></span></span
        >
        <span class="actor-numbers"
          ><span>{enemy.hp}</span>
          {#if enemy.block}
            <span class="actor-block"><GameIcon name="shield" size={12} />{enemy.block}</span>
          {/if}
          {#if rows}
            {#each enemy.effects.filter((e) => e.kind === "marked") as effect}
              <span class="actor-block"
                ><GameIcon name="marked" size={12} />{effect.magnitude}</span
              >
            {/each}
          {/if}</span
        >
      </button>
    </div>
  {/each}
  {#each heroes as hero, index (hero.id)}
    {@const action = targetActions.find(
      (a) =>
        "targetHeroId" in a &&
        a.targetHeroId === hero.id &&
        (selectedAction?.kind !== "use-item" ||
          a.kind !== "use-item" ||
          a.itemId === selectedAction.itemId),
    )}
    <div
      class="scene-actor-hud hero-actor-hud"
      class:fallen={hero.status === "dead"}
      style:left={`${left + heroX(index, heroes.length, rows) * scale}px`}
      style:top={`${top + (actorY(index, rows) - 146) * scale}px`}
      style:--actor-height={`${146 * scale}px`}
      style:--actor-width={`${Math.max(44, 120 * scale)}px`}
    >
      <button
        type="button"
        class="scene-target"
        data-hero-id={hero.id}
        aria-label={`Select ${players.find((p) => p.id === hero.playerId)?.name ?? "character"} · ${hero.hp}/${hero.maxHp} health · ${hero.block} Block`}
        aria-pressed={!!selectedAction &&
          "targetHeroId" in selectedAction &&
          selectedAction.targetHeroId === hero.id}
        disabled={locked || !action || hero.status === "dead"}
        onclick={() => action && onchoose?.(action)}
      >
        <span class="actor-name">{hero.playerId === selfId ? "YOU" : String(index + 1)}</span>
        <span class="actor-health-track"
          ><span style:width={`${(100 * hero.hp) / hero.maxHp}%`}></span></span
        >
        <span
          class="actor-block-track"
          title={`${hero.block} Block · absorbs damage before health`}
        >
          <span style:width={`${(100 * hero.block) / Math.max(hero.maxHp, hero.block)}%`}></span>
        </span>
        <span class="actor-numbers"
          >{hero.status === "dead" ? "Spirit" : `${hero.hp}/${hero.maxHp}`}</span
        >
        {#if hero.block > 0}
          <span class="actor-block"><GameIcon name="shield" size={12} />{hero.block}</span>
        {/if}
      </button>
    </div>
  {/each}
</fieldset>
