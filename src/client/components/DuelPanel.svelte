<script lang="ts">
  import { CLASS_NAMES } from "../../shared/display-names.js";
  import type { DuelView } from "../../shared/duel-types.js";
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import type { PlayerController } from "../player-controller.js";
  import Button from "./ui/Button.svelte";

  let {
    view,
    duel,
    controller,
    locked,
  }: { view: PlayerRoomView; duel: DuelView; controller: PlayerController; locked: boolean } =
    $props();
  let target = $state("");
  let rivals = $derived(
    view.heroes.filter(
      (hero) =>
        duel.crewIds.includes(hero.crewId) &&
        hero.crewId !== view.self.crewId &&
        hero.status === "alive",
    ),
  );
</script>
<section class="duel-controls">
  <strong>Duel · exchange {duel.turn}/3</strong>
  <small
    >{duel.readyCount}/{duel.memberCount}
    ready · health cannot fall below 1 · attacks spill to other rivals</small
  >
  {#if duel.npc && duel.phase === "choice"}
    <p>
      Champion intent:
      {duel.turn === 1
        ? `Strike · ${2 * (view.hero?.power ?? 0)} damage`
        : duel.turn === 2
          ? "Guard · 24 barrier"
          : `Feint · ${view.hero?.power ?? 0} damage, ignores Guard`}
    </p>
  {/if}
  {#if duel.phase === "choice" && view.hero?.status === "alive"}
    <label
      >Target<select bind:value={target} disabled={locked}>
        <option value="">Choose a rival</option>
        {#if duel.npc}
          <option value="champion">Arena champion · {duel.npc.hp} HP</option>
        {/if}
        {#each rivals as hero}
          <option value={hero.id}>
            {view.players.find((player) => player.id === hero.playerId)?.name ??
              CLASS_NAMES[hero.classId]}
            · {hero.hp} HP
          </option>
        {/each}
      </select></label
    >
    <div class="duel-actions">
      <Button
        type="button"
        disabled={locked || !target}
        onclick={() =>
          void controller.duelAction(duel.id, { kind: "strike", targetHeroId: target })}
      >
        Strike · {2 * view.hero.power} damage
      </Button>
      <Button
        type="button"
        disabled={locked}
        onclick={() => void controller.duelAction(duel.id, { kind: "guard" })}
      >
        Guard · block {2 * view.hero.power}
      </Button>
      <Button
        type="button"
        disabled={locked || !target}
        onclick={() => void controller.duelAction(duel.id, { kind: "feint", targetHeroId: target })}
      >
        Feint · {view.hero.power} · ignores guard
      </Button>
    </div>
    <small
      >{duel.ownAction
        ? `Confirmed: ${duel.ownAction.kind}`
        : "Missing actions become Guard. Equipment is reserved for dungeon fights."}</small
    >
  {:else}
    <p>Watch the exchange.</p>
  {/if}
</section>
