<script lang="ts">
  import type { HeroAction } from "../../shared/command-types.js";
  import type { ClassId } from "../../shared/content-types.js";
  import type { Hero } from "../../shared/game-types.js";
  import HeroModel from "./HeroModel.svelte";

  let {
    hero,
    name,
    classId,
    color,
    own = false,
    acting = false,
    action = null,
    selected = false,
    locked = false,
    onchoose,
  }: {
    hero?: Hero;
    name: string;
    classId: ClassId;
    color: string;
    own?: boolean;
    acting?: boolean;
    action?: HeroAction | null;
    selected?: boolean;
    locked?: boolean;
    onchoose?: (action: HeroAction) => void;
  } = $props();
</script>
<div
  class="party-character"
  class:acting={acting}
  class:own-hero={own}
  class:target-selected={selected}
>
  {#if action && onchoose}
    <button
      type="button"
      class="hero-target"
      aria-label={`Target ${name}`}
      aria-pressed={selected}
      disabled={locked}
      onclick={() => action && onchoose?.(action)}
    >
      <HeroModel {classId} {color} {name} fallen={hero?.status === "dead"} />
    </button>
  {:else}
    <details class="hero-inspect">
      <summary aria-label={`Details for ${name}`}>
        <HeroModel {classId} {color} {name} fallen={hero?.status === "dead"} />
      </summary>
      <div>
        <strong>{name}</strong><span>{classId}{hero ? ` · ${hero.stress}/6 stress` : ""}</span
        ><span
          >{hero?.equipment
            ? `${hero.equipment.kind} · ${hero.equipment.charges} charges`
            : "No equipment"}</span
        >
        {#if hero?.mastery}
          <span>Mastery {hero.mastery.rank}/2</span>
        {/if}
      </div>
    </details>
  {/if}
  <strong title={name}>{own ? "You" : name}</strong>
  {#if hero}
    <span>{hero.status === "dead" ? "Spirit" : `${hero.hp}/${hero.maxHp}`}</span>
    <meter aria-label={`${name} health`} value={hero.hp} max={hero.maxHp}></meter>
  {:else}
    <span>{classId}</span>
  {/if}
</div>
