<script lang="ts">
  import type { GameEvent } from "../../shared/event-types.js";
  import type { RoomView } from "../../shared/view-types.js";
  import { readHistory } from "../connection.js";
  import { eventMessage } from "../event-messages.js";
  import { room } from "../room.svelte.js";

  let {
    view,
    cursor = Infinity,
    full = false,
  }: { view: RoomView; cursor?: number; full?: boolean } = $props();
  let earlier = $state<GameEvent[]>([]),
    expanded = $state(false),
    loading = $state(false),
    before = $state<number | null>(null);
  let entries = $derived([
    ...new Map(
      [...earlier, ...view.history].filter((e) => e.sequence <= cursor).map((e) => [e.id, e]),
    ).values(),
  ]);
  let displayed = $derived(
    expanded || full
      ? entries.filter((entry) => before === null || entry.sequence < before).slice(-50)
      : entries.slice(-5),
  );
  async function load() {
    loading = true;
    const first = displayed[0]?.sequence ?? 1;
    earlier = [...(await (room.controller?.history(first) ?? readHistory(first))), ...earlier];
    before = first;
    loading = false;
    expanded = true;
  }
</script>
<section class="event-log" aria-label="Expedition log">
  <div class="section-heading">
    <h2>Expedition log</h2>
    {#if !full}
      <button
        type="button"
        class="quiet"
        onclick={() => {
          expanded = !expanded;
          before = null;
        }}
      >
        {expanded ? "Recent" : "Expand log"}
      </button>
    {/if}
  </div>
  {#if entries.length === 0}
    <p class="muted">No events yet.</p>
  {/if}
  <ol>
    {#each displayed as event (event.id)}
      <li><span>Depth {event.depth} · Turn {event.turn}</span>{eventMessage(event)}</li>
    {/each}
  </ol>
  {#if before !== null}
    <button type="button" class="quiet" onclick={() => (before = null)}>Latest events</button>
  {/if}
  {#if (expanded || full) && (displayed[0]?.sequence ?? 1) > 1}
    <button type="button" class="quiet" disabled={loading} onclick={load}>
      {loading ? "Loading…" : "Show earlier"}
    </button>
  {/if}
</section>
