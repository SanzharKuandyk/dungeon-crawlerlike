<script lang="ts">
  import { onMount } from "svelte";
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

  const x = (node: MapNode) => 128 + (node.row - 1) * 96;
  const y = (node: MapNode) => 60 + node.lane * 74;

  onMount(() => {
    if (!voting || !viewport) return;

    const current = map.nodes.find((node) => node.id === crew?.mapPosition?.nodeId);
    viewport.scrollLeft = Math.max(0, (current ? x(current) : 44) - 80);
  });

  function routePath(from: MapNode, to: MapNode) {
    return `M ${x(from)} ${y(from)} C ${x(from) + 48} ${y(from)}, ${x(to) - 48} ${y(to)}, ${x(to)} ${y(to)}`;
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
    const position = crews.find((crew) => crew.id === id)?.mapPosition;
    const node = map.nodes.find((node) => node.id === position?.nodeId);

    if (viewport) {
      viewport.scrollTo({ left: Math.max(0, (node ? x(node) : 44) - viewport.clientWidth / 2) });
    }

    oncrew?.(id);
  }
</script>

<section class="expedition-map" class:voting-map={voting} aria-label={`Chapter ${map.chapter} map`}>
  <header class="map-toolbar">
    <strong>Chapter {map.chapter} <span class="map-subtitle">· Endless expedition</span></strong>
    <div class="map-pan">
      <button
        type="button"
        class="quiet"
        aria-label="Pan map left"
        onclick={() => viewport?.scrollBy({ left: -viewport.clientWidth * 0.7 })}
      >
        ‹
      </button>
      <button
        type="button"
        class="quiet"
        aria-label="Pan map right"
        onclick={() => viewport?.scrollBy({ left: viewport.clientWidth * 0.7 })}
      >
        ›
      </button>
    </div>
  </header>

  <section
    class="map-viewport"
    bind:this={viewport}
    aria-label="Branching routes; scroll to explore"
  >
    <div class="map-canvas">
      <svg
        class="map-connections"
        viewBox="0 0 1088 270"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {#each map.nodes.filter((node) => node.row === 1) as node}
          <path
            d={`M 44 134 C 86 134, 86 ${y(node)}, ${x(node)} ${y(node)}`}
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

      <div class="map-start" style:left={`${(44 / 1088) * 100}%`}>
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
          style:left={`${(x(node) / 1088) * 100}%`}
          style:top={`${(y(node) / 270) * 100}%`}
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
          <div class="map-markers">
            {#each occupants(node.id).slice(0, 4) as crew}
              <span
                class:fallen={crew.status === "eliminated"}
                style:--team={teamColor(crew.colorId).hex}
                title={`${crew.name}${crew.status === "eliminated" ? " · eliminated" : ""}`}
                >{crew.symbol}</span
              >
            {/each}
            {#if occupants(node.id).length > 4}
              <b>+{occupants(node.id).length - 4}</b>
            {/if}
          </div>
        </div>
      {/each}

      <span class="map-next-chapter">Next<br>chapter →</span>
    </div>
  </section>

  <div class="map-inspection" aria-live="polite">
    {#if selectedNode}
      <strong
        >{selectedNode.room.name}
        {#if ownVote === selectedNode.id}
          <span> · Your vote ✓</span>
        {/if}
        {#if crewChoice === selectedNode.id}
          <span> · Crew choice</span>
        {/if}
      </strong>
      <small
        >{selectedNode.room.description}
        {#if voting && !reachable.includes(selectedNode.id)}
          · Not connected to your current position.
        {/if}
      </small>
    {:else}
      <strong>{voting ? "Vote for a highlighted destination" : "Every crew’s journey"}</strong>
      <small
        >{voting
          ? "Follow the connecting paths. Most votes wins; ties use the rotating crew leader."
          : "Select a room to inspect it, or a crew to locate its position."}</small
      >
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
