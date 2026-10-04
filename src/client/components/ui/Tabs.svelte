<script lang="ts">
  import { Tabs as Bits } from "bits-ui";
  import type { Snippet } from "svelte";

  let {
    value = $bindable(""),
    items,
    children,
    label,
  }: {
    value?: string;
    items: { id: string; label: string }[];
    children: Snippet<[string]>;
    label: string;
  } = $props();
</script>
<Bits.Root bind:value
  ><Bits.List class="ui-tabs" aria-label={label}
    >{#each items as item}
      <Bits.Trigger value={item.id}>{item.label}</Bits.Trigger>
    {/each}</Bits.List
  >
  {#each items as item}
    <Bits.Content value={item.id}>{@render children(item.id)}</Bits.Content>
  {/each}</Bits.Root
>
