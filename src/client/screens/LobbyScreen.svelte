<script lang="ts">
  import { CLASS_NAMES } from "../../shared/display-names.js";
  import { teamColor } from "../../shared/palette.js";
  import type { RoomView } from "../../shared/view-types.js";
  import ClassPicker from "../components/ClassPicker.svelte";
  import Button from "../components/ui/Button.svelte";
  import { createCrew, joinCrew, joinPlayer, recoverPlayer } from "../connection.js";
  import { room } from "../room.svelte.js";

  let { view }: { view: RoomView } = $props();
  let recoveryCode = $state("");
  let nickname = $state(""),
    crewName = $state(""),
    busy = $state(false),
    changingCrew = $state(false),
    previousCrewId = $state<string | null>(null);
  let self = $derived(view.role === "player" ? view.self : null);
  let ownCrew = $derived(view.crews.find((crew) => crew.id === self?.crewId));
  let choosingCrew = $derived(!ownCrew || changingCrew);
  let locked = $derived(
    room.status !== "ready" || room.pending > 0 || (view.role === "player" && view.readOnly),
  );
  $effect(() => {
    const crewId = self?.crewId ?? null;
    if (crewId !== previousCrewId) {
      previousCrewId = crewId;
      changingCrew = false;
      crewName = "";
    }
  });
  async function join() {
    busy = true;
    await joinPlayer(nickname);
    busy = false;
  }
</script>
<section class="lobby">
  <p class="eyebrow">Room {view.code}</p>
  <h1>
    {!self
      ? "Join the expedition"
      : choosingCrew
        ? "Choose your crew"
        : `Your crew: ${ownCrew?.name}`}
  </h1>
  {#if !self}
    <details>
      <summary>Reconnect on a replacement device</summary>
      <form
        onsubmit={(e) => {
          e.preventDefault();
          void recoverPlayer(recoveryCode.trim().toUpperCase());
        }}
      >
        <label for="player-recovery-code">Recovery code from host</label>
        <input
          id="player-recovery-code"
          bind:value={recoveryCode}
          maxlength="12"
          autocomplete="off"
        ><Button type="submit" disabled={recoveryCode.trim().length !== 12}>
          Recover character
        </Button>
      </form>
    </details>
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
        <Button
          type="submit"
          class="primary"
          disabled={busy || !nickname.trim() || room.status === "reconnecting"}
        >
          {busy ? "Joining…" : "Join as player"}
        </Button>
      </form>
    {/if}
  {:else}
    <p>Playing as <strong>{self.name}</strong></p>
    {#if ownCrew}
      <section
        class="current-crew"
        style:--team={teamColor(ownCrew.colorId).hex}
        aria-label="Your crew"
      >
        <header>
          <span class="team-badge">{ownCrew.symbol}</span>
          <h2>{ownCrew.name}</h2>
          <span>{ownCrew.playerIds.length}/4 players</span>
        </header>
        <ul>
          {#each view.players.filter((p) => p.crewId === ownCrew.id) as member (member.id)}
            <li>
              <strong>{member.name}{member.id === self.id ? " (you)" : ""}</strong>
              <span>{CLASS_NAMES[member.classId]}</span>
            </li>
          {/each}
        </ul>
        <Button
          type="button"
          class="quiet"
          disabled={locked}
          onclick={() => (changingCrew = !changingCrew)}
        >
          {changingCrew ? "Keep current crew" : "Change crew"}
        </Button>
      </section>
    {/if}
    {#if !choosingCrew}
      <p class="banner" role="status">Choose your character while the expedition gathers.</p>
      {#if view.role === "player" && room.controller}
        <ClassPicker {view} controller={room.controller} {locked} />
      {/if}
    {:else}
      <p>
        {ownCrew
          ? "Choose another crew or create a new one. You stay in your current crew until you switch."
          : "Join a crew below, or create one for your group. Up to 4 players per crew."}
      </p>
      <div class="lobby-crews">
        {#each view.crews as crew}
          {@const members = view.players.filter((p) => p.crewId === crew.id)}
          <Button
            type="button"
            class="crew-option"
            style={`--team:${teamColor(crew.colorId).hex}`}
            disabled={members.length >= 4 || locked || crew.id === self.crewId}
            onclick={() => void joinCrew(crew.id)}
          >
            <span class="team-badge">{crew.symbol}</span><strong>{crew.name}</strong
            ><small>{members.length}/4 · {members.map((p) => p.name).join(", ")}</small>
            <small
              >{crew.id === self.crewId
                ? "Your current crew"
                : members.length >= 4
                  ? "Full"
                  : `${4 - members.length} places available`}</small
            >
          </Button>
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
          <Button type="submit" disabled={!crewName.trim() || locked}>Create crew</Button>
        </div>
      </form>
    {/if}
  {/if}
</section>
