<script lang="ts">
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import type { PlayerController } from "../player-controller.js";
  import Button from "./ui/Button.svelte";

  let {
    view,
    controller,
    locked,
  }: { view: PlayerRoomView; controller: PlayerController; locked: boolean } = $props();
  let target = $state("");
  let targets = $derived(view.legalActions.filter((a) => a.kind === "ward"));
  let chosen = $derived(targets.find((a) => a.targetHeroId === target) ?? targets[0]);
</script>
<section class="decision-card">
  <h2>{view.hero?.status === "dead" ? "Spirit shield" : "Send aid from camp"}</h2>
  <p>Protect a living character. Shields cannot restore life.</p>
  {#if chosen}
    <label for="spirit-target">Character</label
    ><select
      id="spirit-target"
      value={chosen.targetHeroId}
      disabled={locked}
      onchange={(e) => (target = e.currentTarget.value)}
    >
      {#each targets as a}
        {@const h = view.heroes.find((h) => h.id === a.targetHeroId)}
        <option value={a.targetHeroId}>
          {view.crews.find((c) => c.id === h?.crewId)?.name}
          · {view.players.find((p) => p.id === h?.playerId)?.name} · {h?.hp}/{h?.maxHp}
        </option>
      {/each}
    </select><Button
      type="button"
      class="primary"
      disabled={locked}
      onclick={() => chosen && void controller.action(chosen)}
    >
      Shield ally
    </Button>
  {:else}
    <p>No characters are currently fighting.</p>
  {/if}
  <small>{view.selectedAction?.kind === "ward" ? "Shield confirmed" : "No shield chosen"}</small>
</section>
