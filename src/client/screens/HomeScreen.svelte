<script lang="ts">
  import { createRoom } from "../connection.js";
  import { navigate } from "../navigation.js";
  import { room } from "../room.svelte.js";

  let code = $state(""),
    busy = $state(false);
  async function host() {
    busy = true;
    await createRoom();
    busy = false;
  }
</script>
<section class="home">
  <p class="eyebrow">Dungeon Expedition</p>
  <h1>Sector Siege</h1>
  <p>Descend together. Fight the darkness. Return richer than your rivals.</p>
  <div class="home-actions">
    <button type="button" class="primary" onclick={host} disabled={busy}>
      {busy ? "Creating…" : "Host a match"}
    </button>
    <form
      onsubmit={(event) => {
        event.preventDefault();
        if (code.trim()) navigate("room", code.trim().toUpperCase());
      }}
    >
      <label for="code">Room code</label>
      <div class="inline">
        <input
          id="code"
          bind:value={code}
          maxlength="6"
          placeholder="ABC123"
          autocapitalize="characters"
        ><button type="submit">Join room</button>
      </div>
    </form>
  </div>
  {#if room.testEnabled}
    <a class="text-link" href="#/test">Open solo playground →</a>
  {/if}
</section>
