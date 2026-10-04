<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";

  let {
    children,
    variant = "secondary",
    primary = false,
    pending = false,
    disabled = false,
    disabledReason,
    label,
    class: css = "",
    ...attrs
  }: HTMLButtonAttributes & {
    children?: Snippet;
    variant?: "primary" | "secondary" | "quiet" | "danger";
    primary?: boolean;
    pending?: boolean;
    disabledReason?: string;
    label?: string;
  } = $props();
</script>
<button
  {...attrs}
  type={attrs.type ?? "button"}
  class={`ui-button ${primary ? "primary" : variant} ${css}`}
  disabled={disabled || pending}
  aria-busy={pending}
  aria-label={label ?? attrs["aria-label"]}
  title={disabledReason ?? attrs.title}
>
  {#if pending}
    <span class="pending-dot" aria-hidden="true"></span>
  {/if}
  {#if children}
    {@render children()}
  {/if}
</button>
