<script lang="ts">
  import { onDestroy } from "svelte";
  import type { TestScenario } from "../../shared/protocol.js";
  import ClassPicker from "../components/ClassPicker.svelte";
  import Button from "../components/ui/Button.svelte";
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
    <Button
      class="primary"
      type="button"
      disabled={test.state.busy}
      onclick={() => void test.bootstrap()}
    >
      Join test match
    </Button>
  </section>
{:else}
  <div class="test-toolbar">
    <strong>Dungeon playground</strong>
    {#if test.state.host?.status === "lobby"}
      <Button
        class="primary"
        type="button"
        disabled={!test.state.hostReady}
        onclick={() => void test.control("start")}
      >
        Start expedition
      </Button>
    {:else if test.state.host?.status === "paused"}
      <Button
        class="primary"
        type="button"
        disabled={!test.state.hostReady}
        onclick={() => void test.control("resume")}
      >
        Resume
      </Button>
    {:else if test.state.host?.status === "running"}
      <Button
        type="button"
        disabled={!test.state.hostReady}
        onclick={() => void test.control("pause")}
      >
        Pause
      </Button>
    {/if}
    <Button
      class="quiet"
      type="button"
      disabled={test.state.busy}
      onclick={() => void test.bootstrap("fresh", true)}
    >
      Reset
    </Button>
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
        <Button
          type="button"
          disabled={!test.state.hostReady || test.state.host?.status !== "running"}
          onclick={() => void test.control("advance")}
        >
          Next phase
        </Button>
        <label for="scenario">Scenario</label
        ><select id="scenario" bind:value={scenario}>
          <option value="fresh">Fresh expedition</option>
          <option value="split">Split rooms</option>
          <option value="shop">Merchant budgets</option>
          <option value="critical">Critical health</option>
          <option value="question">Question reward</option>
          <option value="duel">Consensual crew duel</option>
          <option value="final">Final boss</option>
          {#each [
            "reward",
            "reward-full",
            "result",
            "injuries",
            "panic",
            "overflow",
            "revival",
            "rescue",
            "boss-transition",
            "trial-intro",
            "trial-board",
            "trial-wager",
            "trial-answer",
            "trial-reveal",
            "trial-reward",
            "trial-return",
          ] as value}
            <option {value}>{value}</option>
          {/each}
        </select><Button
          type="button"
          disabled={test.state.busy}
          onclick={() => void test.bootstrap(scenario, true)}
        >
          Load scenario
        </Button>
        <Button
          type="button"
          onclick={() => {
            for (const a of test.state.actors) a.auto = true;
          }}
        >
          Auto all characters
        </Button><Button
          type="button"
          onclick={() => {
            for (const a of test.state.actors) a.auto = false;
          }}
        >
          Manual all characters
        </Button>
        <Button type="button" onclick={test.disconnect}>Disconnect selected</Button
        ><Button type="button" onclick={test.reconnect}>Reconnect selected</Button
        ><Button type="button" disabled={!test.state.hostReady} onclick={test.revealAnswer}>
          Reveal current answer
        </Button>
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
            <Button
              type="button"
              onclick={() => test.select(actor.playerId)}
              class={`${test.state.selected === actor.playerId ? "chosen" : ""}`}
            >
              {actor.view?.self.name ?? actor.clientId}{actor.view?.hero?.status === "dead"
                ? " · Spirit"
                : ""}
            </Button>
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
