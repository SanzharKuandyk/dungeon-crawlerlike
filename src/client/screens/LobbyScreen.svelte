<script lang="ts">
  import { teamColor } from "../../shared/palette.js";
  import type { RoomView } from "../../shared/view-types.js";
  import ClassPicker from "../components/ClassPicker.svelte";
  import { createCrew, joinCrew, joinPlayer } from "../connection.js";
  import { room } from "../room.svelte.js";

  let { view }: { view: RoomView } = $props();
  let nickname = $state(""),
    crewName = $state(""),
    busy = $state(false);
  let self = $derived(view.role === "player" ? view.self : null);
  async function join() {
    busy = true;
    await joinPlayer(nickname);
    busy = false;
  }
</script>
<section class="lobby">
  <p class="eyebrow">Room {view.code}</p>
  <h1>{self ? "Choose your crew" : "Join the expedition"}</h1>
  {#if !self}
    {#if view.status !== "lobby"}
      <p>This match has started. Reconnect using your original browser.</p>
    {:else}
      <form
        onsubmit={(e) => {
          e.preventDefault();
          void join();
        }}
      >
        <label for="nickname">Your nickname</label>
        <input id="nickname" bind:value={nickname} maxlength="24" required>
        <button
          type="submit"
          class="primary"
          disabled={busy || !nickname.trim() || room.status === "reconnecting"}
        >
          {busy ? "Joining…" : "Join as player"}
        </button>
      </form>
    {/if}
  {:else}
    <p>{self.name} · Crews of 1–4</p>
    {#if self.crewId}
      <div class="banner">
        You joined {view.crews.find((c) => c.id === self?.crewId)?.name}. Ready for launch.
      </div>
    {/if}
    {#if self.crewId && view.role === "player" && room.controller}
      <ClassPicker
        {view}
        controller={room.controller}
        locked={room.status !== "ready" || room.pending > 0}
      />
    {/if}
    <div class="lobby-crews">
      {#each view.crews as crew}
        {@const members = view.players.filter((p) => p.crewId === crew.id)}
        <button
          type="button"
          class="crew-option"
          style:--team={teamColor(crew.colorId).hex}
          disabled={members.length >= 4 || room.status !== "ready"}
          onclick={() => void joinCrew(crew.id)}
        >
          <span class="team-badge">{crew.symbol}</span><strong>{crew.name}</strong
          ><small>{members.length}/4 · {members.map((p) => p.name).join(", ")}</small>
        </button>
      {/each}
    </div>
    <form
      onsubmit={(e) => {
        e.preventDefault();
        void createCrew(crewName);
      }}
    >
      <label for="crew-name">Or create a crew</label>
      <div class="inline">
        <input id="crew-name" bind:value={crewName} maxlength="24" required>
        <button type="submit" disabled={!crewName.trim() || room.status !== "ready"}>
          Create crew
        </button>
      </div>
    </form>
  {/if}
</section>
