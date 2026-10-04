<script lang="ts">
  import { onMount } from "svelte";
  import type { GameEvent } from "../../shared/event-types.js";
  import type { RoomView } from "../../shared/view-types.js";
  import { readHistory } from "../connection.js";
  import { eventMessage } from "../event-messages.js";
  import { room } from "../room.svelte.js";
  import Button from "./ui/Button.svelte";

  let {
    view,
    cursor = Infinity,
    full = false,
  }: { view: RoomView; cursor?: number; full?: boolean } = $props();
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
  function revealed(event: GameEvent) {
    if (!view.independent) return true;
    const run = view.crewRuns.find((run) => run.events.some((entry) => entry.id === event.id));
    if (
      !run ||
      !["arrival", "combat-reveal", "camp-reveal", "extraction", "return"].includes(run.phase.kind)
    )
      return true;
    const elapsed =
      view.status === "paused" || run.pauseReasons.length > 0
        ? run.clock.elapsedMs
        : now + view.serverNow - received - run.clock.startedAt;
    return event.at <= elapsed / run.clock.durationMs;
  }
  let earlier = $state<GameEvent[]>([]),
    expanded = $state(false),
    loading = $state(false),
    before = $state<number | null>(null);
  let entries = $derived([
    ...new Map(
      [...earlier, ...view.history]
        .filter((e) => e.sequence <= cursor && revealed(e))
        .map((e) => [e.id, e]),
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
      <Button
        type="button"
        class="quiet"
        onclick={() => {
          expanded = !expanded;
          before = null;
        }}
      >
        {expanded ? "Recent" : "Expand log"}
      </Button>
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
    <Button type="button" class="quiet" onclick={() => (before = null)}>Latest events</Button>
  {/if}
  {#if (expanded || full) && (displayed[0]?.sequence ?? 1) > 1}
    <Button type="button" class="quiet" disabled={loading} onclick={load}>
      {loading ? "Loading…" : "Show earlier"}
    </Button>
  {/if}
</section>
