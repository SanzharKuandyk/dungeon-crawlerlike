import type { BlessingKind } from "../../shared/condition-types.js";
import type { MatchState } from "../../shared/game-types.js";
import { nextRandom, shuffled } from "../random.js";
export const BLESSINGS: BlessingKind[] = [
  "iron-nerve",
  "sealbreaker",
  "last-stand",
  "field-medic",
  "clear-purpose",
  "second-breath",
];
export function createBlessingOffers(state: MatchState) {
  const trial = state.trial;
  if (!trial) return;
  const best = Math.max(0, ...Object.values(trial.totals));
  for (const hero of state.heroes) {
    const favour = trial.favour[hero.playerId] ?? 0;
    if (!favour || trial.offers[hero.playerId]) continue;
    const rank = favour >= 4 ? 2 : 1;
    const eligible = BLESSINGS.filter(
      (kind) => !hero.conditions.blessings.some((b) => b.kind === kind && b.rank >= rank),
    );
    const rng = nextRandom(state.trialRng);
    state.trialRng = rng.state;
    trial.offers[hero.playerId] = shuffled(eligible, rng.state)
      .slice(0, trial.totals[hero.crewId] === best ? 3 : 2)
      .map((kind, index) => ({ id: `${trial.id}:${hero.id}:${index}`, kind, rank }));
  }
}
export function grantBlessings(state: MatchState) {
  const trial = state.trial;
  if (!trial || trial.rewardsGranted) return;
  for (const hero of state.heroes) {
    const choice = trial.choices[hero.playerId];
    if (!choice || choice === "decline") continue;
    const [offerId, replacement] = choice.split("|"),
      offer = trial.offers[hero.playerId]?.find((o) => o.id === offerId);
    if (!offer) throw new Error("Blessing offer not found.");
    const current = hero.conditions.blessings.find((b) => b.kind === offer.kind);
    if (current) current.rank = Math.max(current.rank, offer.rank) as 1 | 2;
    else {
      if (hero.conditions.blessings.length >= 2) {
        const index = hero.conditions.blessings.findIndex((b) => b.kind === replacement);
        if (index < 0) throw new Error("Choose a Blessing to replace.");
        hero.conditions.blessings.splice(index, 1);
      }
      hero.conditions.blessings.push({
        kind: offer.kind,
        rank: offer.rank,
        spent: hero.expeditionUses.includes(offer.kind),
      });
    }
  }
  trial.rewardsGranted = true;
}
