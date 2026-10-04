<script lang="ts">
  import LastTurn from "../components/LastTurn.svelte";
  import Button from "../components/ui/Button.svelte";
  import DecisionFooter from "../components/ui/DecisionFooter.svelte";
  import Dialog from "../components/ui/Dialog.svelte";
  import EmptyState from "../components/ui/EmptyState.svelte";
  import FormField from "../components/ui/FormField.svelte";
  import InlineNotice from "../components/ui/InlineNotice.svelte";
  import InspectPopover from "../components/ui/InspectPopover.svelte";
  import ItemDetail from "../components/ui/ItemDetail.svelte";
  import ItemSlot from "../components/ui/ItemSlot.svelte";
  import Panel from "../components/ui/Panel.svelte";
  import ReadyStatus from "../components/ui/ReadyStatus.svelte";
  import StatusBar from "../components/ui/StatusBar.svelte";
  import Tabs from "../components/ui/Tabs.svelte";
  import TransactionFeedback from "../components/ui/TransactionFeedback.svelte";

  let open = $state(false),
    tab = $state("controls");
</script>
<section class="gallery">
  <h1>Interface states · development only</h1>
  <Tabs
    bind:value={tab}
    label="Gallery"
    items={[
      { id: "controls", label: "Controls" },
      { id: "rewards", label: "Rewards" },
      { id: "feedback", label: "Feedback" },
    ]}
  >
    {#snippet children(
      value,
    )}
      {#if value === "controls"}
        <div class="gallery-grid">
          <Panel
            ><h2>Decision controls</h2>
            <Button primary>Ready</Button><Button>Change</Button
            ><Button variant="quiet">Last turn</Button
            ><Button variant="danger">End expedition</Button><Button pending>Buying…</Button
            ><Button disabled disabledReason="Backpack full">Equip</Button>
            <ReadyStatus ready={3} total={4} confirmed /></Panel
          >
          <Panel
            ><h2>Character</h2>
            <StatusBar label="Health" value={18} max={48} icon="heart" />
            <StatusBar label="Stress" value={7} max={10} icon="stress" />
            <InspectPopover label="Arm injury">Damage reduced by 25% until treated.</InspectPopover
            ><InlineNotice error>Backpack full. Choose space or save the reward.</InlineNotice
            ><FormField label="Room code" id="gallery-code"
              ><input id="gallery-code" placeholder="ABC123"></FormField
            ><Button onclick={() => (open = true)}>Open dialog</Button></Panel
          >
        </div>
      {:else if value === "rewards"}
        <Panel
          ><h2>Cache opened</h2>
          <div class="reward-options">
            <ItemSlot kind="body-blade" selected /><ItemSlot kind="ward-vest" />
          </div>
          <ItemDetail kind="body-blade" power={12} comparison="seal-pick" />
          <TransactionFeedback
            feedback={{
              requestId: "gallery",
              operation: "equip",
              item: "body-blade",
              paid: 0,
              destination: "Equipped in weapon · Seal pick added to backpack",
            }}
          /><DecisionFooter
            ><ReadyStatus ready={1} total={4} />
            <Button primary>Ready to travel</Button></DecisionFooter
          ></Panel
        >
      {:else}
        <div class="gallery-grid">
          <Panel
            ><h2>Interrupted play</h2>
            <InlineNotice>Reconnecting · accepted actions are saved</InlineNotice
            ><InlineNotice>Expedition paused · waiting for Resume</InlineNotice
            ><Button disabled disabledReason="Synchronizing your saved choices">Ready</Button>
            <LastTurn
              summary={{
                id: "gallery-turn",
                turn: 2,
                entries: [
                  { actor: "Mira", message: "Mira blocked 12 damage." },
                  { actor: "Ash", message: "Ash broke the seal." },
                  { actor: null, message: "The enemy attack was cancelled." },
                ],
              }}
            /></Panel
          ><Panel
            ><h2>Full backpack</h2>
            <div class="backpack-slots">
              {#each [
                "body-blade",
                "seal-pick",
                "guard-coat",
                "ward-vest",
                "calm-charm",
                "healer-charm",
              ] as kind}
                <ItemSlot kind={kind as import("../../shared/inventory-types.js").ItemKind} />
              {/each}
            </div>
            <InlineNotice error
              >Choose a backpack item to replace, or save this reward.</InlineNotice
            ><EmptyState message="No new equipment drop · 12 gold earned" />
            <Button>Save for later</Button></Panel
          >
        </div>
      {/if}
    {/snippet}</Tabs
  >
  <Dialog bind:open title="Body blade"
    ><ItemDetail kind="body-blade" power={12} />
    {#snippet footer()}
      <Button primary onclick={() => (open = false)}>Equip</Button>
    {/snippet}</Dialog
  >
</section>
