<script lang="ts">
  import type { GameEvent } from "../../shared/event-types.js";
  import type { ArenaState } from "../../shared/game-types.js";
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import GameIcon from "./GameIcon.svelte";

  let {
    view,
    arena,
    cursor,
    message,
  }: { view: PlayerRoomView; arena: ArenaState; cursor: number; message: string } = $props();
  let before = $derived(view.before);
  let explorationOutcome = $derived(
    view.events.find(
      (e) => e.cause === "event-outcome" && e.actor === view.hero?.id && e.sequence <= cursor,
    ),
  );
  let coinOutcome = $derived(
    explorationOutcome?.kind === "hero" ? explorationOutcome.exploration : null,
  );
  let hero = $derived(arena.heroes.find((h) => h.playerId === view.self.id));
  let oldHero = $derived(before?.heroes.find((h) => h.playerId === view.self.id));
  let visible = $derived(
    view.events
      .filter(
        (e) =>
          e.sequence <= cursor &&
          (e.kind === "effect" || ["heal", "death", "panic", "blessing"].includes(e.cause)),
      )
      .slice(-4),
  );
  function name(id: string) {
    const target = arena.heroes.find((h) => h.id === id);
    return target
      ? target.playerId === view.self.id
        ? "You"
        : (view.players.find((p) => p.id === target.playerId)?.name ?? "Ally")
      : "Enemy";
  }
  function detail(event: GameEvent) {
    if (event.kind !== "effect") return event.message;
    const e = event.effect;
    if (e.type === "hit")
      return `${name(e.target)} −${e.damage} HP${e.blocked ? ` · ${e.blocked} blocked` : ""}`;
    if (e.type === "barrier" || e.type === "ward") return `${name(e.target)} +${e.amount} guard`;
    return event.message;
  }
</script>
<section class="battle-outcome" aria-label="Turn outcome" aria-live="polite">
  {#if view.phase.kind === "event-reveal"}
    {#if coinOutcome?.landing}
      <div class="coin-outcome">
        <span class="landed-coin" aria-hidden="true"><GameIcon name="gold" size={32} /></span>
        <strong
          >{coinOutcome.landing === "heads" ? "Heads" : "Tails"}
          · {coinOutcome.success ? "Won" : "Lost"}</strong
        >
      </div>
    {:else if view.exploration?.choices[view.self.id]?.kind === "coin"}
      <div class="coin-outcome">
        <span class="landed-coin tossing-coin" aria-hidden="true"
          ><GameIcon name="gold" size={32} /></span
        ><strong>Tossing…</strong>
      </div>
    {/if}
    <p>{explorationOutcome?.message ?? "Resolving your choice…"}</p>
  {/if}
  <strong
    >{view.phase.kind === "combat-reveal"
      ? "Resolving turn"
      : view.phase.kind === "combat-recap"
        ? "Turn complete"
        : "Encounter update"}</strong
  >
  {#if hero && oldHero}
    <div class="outcome-vitals">
      <span
        ><GameIcon name="heart" />{hero.hp}/{hero.maxHp}<small
          >{hero.hp - oldHero.hp > 0 ? "+" : ""}{hero.hp - oldHero.hp}
          this turn</small
        ></span
      >
      <span
        ><GameIcon name="stress" />{hero.stress}/10<small
          >{hero.stress - oldHero.stress > 0 ? "+" : ""}{hero.stress - oldHero.stress}
          stress</small
        ></span
      >
    </div>
  {/if}
  <ul>
    {#each visible as event (event.id)}
      <li>
        <GameIcon
          name={event.kind === "effect" &&
          (event.effect.type === "barrier" || event.effect.type === "ward")
            ? "shield"
            : event.cause === "heal"
              ? "heart"
              : "weapon"}
          size={16}
        /><span>{detail(event)}</span>
      </li>
    {/each}
  </ul>
  <small
    >{visible.length
      ? view.phase.kind === "combat-reveal"
        ? "Actions are locked for this turn."
        : "The next choice opens automatically."
      : message}</small
  >
</section>
