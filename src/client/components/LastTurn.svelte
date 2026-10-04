<script lang="ts">
  import type { TurnSummary } from "../../shared/feedback-types.js";
  import GameIcon from "./GameIcon.svelte";
  import Button from "./ui/Button.svelte";
  import Dialog from "./ui/Dialog.svelte";

  let { summary, compact = false }: { summary: TurnSummary | null; compact?: boolean } = $props();
  let open = $state(false);
</script>
{#if summary}
  <Button
    variant="quiet"
    label="Last turn"
    class={compact ? "ui-icon-button" : ""}
    onclick={() => (open = true)}
    ><GameIcon name="history" size={16} />
    {#if !compact}
      Last turn
    {/if}</Button
  >
  <Dialog bind:open title={`Turn ${summary.turn}`}
    ><ul class="summary-list">
      {#each summary.entries as entry}
        <li>{entry.message}</li>
      {/each}
    </ul></Dialog
  >
{/if}
