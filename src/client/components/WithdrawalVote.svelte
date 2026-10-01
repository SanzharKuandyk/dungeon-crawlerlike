<script lang="ts">
  import type { PlayerRoomView } from "../../shared/view-types.js";
  import type { PlayerController } from "../player-controller.js";

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
  <p>Majority required. Everyone gains 1 stress. No victory purse.</p>
  <button
    type="button"
    disabled={locked}
    class:chosen={own}
    onclick={() => void controller.withdraw(!own)}
  >
    {own ? "Cancel withdrawal vote" : "Vote to withdraw"}
  </button>
</details>
