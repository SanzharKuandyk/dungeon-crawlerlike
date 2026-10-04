<script lang="ts">
  import { Dialog as Bits } from "bits-ui";
  import type { Snippet } from "svelte";

  let {
    open = $bindable(false),
    title,
    children,
    footer,
    context,
  }: {
    open?: boolean;
    title: string;
    children: Snippet;
    footer?: Snippet;
    context?: Snippet;
  } = $props();
</script>
<Bits.Root bind:open>
  <Bits.Portal>
    <Bits.Overlay class="ui-dialog-overlay" />
    <Bits.Content class="ui-dialog">
      <header>
        <Bits.Title>{title}</Bits.Title><Bits.Close aria-label="Close dialog">×</Bits.Close>
      </header>
      {#if context}
        <div class="dialog-context">{@render context()}</div>
      {/if}
      <div class="ui-dialog-body">{@render children()}</div>
      <footer>
        {#if footer}
          {@render footer()}
        {:else}
          <Bits.Close>Done</Bits.Close>
        {/if}
      </footer>
    </Bits.Content>
  </Bits.Portal>
</Bits.Root>
