<script lang="ts">
  import { ACTION_NAMES } from "../../shared/display-names.js";
  import type { ArenaState } from "../../shared/game-types.js";
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import { actionLabel } from "../action-labels.js";
  import ActionIcon from "./ActionIcon.svelte";
  import GameIcon from "./GameIcon.svelte";
  import InspectPopover from "./ui/InspectPopover.svelte";

  let { view, arena }: { view: PlayerRoomView; arena: ArenaState } = $props();
  let choosing = $derived(view.phase.kind === "combat");
</script>
<section class="crew-orders" aria-label="Crew actions">
  {#each view.crewInputs as member}
    {@const hero = arena.heroes.find((h) => h.playerId === member.playerId)}
    {@const targetId =
      member.action && "targetHeroId" in member.action ? member.action.targetHeroId : null}
    {@const target =
      member.action && "part" in member.action
        ? member.action.part === "body"
          ? "Body"
          : "Seal"
        : member.action && "targetHeroId" in member.action
          ? (view.players.find(
              (p) => p.id === arena.heroes.find((h) => h.id === targetId)?.playerId,
            )?.name ?? "Ally")
          : ""}
    <div
      class:order-ready={member.ready || !choosing}
      class:own-order={member.playerId === view.self.id}
    >
      <InspectPopover
        label={`${member.name}: ${choosing && !member.ready ? "Choosing" : actionLabel(member.action, view, hero)}`}
      >
        {#snippet trigger()}
          <span class="order-member">{member.playerId === view.self.id ? "YOU" : member.name}</span>
          <span class="order-choice">
            {#if member.action}
              <ActionIcon kind={member.action.kind} />
              <span>{target || ACTION_NAMES[member.action.kind]}</span>
            {:else}
              <GameIcon name="clock" size={16} /><span>Choosing</span>
            {/if}
            {#if choosing && member.ready}
              <GameIcon name="ready" size={14} />
            {/if}
          </span>
        {/snippet}
        <strong>{member.name}{member.playerId === view.self.id ? " · You" : ""}</strong>
        <p>{actionLabel(member.action, view, hero)}</p>
        <small
          >{choosing
            ? member.ready
              ? "Ready · waiting for the crew"
              : "Still choosing"
            : "This turn’s action"}</small
        >
      </InspectPopover>
    </div>
  {/each}
</section>
