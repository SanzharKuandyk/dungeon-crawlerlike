<script lang="ts">
  import type { Hero } from "../../shared/game-types.js";

  let { hero, globalTurn }: { hero: Hero; globalTurn: number } = $props();
  const descriptions = {
    ward: "Automatically absorbs incoming damage. A charge is used only when it blocks damage.",
    salve: "Automatically heals you when you survive at half health or less.",
    lantern: "Automatically removes 2 stress when your stress reaches 4 or more.",
  };
</script>
<details class="equipment-slot">
  <summary aria-label="Bag">
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      aria-hidden="true"
    >
      <path d="M8 7V5a4 4 0 0 1 8 0v2M5 7h14l1 14H4L5 7Z" />
    </svg>
    <span
      >{hero.equipment?.kind ?? "Bag"}<small
        >{hero.equipment
          ? `${hero.equipment.charges} charge${hero.equipment.charges === 1 ? "" : "s"}`
          : "Empty"}</small
      ></span
    >
  </summary>
  <div class="bag-content">
    <strong>{hero.equipment?.kind ?? "Your bag is empty"}</strong>
    <p>
      {hero.equipment
        ? descriptions[hero.equipment.kind]
        : "Earn equipment through inscriptions and dungeon rewards."}
    </p>
    {#if hero.equipment && hero.equipmentActiveFromTurn > globalTurn + 1}
      <small>Available at a later combat choice.</small>
    {/if}
    <small>Equipment activates automatically; you do not need to press Use.</small>
  </div>
</details>
