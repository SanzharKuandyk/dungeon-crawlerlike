<script lang="ts">
  import { onMount } from "svelte";
  import { CLASS_NAMES } from "../../shared/display-names.js";
  import { teamColor } from "../../shared/palette.js";
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import ActionPanel from "../components/ActionPanel.svelte";
  import CrewEncounters from "../components/CrewEncounters.svelte";
  import EncounterResult from "../components/EncounterResult.svelte";
  import GameIcon from "../components/GameIcon.svelte";
  import HeroEffects from "../components/HeroEffects.svelte";
  import InventoryDialog from "../components/InventoryDialog.svelte";
  import RewardsDialog from "../components/RewardsDialog.svelte";
  import RoundTimer from "../components/RoundTimer.svelte";
  import RoutePicker from "../components/RoutePicker.svelte";
  import SpiritPanel from "../components/SpiritPanel.svelte";
  import StopPanel from "../components/StopPanel.svelte";
  import TrialPanel from "../components/TrialPanel.svelte";
  import TurnFlow from "../components/TurnFlow.svelte";
  import Button from "../components/ui/Button.svelte";
  import VitalsStrip from "../components/VitalsStrip.svelte";
  import { phaseInstruction, presentation } from "../event-presenter.js";
  import type { PlayerController } from "../player-controller.js";
  import ResultsScreen from "./ResultsScreen.svelte";

  let {
    view,
    controller,
    connected = true,
    pending = 0,
  }: {
    view: PlayerRoomView;
    controller: PlayerController;
    connected?: boolean;
    pending?: number;
  } = $props();
  let bagOpen = $state(false);
  let rewardsOpen = $state(false);
  let now = $state(Date.now());
  let received = $state(Date.now());
  $effect(() => {
    view.revision;
    received = Date.now();
  });
  onMount(() => {
    const timer = setInterval(() => (now = Date.now()), 100);
    return () => clearInterval(timer);
  });
  let current = $derived(presentation(view, now + view.serverNow - received));
  let hero = $derived(current.arena.heroes.find((h) => h.playerId === view.self.id) ?? view.hero),
    crew = $derived(current.arena.crews.find((c) => c.id === view.self.crewId));
  let encounter = $derived(
    current.arena.encounters.find(
      (e) => crew?.location.kind === "room" && e.id === crew.location.roomId,
    ),
  );
  let locked = $derived(
    !connected || pending > 0 || !controller.ready || view.readOnly || view.status !== "running",
  );
  let quiz = $derived(
    view.independent
      ? view.quizActive
      : ["question-intro", "question", "explanation", "equipment", "return"].includes(
          view.phase.kind,
        ),
  );
  let duel = $derived(
    view.duels.find(
      (duel) => duel.status === "active" && duel.crewIds.includes(view.self.crewId ?? ""),
    ),
  );
  let interactiveCombat = $derived(
    !duel &&
      view.status === "running" &&
      view.phase.kind === "combat" &&
      encounter?.status === "active" &&
      hero?.status === "alive",
  );
  let campChoice = $derived(
    view.phase.kind === "camp" && (view.canCamp || crew?.status === "eliminated"),
  );

  let mapNode = $derived(
    view.expeditionMap?.nodes.find((node) => node.id === crew?.mapPosition?.nodeId),
  );
  let routeChoice = $derived(view.phase.kind === "route" && !!view.expeditionMap);
  let battleTurn = $derived(
    !quiz && !duel && ["combat", "combat-reveal", "combat-recap"].includes(view.phase.kind),
  );
</script>
<div
  class="phone-panel combat-player"
  class:route-player={routeChoice}
  class:battle-turn={battleTurn}
  data-phase={view.phase.kind}
  data-depth={view.depth}
  style:--team={teamColor(crew?.colorId ?? "blue").hex}
>
  <header class="player-status">
    <div class="player-heading">
      <span class="team-badge">{crew?.symbol}</span><strong>{crew?.name} · YOU</strong>
      {#if view.independent && !quiz && !battleTurn}
        {@const ready = view.participation.find((entry) => entry.crewId === view.self.crewId)}
        <span class="crew-readiness">{ready?.ready ?? 0}/{ready?.total ?? 0} ready</span>
      {:else if !battleTurn}
        <RoundTimer {view} />
      {/if}
    </div>
    {#if routeChoice}
      <section class="route-stats" aria-label="Character and treasure status">
        {#if hero}
          <span title="Health"><GameIcon name="heart" size={16} />{hero.hp}/{hero.maxHp}</span
          ><span title="Stress"><GameIcon name="stress" size={16} />{hero.stress}/10</span>
        {/if}
        <span title="Gold"><GameIcon name="gold" size={16} />{crew?.economy.gold ?? 0}</span>
        <strong class="route-secured" title="Bosses defeated"
          ><GameIcon name="boss" size={16} />{crew?.bossesDefeated ?? 0}/3</strong
        >
        <Button type="button" aria-label="Backpack" class="quiet" onclick={() => (bagOpen = true)}>
          <GameIcon name="backpack" />
        </Button>
      </section>
    {:else}
      {#if hero}
        <div class="player-vitals">
          <div>
            <strong>{view.self.name} · {CLASS_NAMES[hero.classId]}</strong>
            <VitalsStrip {hero} effects={false} />
          </div>
        </div>
      {/if}
      <div class="treasure-strip">
        <span title="Gold"><GameIcon name="gold" size={16} />{crew?.economy.gold ?? 0}</span
        ><strong title="Bosses defeated"
          ><GameIcon name="boss" size={16} />{crew?.bossesDefeated ?? 0}/3</strong
        >
      </div>
      {#if hero}
        <Button type="button" class="quiet" aria-label="Backpack" onclick={() => (bagOpen = true)}>
          <GameIcon name="backpack" />{view.hero?.inventory.backpack.length ?? 0}/6
        </Button>
      {/if}
    {/if}
  </header>
  {#if hero && !routeChoice}
    <HeroEffects {hero} />
  {/if}
  {#if battleTurn}
    <TurnFlow {view} serverNow={now + view.serverNow - received} />
  {:else if !routeChoice && !quiz}
    <div class="player-context">
      <p class="phase-instruction">
        {phaseInstruction(view)}
      </p>
      <p class="combat-depth">
        {view.expeditionMap
          ? `Chapter ${view.expeditionMap.chapter} · Room ${((view.depth - 1) % view.expeditionMap.rows) + 1}/${view.expeditionMap.rows}`
          : `Depth ${view.depth}/5`}
        ·
        {encounter?.rivalry
          ? "Crew duel"
          : (encounter?.definition.name ??
            mapNode?.room.name ??
            (view.expeditionMap ? "At the start" : "Campfire"))}
      </p>
    </div>
  {/if}
  {#if view.readOnly}
    <p class="banner">
      Another tab controls this character.
      <Button type="button" onclick={() => controller.reconnect(true)}>Take control</Button>
    </p>
  {/if}
  {#if view.intermissionPending}
    <p class="banner">A Trial is awakening. Finishing the current reveal…</p>
  {/if}
  {#if view.status === "finished"}
    <ResultsScreen {view} />
  {/if}
  {#if view.rewards.length && ["route", "camp"].includes(view.phase.kind)}
    <Button class="reward-indicator" type="button" onclick={() => (rewardsOpen = true)}
      ><GameIcon name="treasure" />Rewards · {view.rewards.length}</Button
    >
  {/if}
  <RewardsDialog bind:open={rewardsOpen} {view} {controller} {locked} />
  <InventoryDialog presentedHero={hero} {view} {controller} {locked} bind:open={bagOpen} />
  {#if hero?.status === "dead" && ["route", "camp", "floor-result"].includes(view.phase.kind)}
    <Button type="button" disabled={locked} onclick={() => void controller.rescue()}>
      Return · {2 * hero.power} rescue debt
    </Button>
  {/if}
  <CrewEncounters {view} {controller} {locked} />
  <div class="player-expedition" hidden={view.status === "finished"}>
    <ActionPanel
      {view}
      {controller}
      {locked}
      arena={current.arena}
      actor={current.actor}
      cursor={current.cursor}
      active={interactiveCombat}
      message={view.status === "paused" ? "Expedition paused" : current.message}
      panel={duel
        ? "combat"
        : quiz
          ? "question"
          : view.phase.kind === "route" && view.expeditionMap
            ? "map"
            : (view.phase.kind === "route" && hero?.status === "alive") ||
                campChoice ||
                view.phase.kind === "result" ||
                (view.phase.kind === "combat" && !interactiveCombat)
              ? "phase"
              : "combat"}
    >
      {#if view.status === "paused"}
        <section class="decision-card"><h2>Expedition paused</h2></section>
      {:else if quiz}
        <TrialPanel {view} {controller} {locked} />
      {:else if view.phase.kind === "route" && (hero?.status === "alive" || view.expeditionMap)}
        <RoutePicker {view} {controller} locked={locked || hero?.status !== "alive"} />
      {:else if view.phase.kind === "result"}
        <EncounterResult {view} {controller} {locked} />
      {:else if campChoice}
        <StopPanel {view} {controller} {locked} />
      {:else if view.phase.kind === "combat" && !interactiveCombat}
        <SpiritPanel {view} {controller} {locked} />
      {/if}
    </ActionPanel>
  </div>
</div>
