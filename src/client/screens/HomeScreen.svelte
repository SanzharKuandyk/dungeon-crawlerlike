<script lang="ts">
  import GameIcon from "../components/GameIcon.svelte";
  import Button from "../components/ui/Button.svelte";
  import FormField from "../components/ui/FormField.svelte";
  import { createRoom } from "../connection.js";
  import { navigate } from "../navigation.js";
  import { recoverHost } from "../recovery-client.js";
  import { room } from "../room.svelte.js";

  let code = $state("");
  let busy = $state(false);
  let recoveryBusy = $state(false);
  let recoveryKey = $state("");
  let recoveryRoom = $state("");

  async function host() {
    if (busy) return;
    busy = true;
    try {
      await createRoom();
    } finally {
      busy = false;
    }
  }
  async function recover() {
    if (recoveryBusy) return;
    recoveryBusy = true;
    try {
      await recoverHost(recoveryRoom.trim().toUpperCase(), recoveryKey.trim());
    } finally {
      recoveryBusy = false;
    }
  }
</script>
<section class="home">
  <header class="home-heading">
    <GameIcon name="boss" size={48} />
    <h1>Dungeon Crawlerlike</h1>
    <p>Enter the dungeon. Bring your crew. Defeat three bosses.</p>
  </header>

  <div class="home-entry">
    <section class="home-card" aria-labelledby="host-heading">
      <div class="home-card-heading">
        <h2 id="host-heading">Host an expedition</h2>
        <p>Create a room and invite your crews.</p>
      </div>
      <Button primary pending={busy} onclick={() => void host()}>
        {busy ? "Creating room…" : "Host a match"}
      </Button>
    </section>

    <form
      class="home-card"
      aria-labelledby="join-heading"
      onsubmit={(event) => {
        event.preventDefault();
        if (code.trim().length === 6) navigate("room", code.trim().toUpperCase());
      }}
    >
      <div class="home-card-heading">
        <h2 id="join-heading">Join your crew</h2>
        <p>Enter the code shared by your host.</p>
      </div>
      <FormField id="code" label="Room code">
        <input
          id="code"
          class="home-room-code"
          bind:value={code}
          maxlength="6"
          minlength="6"
          placeholder="ABC123"
          autocapitalize="characters"
          autocomplete="off"
          spellcheck="false"
          required
        >
      </FormField>
      <Button type="submit" disabled={code.trim().length !== 6}>Join room</Button>
    </form>
  </div>

  <details class="home-recovery">
    <summary>Recover a hosted room</summary>
    <form
      onsubmit={(event) => {
        event.preventDefault();
        void recover();
      }}
    >
      <p>Only needed if you lost access to an existing room.</p>
      <FormField id="recover-host-code" label="Recover hosted room">
        <input
          id="recover-host-code"
          bind:value={recoveryRoom}
          maxlength="6"
          minlength="6"
          placeholder="Room code"
          autocapitalize="characters"
          autocomplete="off"
          required
        >
      </FormField>
      <FormField id="recover-host-key" label="Host recovery key">
        <input
          id="recover-host-key"
          type="password"
          bind:value={recoveryKey}
          autocomplete="off"
          placeholder="Recovery key"
          required
        >
        <small>On the server laptop, copy the key from <code>data/host-access.key</code>.</small>
      </FormField>
      <Button
        type="submit"
        disabled={recoveryBusy ||
          recoveryKey.trim().length !== 64 ||
          recoveryRoom.trim().length !== 6}
      >
        {recoveryBusy ? "Recovering…" : "Recover host access"}
      </Button>
    </form>
  </details>
  {#if room.testEnabled}
    <a class="text-link" href="#/test">Open developer playground →</a>
  {/if}
</section>
