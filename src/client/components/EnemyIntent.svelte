<script lang="ts">
  import { onMount } from "svelte";
  import { publishedIntent } from "../../game/combat/enemy-patterns.js";
  import type { Hero, RoomEncounter } from "../../shared/game-types.js";
  import GameIcon from "./GameIcon.svelte";
  import InspectPopover from "./ui/InspectPopover.svelte";

  let { enemy, hero, turn }: { enemy: RoomEncounter; hero: Hero; turn: number } = $props();
  let intent = $derived(publishedIntent(enemy, [hero], turn));
  let target = $derived(intent.targets[0]);
  let element: HTMLDivElement;
  let width = $state(0),
    height = $state(0);
  let scale = $derived(Math.min(width / 1200, height / 580));
  let x = $derived((width - 1200 * scale) / 2 + 245 * scale);
  let top = $derived(Math.max(0, (height - 580 * scale) / 2 + 220 * scale - 44));
  let bottom = $derived(Math.min(height - 44, (height - 580 * scale) / 2 + 520 * scale - 22));
  onMount(() => {
    const observer = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
    });
    observer.observe(element);
    return () => observer.disconnect();
  });
</script>
<div
  class="enemy-readout"
  bind:this={element}
  style:--enemy-x={`${x}px`}
  style:--intent-top={`${top}px`}
  style:--effect-top={`${bottom}px`}
>
  <div class="intent-hud">
    <InspectPopover label={`Next move: ${intent.name}`}>
      {#snippet trigger()}
        <span class="intent-symbols">
          {#if target?.damage}
            <span><GameIcon name="weapon" /><strong>{target.damage}</strong></span>
          {/if}
          {#if target?.stress}
            <span><GameIcon name="stress" /><strong>+{target.stress}</strong></span>
          {/if}
          {#if target?.bleed}
            <span><GameIcon name="bleed" /><strong>2t</strong></span>
          {/if}
          {#if target?.injury}
            <span><GameIcon name={target.injury} /><strong>{target.injuryChance}%</strong></span>
          {/if}
          {#if intent.shieldGain}
            <span><GameIcon name="shield" /><strong>+{intent.shieldGain}</strong></span>
          {/if}
        </span>
      {/snippet}
      <strong>{intent.name}</strong>
      {#if target?.damage}
        <p>{target.damage} damage to this character.</p>
      {/if}
      {#if target?.stress}
        <p>Gain {target.stress} stress.</p>
      {/if}
      {#if target?.bleed}
        <p>
          Health damage adds Bleed: up to {hero.power} damage per turn for two turns, starting this
          turn.
        </p>
      {/if}
      {#if target?.injury}
        <p>{target.injuryChance}% chance of {target.injury} injury if health is lost.</p>
      {/if}
      {#if intent.shieldGain}
        <p>The enemy gains {intent.shieldGain} shield.</p>
      {/if}
      {#if intent.sealModifier}
        <p>Seal: {intent.sealModifier}. Break it to remove this modifier before the move.</p>
      {/if}
    </InspectPopover>
  </div>
  {#if enemy.weakHp === 0 && enemy.bodyHp > 0}
    <div class="enemy-applied-effects">
      <InspectPopover label="Seal broken">
        {#snippet trigger()}
          <span class="enemy-effect-chip"><GameIcon name="seal" size={18} /></span>
        {/snippet}
        <strong>Seal broken</strong>
        <p>
          Your crew disabled the seal's attack bonus.
          {enemy.kind === "boss"
            ? "A new boss phase can restore it."
            : "It stays broken for this fight."}
        </p>
      </InspectPopover>
    </div>
  {/if}
</div>
