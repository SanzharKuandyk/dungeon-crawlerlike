<script lang="ts">
  import type { RosterChange } from "../../shared/protocol.js";
  import type { HostRoomView } from "../../shared/view-types.js";
  import { changeRoster } from "../connection.js";
  import Button from "./ui/Button.svelte";

  let {
    view,
    open = $bindable(false),
    crewId = null,
    locked,
  }: {
    view: HostRoomView;
    open?: boolean;
    crewId?: string | null;
    locked: boolean;
  } = $props();
  let dialog = $state<HTMLDialogElement | null>(null);
  let confirmation = $state<{ change: RosterChange; name: string } | null>(null);
  $effect(() => {
    if (open && view.status === "lobby") {
      if (dialog && !dialog.open) dialog.showModal();
    } else {
      dialog?.close();
      confirmation = null;
    }
  });
  async function confirm() {
    if (!confirmation || locked) return;
    if (await changeRoster(confirmation.change)) confirmation = null;
  }
</script>
<dialog
  bind:this={dialog}
  class="roster-dialog"
  aria-label="Manage crews and players"
  onclose={() => (open = false)}
>
  <header>
    <h2>Crews & players</h2>
    <Button type="button" class="quiet" onclick={() => (open = false)}>Close</Button>
  </header>
  {#if confirmation}
    <section class="roster-confirm" aria-label="Confirm removal">
      <h3>
        {confirmation.change.action === "delete-crew" ? "Delete crew" : "Remove player"}:
        {confirmation.name}?
      </h3>
      <p>
        {confirmation.change.action === "delete-crew"
          ? "Members will choose a crew again."
          : "This player will leave the lobby and return to the join screen."}
      </p>
      <div>
        <Button type="button" class="primary" disabled={locked} onclick={() => void confirm()}>
          Confirm removal
        </Button><Button type="button" disabled={locked} onclick={() => (confirmation = null)}>
          Cancel
        </Button>
      </div>
    </section>
  {:else}
    {#each view.crews.filter((c) => crewId === null || c.id === crewId) as crew (crew.id)}
      <section class="roster-group">
        <header>
          <h3>{crew.symbol} · {crew.name}</h3>
          <Button
            type="button"
            disabled={locked}
            onclick={() =>
              (confirmation = {
                change: { action: "delete-crew", crewId: crew.id },
                name: crew.name,
              })}
          >
            Delete crew
          </Button>
        </header>
        {#each view.players.filter((p) => p.crewId === crew.id) as player (player.id)}
          <div class="roster-player">
            <span>{player.name}<small>{player.connected ? "Connected" : "Offline"}</small></span
            ><Button
              type="button"
              aria-label={`Remove ${player.name}`}
              disabled={locked}
              onclick={() =>
                (confirmation = {
                  change: { action: "remove-player", playerId: player.id },
                  name: player.name,
                })}
            >
              Remove
            </Button>
          </div>
        {/each}
      </section>
    {/each}
    {#if crewId === null}
      {#each view.players.filter((p) => !p.crewId) as player (player.id)}
        <div class="roster-player">
          <span>{player.name}<small>Choosing a crew</small></span
          ><Button
            type="button"
            aria-label={`Remove ${player.name}`}
            disabled={locked}
            onclick={() =>
              (confirmation = {
                change: { action: "remove-player", playerId: player.id },
                name: player.name,
              })}
          >
            Remove
          </Button>
        </div>
      {/each}
    {/if}
    {#if !view.players.length}
      <p>No players have joined yet.</p>
    {/if}
    {#if crewId !== null && !view.crews.some((c) => c.id === crewId)}
      <p>This crew has been removed.</p>
    {/if}
  {/if}
</dialog>
