<script lang="ts">
  import { actionKey } from "../../game/action-options.js";
  import type { HeroAction } from "../../shared/command-types.js";
  import type { PlayerRoomView } from "../../shared/view-types.js";

  let {
    options,
    view,
    selected,
    onselect,
    locked,
  }: {
    options: HeroAction[];
    view: PlayerRoomView;
    selected: HeroAction | null;
    onselect: (key: string) => void;
    locked: boolean;
  } = $props();
  function label(a: HeroAction) {
    if ("enemyId" in a)
      return (
        view.encounters.flatMap((e) => e.enemies).find((e) => e.id === a.enemyId)?.name ?? "Enemy"
      );
    if ("targetHeroId" in a) {
      const h = view.heroes.find((h) => h.id === a.targetHeroId);
      return `${view.players.find((p) => p.id === h?.playerId)?.name ?? "Character"} · ${h?.hp}/${h?.maxHp} health`;
    }
    return a.kind;
  }
</script>
{#if options.some((a) => "part" in a || "targetHeroId" in a)}
  <label for={`target-${view.self.id}`}>Target</label
  ><select
    id={`target-${view.self.id}`}
    disabled={locked}
    value={selected ? actionKey(selected) : ""}
    onchange={(e) => onselect(e.currentTarget.value)}
  >
    {#each options as a}
      <option value={actionKey(a)}>{label(a)}</option>
    {/each}
  </select>
{/if}
