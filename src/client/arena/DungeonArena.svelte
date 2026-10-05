<script lang="ts">
  import { onMount } from "svelte";
  import type { ArenaState } from "../../shared/game-types.js";
  import type { RoomView } from "../../shared/view-types.js";
  import { preferences } from "../room.svelte.js";
  import type { createArena } from "./create-arena.js";

  let {
    view,
    arena,
    roomId,
    actor,
    crewId = null,
    targetId = null,
    combatHud = false,
    rows = false,
  }: {
    view: RoomView;
    arena: ArenaState;
    roomId: string | null;
    actor: string | null;
    crewId?: string | null;
    targetId?: string | null;
    combatHud?: boolean;
    rows?: boolean;
  } = $props();
  let parent: HTMLDivElement,
    renderer = $state<ReturnType<typeof createArena> | null>(null);
  onMount(() => {
    let disposed = false;
    void import("./create-arena.js").then(({ createArena: create }) => {
      if (!disposed) renderer = create(parent);
    });
    return () => {
      disposed = true;
      renderer?.game.destroy(true);
    };
  });
  $effect(() =>
    renderer?.scene.renderArena(
      view,
      arena,
      roomId,
      actor,
      preferences.reducedMotion,
      crewId,
      targetId,
      combatHud,
      rows,
    ),
  );
</script>
<div
  class="dungeon-arena"
  class:combat-art={combatHud}
  bind:this={parent}
  role="img"
  aria-label="Dungeon encounter. Colored character portraits match crew badges. Enemy health, Block and announced moves are shown."
></div>
