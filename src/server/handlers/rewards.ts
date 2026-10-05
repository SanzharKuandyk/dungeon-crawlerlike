import { claimReward as applyClaim } from "../../game/progression/equipment-rewards.js";
import type { RewardClaim } from "../../shared/reward-types.js";
import { playerRun } from "../crew-decisions.js";
import { reject } from "../errors.js";
import type { StoredRoom } from "../room-types.js";
import { ownedHero, requirePhase } from "./hero-actions.js";

export function claimReward(
  room: StoredRoom,
  id: string,
  claim: RewardClaim,
  revision: number,
  requestId: string,
) {
  const hero = ownedHero(room, id),
    run = playerRun(room, id);
  if (
    room.state.status !== "running" ||
    room.state.trial ||
    room.state.siege ||
    !run ||
    run.ready.includes(id) ||
    !["result", "route", "camp"].includes(run.progress.phase.kind) ||
    room.duels.some((d) => d.status === "active" && d.crewIds.includes(hero.crewId))
  )
    reject("CLOSED", "Claim rewards at an open safe decision.");
  const offer = room.state.rewardOffers.find(
    (o) => o.id === claim.offerId && o.ownerHeroId === hero.id,
  );
  if (!offer) reject("INVALID", "Reward not found.");
  let destination: string;
  try {
    destination = applyClaim(hero, offer, claim, revision);
  } catch (error) {
    reject("INVALID", error instanceof Error ? error.message : "Reward could not be claimed.");
  }
  room.state.transactions[id] = {
    requestId,
    operation: "reward",
    paid: 0,
    item: offer.options.find((o) => o.id === claim.optionId)?.kind ?? null,
    destination,
  };
}

export function readyResult(room: StoredRoom, id: string, now: number) {
  requirePhase(room, "result", now, id);
  const hero = ownedHero(room, id);
  if (room.state.rewardOffers.some((o) => o.ownerHeroId === hero.id && o.status === "pending"))
    reject("INVALID", "Equip, store in Bag, upgrade, or leave your rewards before travelling.");
}
