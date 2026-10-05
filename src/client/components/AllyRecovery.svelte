<script lang="ts">
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import type { PlayerController } from "../player-controller.js";
  import GameIcon from "./GameIcon.svelte";
  import Button from "./ui/Button.svelte";
  import Dialog from "./ui/Dialog.svelte";

  let {
    view,
    controller,
    locked,
  }: { view: PlayerRoomView; controller: PlayerController; locked: boolean } = $props();
  let target = $state<string | null>(null),
    open = $state(false),
    error = $state(""),
    busy = $state(false);
  let crew = $derived(view.crews.find((c) => c.id === view.self.crewId));
  let fallen = $derived(
    view.heroes.filter((h) => h.crewId === view.self.crewId && h.status === "dead"),
  );
  let node = $derived(view.expeditionMap?.nodes.find((n) => n.id === crew?.mapPosition?.nodeId));
  let safe = $derived(
    view.recoveryAvailable ||
      ["result", "floor-result"].includes(view.phase.kind) ||
      node?.kind === "camp" ||
      node?.kind === "merchant" ||
      node?.kind === "shrine",
  );
  let ally = $derived(fallen.find((h) => h.id === target));
  async function revive() {
    if (!ally) return;
    busy = true;
    error = "";
    const ok = await controller.revive(
      ally.id,
      (crew?.economy.gold ?? 0) >= 2 * ally.power ? "gold" : "debt",
    );
    busy = false;
    if (ok) open = false;
    else error = controller.error;
  }
</script>
{#if fallen.length && safe}
  <section class="ally-recovery" aria-label="Crew recovery">
    {#if view.hero?.status === "alive"}
      {#each fallen as hero}
        <Button
          disabled={locked || view.decisionReady}
          onclick={() => {
            target = hero.id;
            open = true;
          }}
          ><GameIcon name="revive" />Revive
          {view.players.find((p) => p.id === hero.playerId)?.name}{view.revivalRequests.includes(
            hero.id,
          )
            ? " · asked for help"
            : ""}</Button
        >
      {/each}
    {:else if fallen.length < view.heroes.filter((h) => h.crewId === view.self.crewId).length}
      <p>Fallen · a living teammate can revive you here.</p>
      <Button
        disabled={locked ||
          view.decisionReady ||
          view.revivalRequests.includes(view.hero?.id ?? "")}
        onclick={() => void controller.rescue()}
        >{view.revivalRequests.includes(view.hero?.id ?? "")
          ? "Teammates notified"
          : "Request revival"}</Button
      >
    {:else}
      <p>Entire crew fallen · call an external rescue in Crew decision.</p>
    {/if}
  </section>
{/if}
<Dialog bind:open title="Revive teammate">
  {#if ally}
    <p>
      {view.players.find((p) => p.id === ally.playerId)?.name}
      returns with {Math.ceil(ally.maxHp / 2)} health and
      {Math.min(9, Math.max(3, ally.stress))}
      stress.
    </p>
    <p>
      {(crew?.economy.gold ?? 0) >= 2 * ally.power
        ? `Pay ${2 * ally.power} shared gold. Unused shopping budgets adjust fairly.`
        : `No gold available: add ${2 * ally.power} crew rescue debt.`}
    </p>
    <p>Equipment, Blessings, injuries and curses remain.</p>
  {/if}
  {#if error}
    <p role="alert">{error}</p>
  {/if}
  {#snippet footer()}
    <Button onclick={() => (open = false)}>Cancel</Button
    ><Button primary pending={busy} disabled={locked || !ally} onclick={() => void revive()}
      >Revive ally</Button
    >
  {/snippet}
</Dialog>
