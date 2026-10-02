<script lang="ts">
  import { onMount } from "svelte";
  import { Toaster } from "svelte-sonner";
  import { NEUTRALS } from "../shared/palette.js";
  import { enableAudio } from "./audio-cues.js";
  import ConnectionBanner from "./components/ConnectionBanner.svelte";
  import { checkHealth, closeRoom, openRoom } from "./connection.js";
  import { readRoute } from "./navigation.js";
  import { preferences, room } from "./room.svelte.js";
  import HomeScreen from "./screens/HomeScreen.svelte";
  import HostScreen from "./screens/HostScreen.svelte";
  import LobbyScreen from "./screens/LobbyScreen.svelte";
  import PlayerScreen from "./screens/PlayerScreen.svelte";
  import ProjectorScreen from "./screens/ProjectorScreen.svelte";
  import TestScreen from "./screens/TestScreen.svelte";

  let route = $state(readRoute());
  function loadRoute() {
    route = readRoute();
    if (route.code)
      openRoom(
        route.code,
        route.screen === "host" ? "host" : route.screen === "board" ? "projector" : "player",
      );
    else closeRoom();
  }
  onMount(() => {
    void checkHealth();
    loadRoute();
    window.addEventListener("hashchange", loadRoute);
    return () => {
      window.removeEventListener("hashchange", loadRoute);
      closeRoom();
    };
  });
</script>
<div
  class="app-shell"
  class:projector={route.screen === "board"}
  class:battle-play={route.screen === "room" &&
    room.view?.role === "player" &&
    room.view.status !== "finished" &&
    room.view.status !== "lobby"}
  style:--background={NEUTRALS.background}
  style:--surface={NEUTRALS.surface}
  style:--text={NEUTRALS.text}
  style:--muted={NEUTRALS.muted}
  style:--border={NEUTRALS.border}
>
  <header class="topbar">
    <a class="brand" href="#/">Sector Siege</a>
    <details class="preferences">
      <summary>Settings</summary>
      <div>
        <button
          type="button"
          class="quiet"
          onclick={() => {
            preferences.muted = !preferences.muted;
            if (!preferences.muted) enableAudio();
            localStorage.setItem("heist-muted", String(preferences.muted));
          }}
        >
          Sound {preferences.muted ? "off" : "on"}
        </button>
        <button
          type="button"
          class="quiet"
          aria-pressed={preferences.reducedMotion}
          onclick={() => {
            preferences.reducedMotion = !preferences.reducedMotion;
            localStorage.setItem("heist-motion", preferences.reducedMotion ? "reduced" : "full");
          }}
        >
          Reduce motion
        </button>
      </div>
    </details>
  </header>
  <ConnectionBanner
    active={route.screen !== "home" && (route.screen !== "test" || room.view !== null)}
  />
  <main>
    {#if route.screen === "home"}
      <HomeScreen />
    {:else if route.screen === "test"}
      <TestScreen />
    {:else if !room.view}
      <section class="panel"><p>Connecting…</p></section>
    {:else if route.screen === "host"}
      {#if room.view.role === "host"}
        <HostScreen view={room.view} />
      {:else}
        <section class="panel">Open this page in the browser that created the room.</section>
      {/if}
    {:else if route.screen === "board"}
      <ProjectorScreen view={room.view} />
    {:else if room.view.status === "lobby" || room.view.role !== "player"}
      <LobbyScreen view={room.view} />
    {:else}
      {#if room.controller}
        <PlayerScreen
          view={room.view}
          controller={room.controller}
          connected={room.status === "ready"}
          pending={room.pending}
        />
      {/if}
    {/if}
  </main>
  <Toaster position="bottom-right" visibleToasts={3} closeButton />
</div>
