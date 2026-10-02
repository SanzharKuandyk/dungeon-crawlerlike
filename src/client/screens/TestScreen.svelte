<script lang="ts">
  import { onDestroy } from "svelte";
  import type { TestScenario } from "../../shared/protocol.js";
  import ClassPicker from "../components/ClassPicker.svelte";
  import { room } from "../room.svelte.js";
  import { createTestController } from "../test-mode/test-controller.svelte.js";
  import PlayerScreen from "./PlayerScreen.svelte";
  import ProjectorScreen from "./ProjectorScreen.svelte";

  const test = createTestController();
  let scenario = $state<TestScenario>("fresh");
  onDestroy(() => test.destroy());
</script>
{#if !room.testEnabled}
  <section class="panel">
    <h1>Playground disabled</h1>
    <p>Launch with <code>--test</code>.</p>
  </section>
{:else if !test.state.actors.length}
  <section class="home">
    <p class="eyebrow">Dungeon playground</p>
    <h1>Every character. Every crew.</h1>
    <p>Descend, claim treasure, and face the darkness.</p>
    <button
      class="primary"
      type="button"
      disabled={test.state.busy}
      onclick={() => void test.bootstrap()}
    >
      Join test match
    </button>
  </section>
{:else}
  <div class="test-toolbar">
    <strong>Dungeon playground</strong>
    {#if test.state.host?.status === "lobby"}
      <button
        class="primary"
        type="button"
        disabled={!test.state.hostReady}
        onclick={() => void test.control("start")}
      >
        Start expedition
      </button>
    {:else if test.state.host?.status === "paused"}
      <button
        class="primary"
        type="button"
        disabled={!test.state.hostReady}
        onclick={() => void test.control("resume")}
      >
        Resume
      </button>
    {:else if test.state.host?.status === "running"}
      <button
        type="button"
        disabled={!test.state.hostReady}
        onclick={() => void test.control("pause")}
      >
        Pause
      </button>
    {/if}
    <button
      class="quiet"
      type="button"
      disabled={test.state.busy}
      onclick={() => void test.bootstrap("fresh", true)}
    >
      Reset
    </button>
    <details class="debugger">
      <summary>Test debugger</summary>
      <div>
        <label for="speed">Speed</label
        ><select
          id="speed"
          value={test.state.host?.speed ?? "normal"}
          disabled={!test.state.hostReady}
          onchange={(e) =>
            void test.control("speed", e.currentTarget.value as "normal" | "fast" | "manual")}
        >
          <option value="normal">Normal</option>
          <option value="fast">Fast</option>
          <option value="manual">Manual</option>
        </select>
        <button
          type="button"
          disabled={!test.state.hostReady || test.state.host?.status !== "running"}
          onclick={() => void test.control("advance")}
        >
          Next phase
        </button>
        <label for="scenario">Scenario</label
        ><select id="scenario" bind:value={scenario}>
          <option value="fresh">Fresh expedition</option>
          <option value="split">Split rooms</option>
          <option value="treasure">Treasure contest</option>
          <option value="critical">Critical health</option>
          <option value="question">Question reward</option>
          <option value="final">Final depth</option>
          <option value="rivalry">Lethal rivalry</option>
        </select><button
          type="button"
          disabled={test.state.busy}
          onclick={() => void test.bootstrap(scenario, true)}
        >
          Load scenario
        </button>
        <button
          type="button"
          onclick={() => {
            for (const a of test.state.actors) a.auto = true;
          }}
        >
          Auto all characters
        </button><button
          type="button"
          onclick={() => {
            for (const a of test.state.actors) a.auto = false;
          }}
        >
          Manual all characters
        </button>
        <button type="button" onclick={test.disconnect}>Disconnect selected</button
        ><button type="button" onclick={test.reconnect}>Reconnect selected</button
        ><button type="button" disabled={!test.state.hostReady} onclick={test.revealAnswer}>
          Reveal current answer
        </button>
        {#if test.state.answer !== null}
          <small>Correct choice: {["A", "B", "C", "D"][test.state.answer]}</small>
        {/if}
        <small>Phase {test.state.host?.phaseId} · revision {test.state.host?.revision}</small>
      </div>
    </details>
  </div>
  <div class="team-switcher">
    {#each test.state.actors.filter(
      (a, i, all) => all.findIndex((v) => v.crewId === a.crewId) === i,
    ) as crew}
      <div class="test-crew">
        <strong>{crew.view?.crews.find((c) => c.id === crew.crewId)?.name ?? "Crew"}</strong>
        <div>
          {#each test.state.actors.filter((a) => a.crewId === crew.crewId) as actor}
            <button
              type="button"
              class:chosen={test.state.selected === actor.playerId}
              onclick={() => test.select(actor.playerId)}
            >
              {actor.view?.self.name ?? actor.clientId}{actor.view?.hero?.status === "dead"
                ? " · Spirit"
                : ""}
            </button>
          {/each}
        </div>
      </div>
    {/each}
  </div>
  <div class="test-layout">
    {#if test.state.host}
      <ProjectorScreen view={test.selected?.view ?? test.state.host} />
    {:else}
      <p>Connecting…</p>
    {/if}
    <aside>
      {#if test.selected?.view && test.controller}
        {@const actor = test.selected}
        <div class="selected-identity">
          <strong>{actor.view?.self.name}</strong
          ><label class="checkbox"
            ><input
              type="checkbox"
              checked={actor.auto}
              onchange={(e) => (actor.auto = e.currentTarget.checked)}
            >Auto</label
          ><small>{actor.status} · {actor.pending} pending</small>
        </div>
        {#if actor.view?.status === "lobby"}
          <section class="decision-card">
            <h2>Ready for descent</h2>
            <ClassPicker
              view={actor.view}
              controller={test.controller}
              locked={actor.status !== "ready" || actor.pending > 0}
            />
          </section>
        {:else if actor.view}
          <PlayerScreen
            view={actor.view}
            controller={test.controller}
            connected={actor.status === "ready"}
            pending={actor.pending}
          />
        {/if}
      {/if}
    </aside>
  </div>
{/if}
