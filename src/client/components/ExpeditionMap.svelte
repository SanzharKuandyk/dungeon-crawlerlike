<script lang="ts">
  import { tick, untrack } from "svelte";
  import type { Crew } from "../../shared/game-types.js";
  import { type ExpeditionMap, MAP_NODE_LABELS, type MapNode } from "../../shared/map-types.js";
  import { teamColor } from "../../shared/palette.js";
  import MapNodeIcon from "./MapNodeIcon.svelte";

  let {
    map,
    crews,
    focusCrewId = null,
    reachable = [],
    ownVote = null,
    crewChoice = null,
    voteCounts = {},
    locked = false,
    onvote,
    oncrew,
    voting = false,
  }: {
    map: ExpeditionMap;
    crews: Crew[];
    focusCrewId?: string | null;
    reachable?: string[];
    ownVote?: string | null;
    crewChoice?: string | null;
    voteCounts?: Record<string, number>;
    locked?: boolean;
    onvote?: (id: string) => void;
    oncrew?: (id: string) => void;
    voting?: boolean;
  } = $props();

  let viewport = $state<HTMLElement | null>(null);
  let inspected = $state<string | null>(null);
  let focusedCrew = $state<string | null>(null);
  let crewId = $derived(focusCrewId ?? focusedCrew);
  let crew = $derived(crews.find((crew) => crew.id === crewId));
  let trail = $derived(crew?.mapPosition?.chapter === map.chapter ? crew.mapPosition.trail : []);
  let selectedNode = $derived(map.nodes.find((node) => node.id === (inspected ?? ownVote)));
  let edges = $derived(
    map.nodes.flatMap((from) =>
      from.nextIds.flatMap((id) => {
        const to = map.nodes.find((node) => node.id === id);
        return to ? [{ from, to }] : [];
      }),
    ),
  );

  const x = (node: MapNode) => 64 + node.lane * 116;
  const y = (node: MapNode) => 56 + (map.rows - node.row) * 104;
  let startY = $derived(56 + (map.rows - 1) * 104 + 64);
  let mapHeight = $derived(startY + 58);
  let currentNodeId = $derived(crew?.mapPosition?.nodeId ?? null);

  $effect(() => {
    map.chapter;
    crewId;
    currentNodeId;
    const element = viewport;
    if (!element) return;
    let canceled = false;
    const observer = new ResizeObserver(() => untrack(focusPosition));
    void tick().then(() => {
      if (canceled) return;
      untrack(focusPosition);
      observer.observe(element);
    });
    return () => {
      canceled = true;
      observer.disconnect();
    };
  });

  function focusPosition() {
    const node = map.nodes.find((node) => node.id === currentNodeId);
    if (!viewport) return;
    const bottom = node ? (viewport.clientHeight >= 220 ? 72 : 32) : 56;
    viewport.scrollTop = (node ? y(node) : startY) - viewport.clientHeight + bottom;
  }

  function routePath(from: MapNode, to: MapNode) {
    const middle = (y(from) + y(to)) / 2;
    return `M ${x(from)} ${y(from)} C ${x(from)} ${middle}, ${x(to)} ${middle}, ${x(to)} ${y(to)}`;
  }

  function occupants(id: string | null) {
    return crews.filter(
      (crew) => crew.mapPosition?.chapter === map.chapter && crew.mapPosition.nodeId === id,
    );
  }

  function choose(node: MapNode) {
    inspected = node.id;

    if (voting && reachable.includes(node.id) && !locked) onvote?.(node.id);
  }

  function locate(id: string) {
    focusedCrew = id;
    void tick().then(focusPosition);
    oncrew?.(id);
  }
</script>

<section class="expedition-map" class:voting-map={voting} aria-label={`Chapter ${map.chapter} map`}>
  {#if !voting}
    <header class="map-toolbar">
      <strong>Chapter {map.chapter}</strong>
      <div class="map-pan">
        <button
          type="button"
          class="quiet"
          aria-label="Explore higher floors"
          onclick={() => viewport?.scrollBy({ top: -viewport.clientHeight * 0.7 })}
        >
          ↑
        </button>
        <button
          type="button"
          class="quiet"
          aria-label="Explore lower floors"
          onclick={() => viewport?.scrollBy({ top: viewport.clientHeight * 0.7 })}
        >
          ↓
        </button>
      </div>
    </header>
  {/if}

  <section
    class="map-viewport"
    bind:this={viewport}
    aria-label="Dungeon routes; climb from the start below to the guardian above"
  >
    <div class="map-canvas" style:height={`${mapHeight}px`}>
      <svg
        class="map-connections"
        viewBox={`0 0 360 ${mapHeight}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {#each map.nodes.filter((node) => node.row === 1) as node}
          <path
            d={`M 180 ${startY} C 180 ${startY - 40}, ${x(node)} ${startY - 40}, ${x(node)} ${y(node)}`}
            class:available={voting && reachable.includes(node.id)}
          />
        {/each}

        {#each edges as edge}
          <path
            d={routePath(edge.from, edge.to)}
            class:traveled={trail.includes(edge.from.id) && trail.includes(edge.to.id)}
            class:available={voting &&
              crew?.mapPosition?.nodeId === edge.from.id &&
              reachable.includes(edge.to.id)}
          />
        {/each}
      </svg>

      <div class="map-start" style:top={`${(startY / mapHeight) * 100}%`}>
        <span>Start</span>
        <div class="map-markers">
          {#each occupants(null).slice(0, 4) as crew}
            <span style:--team={teamColor(crew.colorId).hex} title={crew.name}>{crew.symbol}</span>
          {/each}
          {#if occupants(null).length > 4}
            <b>+{occupants(null).length - 4}</b>
          {/if}
        </div>
      </div>

      {#each map.nodes as node (node.id)}
        <div
          class="map-stop"
          style:left={`${(x(node) / 360) * 100}%`}
          style:top={`${(y(node) / mapHeight) * 100}%`}
          data-floor={node.row}
        >
          <button
            type="button"
            class="map-node"
            class:reachable={voting && reachable.includes(node.id)}
            class:visited={trail.includes(node.id)}
            class:own-vote={ownVote === node.id}
            class:crew-choice={crewChoice === node.id}
            class:current-node={crew?.mapPosition?.nodeId === node.id}
            class:guardian={node.kind === "boss"}
            disabled={voting && reachable.includes(node.id) && locked}
            aria-pressed={ownVote === node.id}
            aria-label={`${node.row}. ${MAP_NODE_LABELS[node.kind]}: ${node.room.name}${reachable.includes(node.id) && voting ? ". Vote for this route" : ""}${voteCounts[node.id] ? `. ${voteCounts[node.id]} votes` : ""}`}
            title={`${MAP_NODE_LABELS[node.kind]} · ${node.room.name}`}
            onclick={() => choose(node)}
          >
            <MapNodeIcon kind={node.kind} />
            {#if ownVote === node.id}
              <span class="map-vote-check">✓</span>
            {/if}
            {#if voteCounts[node.id]}
              <span class="map-vote-count">{voteCounts[node.id]}</span>
            {/if}
          </button>

          <span class="map-node-label"
            >{currentNodeId === node.id ? "YOU ARE HERE" : MAP_NODE_LABELS[node.kind]}</span
          >
          <div class="map-markers">
            {#each occupants(node.id).slice(0, 4) as crew}
              <span
                class:fallen={crew.status === "eliminated"}
                style:--team={teamColor(crew.colorId).hex}
                title={`${crew.name} · ${crew.playerIds.length} members${crew.status === "eliminated" ? " · eliminated" : ""}`}
                >{crew.symbol}</span
              >
            {/each}
            {#if occupants(node.id).length > 4}
              <b>+{occupants(node.id).length - 4}</b>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </section>

  <div class="map-inspection" aria-live="polite">
    {#if selectedNode}
      <strong
        >{selectedNode.room.name}
        {#if ownVote === selectedNode.id}
          <span> · ✓ Voted</span>
        {/if}
        {#if crewChoice === selectedNode.id && ownVote !== selectedNode.id}
          <span> · Crew choice</span>
        {/if}
      </strong>
      <small
        >{occupants(selectedNode.id).length
          ? `${occupants(selectedNode.id)
              .map((crew) => `${crew.symbol} ${crew.name} (${crew.playerIds.length})`)
              .join(" · ")} — `
          : ""}{selectedNode.room.description}
        {#if voting && !reachable.includes(selectedNode.id)}
          · Not connected
        {/if}
      </small>
    {:else}
      <small>{voting ? "Tap a connected room" : "Select a room or locate a crew"}</small>
    {/if}
  </div>

  {#if !voting}
    <section class="map-crew-legend" aria-label="Crew positions">
      {#each crews as crew}
        <button
          type="button"
          class="map-crew-label"
          class:chosen={crew.id === crewId}
          onclick={() => locate(crew.id)}
          style:--team={teamColor(crew.colorId).hex}
        >
          <span class="team-badge">{crew.symbol}</span>
          <strong>{crew.name}</strong>
          <small
            >{crew.status === "eliminated"
              ? "Eliminated"
              : crew.mapPosition?.nodeId
                ? (map.nodes.find((node) => node.id === crew.mapPosition?.nodeId)?.room.name ??
                  `Chapter ${crew.mapPosition?.chapter}`)
                : "At the start"}</small
          >
        </button>
      {/each}
    </section>
  {/if}
</section>
