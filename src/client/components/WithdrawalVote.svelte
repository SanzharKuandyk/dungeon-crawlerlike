<script lang="ts">
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import type { PlayerController } from "../player-controller.js";
  import Button from "./ui/Button.svelte";

  let {
    view,
    controller,
    locked,
  }: { view: PlayerRoomView; controller: PlayerController; locked: boolean } = $props();
  let members = $derived(
    view.crewInputs.filter((p) =>
      view.heroes.some((h) => h.playerId === p.playerId && h.status === "alive"),
    ),
  );
  let yes = $derived(members.filter((p) => p.withdraw).length);
  let own = $derived(members.find((p) => p.playerId === view.self.id)?.withdraw ?? false);
</script>
<details class="withdrawal">
  <summary>Withdraw to camp · {yes}/{members.length} votes</summary>
  <p>Majority required. Everyone gains 1 stress. No encounter reward.</p>
  <Button
    type="button"
    disabled={locked}
    onclick={() => void controller.withdraw(!own)}
    class={`${own ? "chosen" : ""}`}
  >
    {own ? "Cancel withdrawal vote" : "Vote to withdraw"}
  </Button>
</details>
