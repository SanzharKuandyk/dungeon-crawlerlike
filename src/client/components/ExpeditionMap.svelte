<script lang="ts">
  import { onMount, tick, untrack } from "svelte";
  import type { Crew } from "../../shared/game-types.js";
  import { type ExpeditionMap, MAP_NODE_LABELS, type MapNode } from "../../shared/map-types.js";
  import { NODE_COLORS, teamColor } from "../../shared/palette.js";
  import GameIcon from "./GameIcon.svelte";
  import MapNodeIcon from "./MapNodeIcon.svelte";
  import Button from "./ui/Button.svelte";

  let {
    map,
    roomId,
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
    preview = false,
    floor = null,
  }: {
    map: ExpeditionMap;
    roomId: string;
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
    preview?: boolean;
    floor?: number | null;
  } = $props();

  let viewport = $state<HTMLElement | null>(null);
  let overview = $state(false),
    viewportHeight = $state(0);
  onMount(() => {
    if (!viewport) return;
    const observer = new ResizeObserver(([entry]) => {
      viewportHeight = entry.contentRect.height;
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  });
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
  let rowSpacing = $derived(overview ? Math.max(52, (viewportHeight - 64) / (map.rows - 1)) : 96);
  const y = (node: MapNode) => (overview ? 24 : 48) + (map.rows - node.row) * rowSpacing;
  let startY = $derived((overview ? 28 : 48) + (map.rows - 1) * rowSpacing + (overview ? 48 : 80));
  let mapHeight = $derived(overview ? 64 + (map.rows - 1) * rowSpacing : startY + 58);
  let currentNodeId = $derived(crew?.mapPosition?.nodeId ?? null);

  let browseKey = $derived(
    `dungeon-map:${roomId}:${map.chapter}:${crewId ?? crews[0]?.id ?? "public"}`,
  );
  $effect(() => {
    const key = browseKey;
    const element = viewport;
    if (!element) return;
    let canceled = false;
    void tick().then(() => {
      if (canceled) return;
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(key);
      } catch {
        /* Browsing still works without storage. */
      }
      if (saved !== null && Number.isFinite(Number(saved))) element.scrollTop = Number(saved);
      else untrack(focusPosition);
    });
    return () => {
      canceled = true;
    };
  });
  function rememberScroll() {
    if (!viewport) return;
    try {
      localStorage.setItem(browseKey, String(viewport.scrollTop));
    } catch {
      /* Storage is optional for browsing. */
    }
  }

  function focusPosition() {
    const node =
      map.nodes.find((node) => node.id === currentNodeId) ?? map.nodes.find((n) => n.row === 1);
    if (!viewport) return;
    viewport.scrollTop = (node ? y(node) : startY) - viewport.clientHeight * 0.72;
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

<section
  class="expedition-map"
  class:voting-map={voting}
  class:map-overview={overview}
  aria-label={`Chapter ${map.chapter} map`}
>
  <header class="map-toolbar">
    <strong>Chapter {map.chapter}{floor ? ` · ${floor}/${map.rows}` : ""}</strong>
    <Button
      type="button"
      variant="quiet"
      class="map-overview-toggle"
      aria-label={overview ? "Show route detail" : "Show whole route"}
      aria-pressed={overview}
      onclick={() => {
        overview = !overview;
        void tick().then(() => {
          if (overview && viewport) viewport.scrollTop = 0;
          else focusPosition();
        });
      }}
    >
      <GameIcon name="map-overview" size={24} />
    </Button>
    <button type="button" class="quiet" onclick={focusPosition}>Locate crew</button>
  </header>

  <section
    class="map-viewport"
    bind:this={viewport}
    onscroll={rememberScroll}
    aria-label="Dungeon routes; climb from the start below to the guardian above"
  >
    <div class="map-canvas" style:height={`${mapHeight}px`}>
      <svg
        class="map-connections"
        viewBox={`0 0 360 ${mapHeight}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {#if !overview}
          {#each map.nodes.filter((node) => node.row === 1) as node}
            <path
              d={`M 180 ${startY} C 180 ${startY - 40}, ${x(node)} ${startY - 40}, ${x(node)} ${y(node)}`}
              class:available={voting && reachable.includes(node.id)}
            />
          {/each}
        {/if}
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

      {#if !overview}
        <div class="map-start" style:top={`${(startY / mapHeight) * 100}%`}>
          <span>Start</span>
          <div class="map-markers">
            {#each occupants(null).slice(0, 4) as crew}
              <span style:--team={teamColor(crew.colorId).hex} title={crew.name}
                >{crew.symbol}</span
              >
            {/each}
            {#if occupants(null).length > 4}
              <b>+{occupants(null).length - 4}</b>
            {/if}
          </div>
        </div>
      {/if}
      {#each map.nodes as node (node.id)}
        <div
          class="map-stop"
          style:--node-color={NODE_COLORS[node.kind]}
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

          <span class="map-node-label">{MAP_NODE_LABELS[node.kind]}</span>
          {#if currentNodeId === node.id}
            <span class="map-here">YOU</span>
          {/if}
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
          <span> · {preview ? "Selected" : "✓ Voted"}</span>
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
