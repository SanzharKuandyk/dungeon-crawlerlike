<script lang="ts">
  import type { ClassId } from "../../shared/content-types.js";

  let {
    classId,
    color,
    name = "Character",
    fallen = false,
  }: {
    classId: ClassId;
    color: string;
    name?: string;
    fallen?: boolean;
  } = $props();
</script>
<svg class="hero-model" class:fallen={fallen} viewBox="0 0 100 130" role="img" aria-label={name}>
  <title>{name} · {classId}</title>
  <g stroke="#18181b" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">
    <path d="M37 92 31 117h15l7-27m6 0 4 27h15L66 91" fill="#333337" />
    <path d="M32 52 24 86l11 5 8-21m23-16 13 28-8 6-16-21" fill={color} />
    <path d="M37 48 32 94q23 12 40-1L64 48Z" fill={color} />
    <path d="M34 84h34v9H34z" fill="#242426" />
    <circle cx="51" cy="32" r="16" fill="#fffaf0" />
    {#if classId === "knight"}
      <path d="M33 31V17L52 9l16 12v19H34z" fill="#dedee2" />
      <path d="M36 29h30m-7 0v10" fill="none" />
      <path d="M74 48h20v34L83 96 73 81Z" fill={color} />
      <path d="M17 26v65m-7-17h15" stroke-width="4" />
    {:else if classId === "physician"}
      <path d="M34 21q17-17 34 0v7H34z" fill="#ffffff" />
      <path d="M47 16h8m-4-4v8" fill="none" />
      <path d="M43 53v30m17-28-1 30" stroke="#f5f5f4" />
      <rect x="75" y="69" width="15" height="22" rx="3" fill="#f8f8f6" />
      <path d="M83 74v12m-5-6h10" fill="none" />
    {:else if classId === "occultist"}
      <path d="M28 41 50 7l24 34-12 7H39Z" fill={color} />
      <path d="M40 31h20v12H40z" fill="#242426" />
      <path d="M43 34h4m7 0h4" stroke="#ffffff" />
      <path d="M84 35v84" stroke-width="4" />
      <circle cx="84" cy="25" r="11" fill="#fff" />
      <path d="m82 22 5 3-5 4" fill="none" />
    {:else if classId === "scavenger"}
      <path d="m31 28 3-16 36 3 4 16H28" fill="#343438" />
      <path d="M34 59h32m-18-9L32 84" stroke="#fafaf9" />
      <path d="m80 72 12-26-3 34-9 9z" fill="#dedee2" />
      <path d="M18 56h15v36H18z" fill="#6f6f70" />
    {:else if classId === "wanderer"}
      <path d="M30 45 35 16l18-9 18 18v24l-12-5V28l-13-7-11 14z" fill={color} />
      <path d="m36 53 25 4 8 37-36 1z" fill={color} />
      <path d="M83 19v71m-9-12h18" stroke="#dedee2" stroke-width="4" />
    {:else}
      <path d="M29 28 43 8h16l17 24-23-5z" fill="#343438" />
      <path d="M42 55 61 85m0-30L43 85" stroke="#f5f5f4" />
      <path d="M83 38v77m-9-63h18" stroke-width="4" />
      <circle cx="83" cy="85" r="8" fill="#fff" />
    {/if}
  </g>
</svg>
