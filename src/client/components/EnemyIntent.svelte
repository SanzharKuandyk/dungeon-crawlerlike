<script lang="ts">
  import { onMount } from "svelte";
  import type { Hero, Player, RoomEncounter } from "../../shared/game-types.js";
  import { actorY, enemyX, sceneFrame } from "../arena/scene-layout.js";
  import GameIcon from "./GameIcon.svelte";
  import InspectPopover from "./ui/InspectPopover.svelte";

  let {
    enemy,
    hero,
    players,
    combatHud = false,
    rows = false,
  }: {
    enemy: RoomEncounter;
    hero: Hero;
    players: Pick<Player, "id" | "name">[];
    combatHud?: boolean;
    rows?: boolean;
  } = $props();
  let element: HTMLDivElement,
    width = $state(0),
    height = $state(0);
  let frame = $derived(sceneFrame(width, height, rows, combatHud));
  let scale = $derived(frame.scale);
  onMount(() => {
    const observer = new ResizeObserver(([e]) => {
      width = e.contentRect.width;
      height = e.contentRect.height;
    });
    observer.observe(element);
    return () => observer.disconnect();
  });
</script>
<div
  class="enemy-readout"
  class:compact-intents={enemy.enemies.length > 1 && width < 600}
  bind:this={element}
>
  {#each enemy.enemies as mob, index (mob.id)}
    {#if mob.hp > 0}
      {@const intent = mob.intent}
      {@const x = frame.left + enemyX(index, enemy.enemies.length, rows) * scale}
      <div
        class="intent-hud"
        style:left={`${x}px`}
        style:top={`${Math.max(4, frame.top + (actorY(index, rows) - 200) * scale - 44)}px`}
      >
        <InspectPopover label={`${mob.name}: ${intent.name}`}>
          {#snippet trigger()}
            <span class="intent-symbols">
              {#if intent.targets.length}
                <span><GameIcon name="weapon" /><strong>{intent.targets[0].damage}</strong></span>
                {#if intent.targets[0].stress}
                  <span
                    ><GameIcon name="stress" /><strong>+{intent.targets[0].stress}</strong></span
                  >
                {/if}
                {#if intent.targets[0].bleed}
                  <GameIcon name="bleed" />
                {/if}
              {:else if intent.blockGain}
                <span><GameIcon name="shield" /><strong>+{intent.blockGain}</strong></span>
              {:else}
                <GameIcon name="clock" />
              {/if}
            </span>
          {/snippet}
          <strong>{mob.name} · {intent.name}</strong>
          {#each mob.effects as effect}
            <p>
              {effect.kind === "marked"
                ? `Marked: next eligible attack gains ${effect.magnitude} damage.`
                : `Temporary Block: ${effect.magnitude}.`}
            </p>
          {/each}
          {#each intent.targets as target}
            <p>
              {target.heroId === hero.id
                ? "You"
                : (players.find((p) => `hero:${p.id}` === target.heroId)?.name ?? "Ally")}:
              {target.damage}
              damage{target.stress ? ` · +${target.stress} stress` : ""}.
            </p>
            {#if target.bleed}
              <p>Health damage adds Bleed for two turns.</p>
            {/if}
            {#if target.injury}
              <p>{target.injuryChance}% {target.injury} injury chance only after health damage.</p>
            {/if}
          {/each}
          {#if intent.blockGain}
            <p>
              Gain {intent.blockGain} Block{intent.recipientEnemyId !== mob.id
                ? " for an ally"
                : ""}. It protects the next player phase, then expires.
            </p>
          {/if}
          {#if !intent.targets.length && !intent.blockGain}
            <p>Preparing a heavy strike; no damage this turn.</p>
          {/if}
        </InspectPopover>
      </div>
      {#if !rows}
        <div
          class="enemy-applied-effects"
          style:left={`${x}px`}
          style:top={`${Math.max(0, frame.top + (combatHud ? actorY(index, rows) * scale + 44 : 355 * scale))}px`}
        >
          {#each mob.effects as effect}
            <InspectPopover label={effect.kind}>
              {#snippet trigger()}
                <span class="enemy-effect-chip"
                  ><GameIcon name={effect.kind === "marked" ? "marked" : "shield"} size={18} />
                  <strong>{effect.magnitude}</strong></span
                >
              {/snippet}
              <p>
                {effect.kind === "marked"
                  ? "Next eligible attack gains " +
                    effect.magnitude +
                    " damage. Creator cannot consume it with the same action."
                  : "Temporary Block protects health."}
              </p>
              <small
                >{effect.kind === "marked"
                  ? `Expires after player actions on turn ${effect.expiresAfterTurn}`
                  : "Expires at the next enemy phase."}</small
              >
            </InspectPopover>
          {/each}
        </div>
      {/if}
    {/if}
  {/each}
</div>
