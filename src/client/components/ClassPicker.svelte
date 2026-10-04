<script lang="ts">
  import {
    ACTION_NAMES,
    CLASS_NAMES,
    CLASS_PURPOSES,
    CLASS_SKILLS,
  } from "../../shared/display-names.js";
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import type { PlayerController } from "../player-controller.js";
  import ActionIcon from "./ActionIcon.svelte";
  import GameIcon from "./GameIcon.svelte";
  import Button from "./ui/Button.svelte";
  import InspectPopover from "./ui/InspectPopover.svelte";

  let {
    view,
    controller,
    locked = false,
  }: { view: PlayerRoomView; controller: PlayerController; locked?: boolean } = $props();
  let size = $derived(view.players.filter((p) => p.crewId === view.self.crewId).length);
</script>
<section class="class-picker">
  <h2>Your character</h2>
  <div class="selected-class">
    Selected: <strong>{CLASS_NAMES[view.self.classId]}</strong>
    <InspectPopover label="Class details"
      >{#snippet trigger()}
        <GameIcon name="info" />
      {/snippet}
      <strong>{ACTION_NAMES[CLASS_SKILLS[view.self.classId]]}</strong>
      <p>{view.classes.find((c) => c.id === view.self.classId)?.description}</p></InspectPopover
    >
  </div>
  <p>{CLASS_PURPOSES[view.self.classId]}</p>
  <div class="class-options">
    {#each view.classes as c}
      <Button
        type="button"
        aria-pressed={view.self.classId === c.id}
        disabled={locked || size > c.maxCrewSize}
        onclick={() => void controller.chooseClass(c.id)}
        class={`${view.self.classId === c.id ? "chosen" : ""}`}
      >
        <img src={`/assets/heroes/${c.id}.svg`} alt="" width="38" height="38">
        <strong>{CLASS_NAMES[c.id]}</strong
        ><small class="class-skill"
          ><ActionIcon kind={CLASS_SKILLS[c.id]} />{ACTION_NAMES[CLASS_SKILLS[c.id]]}</small
        >
      </Button>
    {/each}
  </div>
  {#if view.classNotice}
    <p class="banner" role="status">{view.classNotice}</p>
  {/if}
</section>
