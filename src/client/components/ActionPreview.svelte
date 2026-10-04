<script lang="ts">
  import { actionEffects } from "../../game/combat/hero-actions.js";
  import type { HeroAction } from "../../shared/command-types.js";
  import { ACTION_NAMES } from "../../shared/display-names.js";
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import { actionLabel } from "../action-labels.js";
  import GameIcon from "./GameIcon.svelte";
  import InspectPopover from "./ui/InspectPopover.svelte";

  let { action, view }: { action: HeroAction | null; view: PlayerRoomView } = $props();
  let target = $derived(
    action && "targetHeroId" in action
      ? view.heroes.find((h) => h.id === action.targetHeroId)
      : view.hero,
  );
  let effects = $derived(
    view.hero
      ? actionEffects(view.hero, action, target ?? view.hero, view.skillStress.skirmish).filter(
          (e) =>
            e.stat !== "gold" ||
            !view.encounters.some((r) => r.pilfered.includes(view.hero?.id ?? "")),
        )
      : [],
  );
  const icons = {
    damage: "weapon",
    healing: "heart",
    barrier: "shield",
    stress: "stress",
    gold: "gold",
    bleed: "bandage",
  };
</script>
<div class="order-preview">
  {#if action}
    <strong
      >{ACTION_NAMES[action.kind]}{action && "targetHeroId" in action
        ? ` · ${view.players.find((p) => p.id === target?.playerId)?.name ?? "You"}`
        : action && "part" in action
          ? ` · ${action.part === "body" ? "Body" : "Seal"}`
          : ""}</strong
    >
  {/if}
  {#if action?.kind === "pilfer" && !effects.some((e) => e.stat === "gold")}
    <small>Gold already taken this fight</small>
  {/if}
  <InspectPopover label={actionLabel(action, view)}>
    {#snippet trigger()}
      <span class="hud-effects">
        {#each effects as effect}
          <span class="hud-effect"
            ><GameIcon name={icons[effect.stat]} />
            <span
              >{effect.stat === "bleed"
                ? "−"
                : effect.stat === "stress" && effect.value > 0
                  ? `+${effect.value}`
                  : effect.value < 0
                    ? `−${Math.abs(effect.value)}`
                    : effect.value}</span
            ><small
              >{effect.stat === "barrier"
                ? "protection · this turn"
                : effect.stat === "bleed"
                  ? "remove Bleed"
                  : effect.stat}</small
            ></span
          >
        {/each}
        {#if !effects.length}
          <small>Choose an action</small>
        {/if}
      </span>
    {/snippet}
    <strong>{actionLabel(action, view)}</strong>
    {#if action?.kind === "pilfer" && !effects.some((e) => e.stat === "gold")}
      <p>Gold already taken this fight.</p>
    {/if}
    {#if action?.kind === "use-item"}
      <p>Consumes this turn’s action and one item.</p>
    {/if}
  </InspectPopover>
</div>
