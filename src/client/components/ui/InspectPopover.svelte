<script lang="ts">
  import { Popover } from "bits-ui";
  import type { Snippet } from "svelte";

  let { label, children, trigger }: { label: string; children: Snippet; trigger?: Snippet } =
    $props();
</script>
<Popover.Root
  ><Popover.Trigger class="inspect-trigger" aria-label={label} title={label}>
    {#if trigger}
      {@render trigger()}
    {:else}
      {label}
    {/if}
  </Popover.Trigger><Popover.Portal
    ><Popover.Content class="ui-inspector" sideOffset={8}
      >{@render children()}</Popover.Content
    ></Popover.Portal
  ></Popover.Root
>
