<script lang="ts">
  import { CLASS_NAMES, CLASS_SKILLS } from "../../shared/display-names.js";
  import type { ArenaState } from "../../shared/game-types.js";
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import { actionLabel } from "../action-labels.js";
  import ActionIcon from "./ActionIcon.svelte";
  import GameIcon from "./GameIcon.svelte";
  import HeroEffects from "./HeroEffects.svelte";
  import InspectPopover from "./ui/InspectPopover.svelte";

  let { view, arena }: { view: PlayerRoomView; arena: ArenaState } = $props();
  let choosing = $derived(view.phase.kind === "combat");
</script>
<section class="crew-orders" aria-label="Crew actions">
  {#each view.crewInputs as member, index}
    {@const hero = arena.heroes.find((h) => h.playerId === member.playerId)}
    <div
      class:order-ready={member.ready || !choosing}
      class:own-order={member.playerId === view.self.id}
    >
      <InspectPopover
        label={`${member.name}: ${choosing && !member.ready ? "Choosing" : actionLabel(member.action, view, hero)}${member.plan?.kind === "hero" && member.plan.actions.length === 2 ? ` → ${actionLabel(member.plan.actions[1], view, hero)}` : ""}`}
      >
        {#snippet trigger()}
          <span class="order-portrait"
            ><ActionIcon kind={CLASS_SKILLS[hero?.classId ?? "knight"]} />
            <small>{member.playerId === view.self.id ? "YOU" : String(index + 1)}</small></span
          >
          <span class="order-choice">
            {#if member.action}
              <ActionIcon kind={member.action.kind} />
              {#if member.plan?.kind === "hero" && member.plan.actions.length === 2}
                <ActionIcon kind={member.plan.actions[1].kind} />
              {/if}
            {:else}
              <GameIcon name="clock" size={16} />
            {/if}
            {#if choosing && member.ready}
              <GameIcon name="ready" size={14} />
            {/if}
          </span>
        {/snippet}
        <strong>{member.name}{member.playerId === view.self.id ? " · You" : ""}</strong>
        {#if hero}
          <p>
            {CLASS_NAMES[hero.classId]}
            · {hero.hp}/{hero.maxHp}
            health · {hero.stress}/10 stress
          </p>
        {/if}
        <p>{actionLabel(member.action, view, hero)}</p>
        {#if member.plan?.kind === "hero" && member.plan.actions.length === 2}
          <p>Action 2 · {actionLabel(member.plan.actions[1], view, hero)}</p>
        {/if}
        <small
          >{choosing
            ? member.ready
              ? "Ready · waiting for the crew"
              : "Still choosing"
            : "This turn’s action"}</small
        >
        {#if hero}
          <HeroEffects {hero} />
        {/if}
      </InspectPopover>
    </div>
  {/each}
</section>
