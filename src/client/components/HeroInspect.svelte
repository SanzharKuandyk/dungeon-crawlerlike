<script lang="ts">
  import { onMount } from "svelte";
  import { itemDefinition, itemDescription } from "../../game/inventory/catalog.js";
  import { CLASS_NAMES } from "../../shared/display-names.js";
  import type { Hero, Player } from "../../shared/game-types.js";
  import { actorY, heroX, sceneFrame } from "../arena/scene-layout.js";
  import { heroEffects } from "../hero-effects.js";
  import GameIcon from "./GameIcon.svelte";
  import Dialog from "./ui/Dialog.svelte";

  let {
    heroes,
    players,
    rows = false,
    combatHud = false,
  }: {
    heroes: Hero[];
    players: Pick<Player, "id" | "name">[];
    rows?: boolean;
    combatHud?: boolean;
  } = $props();
  let element: HTMLElement;
  let width = $state(0),
    height = $state(0);
  let frame = $derived(sceneFrame(width, height, rows, combatHud));
  let scale = $derived(frame.scale);
  onMount(() => {
    const observer = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
    });
    observer.observe(element);
    return () => observer.disconnect();
  });
  let inspectedId = $state<string | null>(null),
    open = $state(false);
  let inspected = $derived(heroes.find((hero) => hero.id === inspectedId) ?? null);
  const sceneEffects = (hero: Hero) =>
    heroEffects(hero).filter((effect) => effect.id !== hero.inventory.equipment.weapon?.id);
</script>
<section class="scene-builds" bind:this={element} aria-label="Inspect crew characters">
  {#each heroes as hero, index}
    <button
      type="button"
      class="scene-build"
      style:left={`${frame.left + heroX(index, heroes.length, rows) * scale}px`}
      style:top={`${Math.max(0, Math.min(height - 44, frame.top + actorY(index, rows) * scale + (combatHud ? 60 : 72 * scale)))}px`}
      aria-label={`Inspect ${players.find((p) => p.id === hero.playerId)?.name ?? "character"}`}
      onclick={() => {
        inspectedId = hero.id;
        open = true;
      }}
    >
      <span class="scene-build-icons">
        {#each sceneEffects(hero).slice(0, 2) as effect}
          <span
            class:used={effect.used}
            style:color={effect.tone === "harm" ? "#a63826" : "var(--health-fill)"}
            title={`${effect.label} · ${effect.value}`}
            ><GameIcon name={effect.icon} size={16} /></span
          >
        {:else}
          <GameIcon name="info" size={16} />
        {/each}
        {#if sceneEffects(hero).length > 2}
          <small>+{sceneEffects(hero).length - 2}</small>
        {/if}
      </span>
    </button>
  {/each}
</section>
<Dialog
  bind:open
  title={inspected
    ? (players.find((p) => p.id === inspected?.playerId)?.name ?? "Character") +
      " · " +
      CLASS_NAMES[inspected.classId]
    : "Character"}
>
  {#if inspected}
    <p>
      <GameIcon name="heart" />{inspected.hp}/{inspected.maxHp}
      · <GameIcon name="shield" />{inspected.block}
      Block · <GameIcon name="stress" />{inspected.stress}/10{inspected.status === "dead"
        ? " · Fallen spirit"
        : ""}
    </p>
    <p>Block absorbs damage before health. Unused Block expires at your next turn.</p>
    {#each heroEffects(inspected) as effect}
      <div class="build-inspection-row">
        <GameIcon name={effect.icon} />
        <div>
          <strong>{effect.label} · {effect.value}</strong>
          <p>{effect.detail}</p>
        </div>
      </div>
    {/each}
    {#each Object.values(inspected.inventory.equipment).filter((i) => i !== null) as item}
      <p>
        <strong>{itemDefinition(item.kind)?.name} · {"I".repeat(item.rank)}</strong><br>
        {itemDescription(item.kind, inspected.power, item.rank)}
      </p>
    {/each}
  {/if}
</Dialog>
