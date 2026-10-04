<script lang="ts">
  import { itemDefinition } from "../../../game/inventory/catalog.js";
  import type { TransactionFeedback } from "../../../shared/feedback-types.js";
  import GameIcon from "../GameIcon.svelte";

  let {
    feedback,
    operation,
    compact = false,
    reserved = false,
  }: {
    feedback: TransactionFeedback | null;
    operation?: TransactionFeedback["operation"];
    compact?: boolean;
    reserved?: boolean;
  } = $props();
</script>
{#if reserved || (feedback && (!operation || feedback.operation === operation))}
  <div class="transaction-feedback" class:compact class:feedback-reserved={reserved} role="status">
    {#if feedback && (!operation || feedback.operation === operation)}
      <GameIcon name={feedback.item ?? "ready"} />
      <div>
        <strong>{feedback.item ? itemDefinition(feedback.item)?.name : "Confirmed"}</strong>
        <p>{feedback.destination}</p>
        {#if !compact}
          <small>Last confirmed transaction</small>
        {/if}
      </div>
      {#if feedback.paid}
        <span><GameIcon name="gold" size={16} />−{feedback.paid}</span>
      {/if}
    {/if}
  </div>
{/if}
