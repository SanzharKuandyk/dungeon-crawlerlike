<script lang="ts">
  import type { RoomView } from "../../shared/view-types.js";
  import type { PlayerController } from "../player-controller.js";
  import GameIcon from "./GameIcon.svelte";
  import RoundTimer from "./RoundTimer.svelte";
  import Button from "./ui/Button.svelte";

  let {
    view,
    controller = null,
    locked = true,
  }: { view: RoomView; controller?: PlayerController | null; locked?: boolean } = $props();
  let siege = $derived(view.siege),
    hero = $derived(view.role === "player" ? view.hero : null);
</script>
{#if siege}
  <section class="trial-panel" aria-label="Class siege">
    <header class="section-heading">
      <strong>Class siege · round {siege.round}/3</strong><RoundTimer {view} />
    </header>
    <p>Every crew helps. Fill all three meters to break through.</p>
    <div class="siege-meters">
      {#each ["attack", "protect", "supply"] as role}
        <div>
          <GameIcon
            name={role === "attack" ? "weapon" : role === "protect" ? "shield" : "backpack"}
          /><strong>{role}</strong
          ><progress
            value={siege.meters[role as "attack"]}
            max={siege.goals[role as "attack"]}
          ></progress><span>{siege.meters[role as "attack"]}/{siege.goals[role as "attack"]}</span>
        </div>
      {/each}
    </div>
    {#if siege.phase === "choice" && hero}
      <div class="action-tabs">
        {#each ["attack", "protect", "supply"] as role}
          <Button
            disabled={locked || (hero.status === "dead" && role !== "supply")}
            aria-pressed={siege.choices[hero.playerId] === role}
            onclick={() => void controller?.siege(role as "attack" | "protect" | "supply")}
            >{role}
            · +{2 * hero.power}</Button
          >
        {/each}
      </div>
    {:else if siege.settled}
      <h2>
        {siege.success
          ? "Breakthrough! Each crew earns 12 gold and supplies."
          : "The gate holds. Everyone gains 2 stress."}
      </h2>
    {/if}
    <section class="shared-activity" aria-label="Crew contributions">
      {#each view.crews as crew}
        {@const members = view.players.filter((player) => player.crewId === crew.id)}
        <details>
          <summary>
            <strong>{crew.symbol} · {crew.name}</strong>
            <span class="contribution-counts">
              {#each ["attack", "protect", "supply"] as role}
                <span
                  role="img"
                  aria-label={`${role}: ${members.filter((player) => siege.choices[player.id] === role).length}`}
                >
                  <GameIcon
                    name={role === "attack" ? "weapon" : role === "protect" ? "shield" : "backpack"}
                    size={16}
                  />
                  {members.filter((player) => siege.choices[player.id] === role).length}
                </span>
              {/each}
            </span>
          </summary>
          {#each members as player}
            <div class="member-contribution">
              {player.name}<span>{siege.choices[player.id] ?? "Choosing"}</span>
            </div>
          {/each}
        </details>
      {/each}
    </section>
  </section>
{/if}

<style>
  .siege-meters > div {
    display: grid;
    grid-template-columns: 20px 64px 1fr auto;
    gap: var(--space-1);
    align-items: center;
  }
  .siege-meters progress {
    width: 100%;
    accent-color: var(--primary);
  }
  .shared-activity {
    display: grid;
    gap: var(--space-2);
  }
  .shared-activity details {
    border-top: 1px solid var(--border);
  }
  .shared-activity summary {
    min-height: 44px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-2);
  }
  .contribution-counts,
  .contribution-counts > span {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }
  .contribution-counts > span {
    gap: var(--space-1);
  }
  .member-contribution {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    padding: var(--space-1) 0;
    overflow-wrap: anywhere;
  }
</style>
