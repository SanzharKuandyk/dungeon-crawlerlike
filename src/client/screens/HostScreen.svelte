<script lang="ts">
  import QRCode from "qrcode";
  import { onMount } from "svelte";
  import { NEUTRALS } from "../../shared/palette.js";
  import type { HostRoomView } from "../../shared/view-types.js";
  import HostRoster from "../components/HostRoster.svelte";
  import HostStatusPanel from "../components/HostStatusPanel.svelte";
  import HostToolbar from "../components/HostToolbar.svelte";
  import PlayerRecoveryDialog from "../components/PlayerRecoveryDialog.svelte";
  import Button from "../components/ui/Button.svelte";
  import { room } from "../room.svelte.js";
  import { browserStorage } from "../storage.js";
  import ProjectorScreen from "./ProjectorScreen.svelte";

  let { view }: { view: HostRoomView } = $props();
  let base = $state(location.origin),
    qr = $state("");
  let joinUrl = $derived(`${base.replace(/\/$/, "")}/#/room/${view.code}`);
  let locked = $derived(room.status !== "ready" || view.readOnly || room.pending > 0);
  let waiting = $derived(view.players.filter((p) => !p.crewId));
  let recoveryPlayer = $state<string | null>(null);
  let controller = $derived(room.hostController);
  let rosterOpen = $state(false),
    rosterCrew = $state<string | null>(null);
  $effect(() => {
    let cancelled = false;
    void QRCode.toDataURL(joinUrl, {
      margin: 1,
      width: 180,
      color: { dark: NEUTRALS.text, light: NEUTRALS.surface },
    })
      .then((value) => {
        if (!cancelled) qr = value;
      })
      .catch(() => {
        qr = "";
      });
    return () => {
      cancelled = true;
    };
  });
  onMount(() => (base = browserStorage.getItem(`siege-join-base:${view.code}`) ?? location.origin));
</script>
<section class="host-screen">
  <div class="host-bar">
    <div>
      <h1>Room {view.code}</h1>
      <small>{view.crews.length} crews · {view.players.length} characters</small>
    </div>
    <details class="invite-menu">
      <summary>Invite</summary>
      <section class="invite-content">
        {#if qr}
          <img src={qr} alt="Scan to join" width="180" height="180">
        {/if}
        <a href={joinUrl}>{joinUrl}</a>
        <label for="join-base">Join base URL</label>
        <input
          id="join-base"
          type="url"
          bind:value={base}
          onchange={() => browserStorage.setItem(`siege-join-base:${view.code}`, base)}
        >
      </section>
    </details>
    {#if controller}
      <HostToolbar {view} {controller} {locked} />
    {/if}
    {#if view.status === "lobby"}
      <a class="button" href={`#/room/${view.code}`} target="_blank" rel="noopener"
        >Join as player ↗</a
      >
      <Button
        type="button"
        disabled={locked}
        onclick={() => {
          rosterCrew = null;
          rosterOpen = true;
        }}
      >
        Manage crews
      </Button>
    {/if}
  </div>
  {#if waiting.length}
    <p class="waiting-crews">{waiting.map((p) => p.name).join(", ")} · choosing a crew</p>
  {/if}
  <HostStatusPanel {view} />
  <ProjectorScreen
    {view}
    embedded
    hostController={controller}
    onrecover={(id) => (recoveryPlayer = id)}
    onmanage={(id) => {
      rosterCrew = id;
      rosterOpen = true;
    }}
  />
  {#if recoveryPlayer && controller}
    <PlayerRecoveryDialog
      playerId={recoveryPlayer}
      name={view.players.find((p) => p.id === recoveryPlayer)?.name ?? "Player"}
      {controller}
      onclose={() => (recoveryPlayer = null)}
    />
  {/if}
  <HostRoster {view} bind:open={rosterOpen} crewId={rosterCrew} {locked} />
</section>
