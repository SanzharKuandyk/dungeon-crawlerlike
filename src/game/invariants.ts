import { POWER } from "../shared/constants.js";
import type { MatchState } from "../shared/game-types.js";
import { TEAM_COLORS } from "../shared/palette.js";
import { validateMap } from "./progression/maps.js";
export function assertInvariants(state: MatchState) {
  const fail = (message: string) => {
    throw new Error(`Invariant: ${message}`);
  };
  const unique = (values: string[], name: string) => {
    if (new Set(values).size !== values.length) fail(name);
  };
  if (state.rulesVersion !== "dungeon-v5") fail("rules version");
  unique(
    state.players.map((p) => p.id),
    "players",
  );
  unique(
    state.crews.map((c) => c.id),
    "crews",
  );
  unique(
    state.crews.map((c) => c.symbol),
    "symbols",
  );
  unique(
    state.heroes.map((h) => h.playerId),
    "hero ownership",
  );
  unique(state.usedTrialQuestions, "trial questions");
  unique(
    state.sharedEvents.map((e) => e.id),
    "shared triggers",
  );
  if (state.chapterMaps.length !== 2) fail("two chapter maps");
  for (const map of state.chapterMaps) validateMap(map);
  for (const crew of state.crews) {
    const members = state.players.filter((p) => p.crewId === crew.id);
    if (members.length < 1 || members.length > 4) fail("crew size");
    if (!TEAM_COLORS.some((c) => c.id === crew.colorId)) fail("palette");
    if (
      ![
        crew.economy.gold,
        crew.economy.rescueDebt,
        crew.trialScoreUnits,
        crew.bossesDefeated,
      ].every((n) => Number.isInteger(n) && n >= 0) ||
      crew.bossesDefeated > 2
    )
      fail("crew economy/ranking");
    unique(crew.rewardedNodeIds, "node rewards");
    unique(crew.completedNodeIds, "completed nodes");
    if (state.status !== "lobby") {
      if (
        members.length !== crew.startingSize ||
        members.some((p) => !crew.playerIds.includes(p.id))
      )
        fail("frozen roster");
      const p = state.crewProgress[crew.id];
      if (
        !p ||
        p.chapter < 1 ||
        p.chapter > 2 ||
        p.depth < 1 ||
        p.depth > 12 ||
        p.turn < 1 ||
        p.turn > 8
      )
        fail("crew progress");
      unique(p.resolvedPhaseIds.map(String), "crew resolution");
    }
  }
  if (state.status !== "lobby" && state.heroes.length !== state.players.length)
    fail("one hero per student");
  for (const hero of state.heroes) {
    if (!state.players.some((p) => p.id === hero.playerId && p.crewId === hero.crewId))
      fail("hero owner");
    const crew = state.crews.find((c) => c.id === hero.crewId);
    if (!crew || hero.power !== POWER[crew.startingSize]) fail("frozen power");
    if (
      hero.maxHp !== 4 * hero.power ||
      !Number.isInteger(hero.hp) ||
      hero.hp < 0 ||
      hero.hp > hero.maxHp ||
      !Number.isInteger(hero.stress) ||
      hero.stress < 0 ||
      hero.stress > 9
    )
      fail("hero bounds");
    if ((hero.status === "dead") !== (hero.hp === 0)) fail("hero life");
    if (hero.conditions.blessings.length > 2 || hero.conditions.afflictions.length > 2)
      fail("trait caps");
    unique(
      hero.conditions.blessings.map((b) => b.kind),
      "blessings",
    );
    unique(
      hero.conditions.afflictions.map((b) => b.kind),
      "afflictions",
    );
    unique(hero.conditions.injuries, "injuries");
    const inv = hero.inventory;
    if (inv.backpack.length > 6 || inv.overflow.length > 32) fail("inventory capacity");
    const items = [
      ...inv.backpack,
      ...Object.values(inv.equipment).filter((i) => i !== null),
      ...inv.overflow,
    ];
    unique(
      items.map((i) => i.id),
      "item IDs",
    );
    if (items.some((i) => i.count < 1 || i.count > 3)) fail("item stack");
  }
  for (const enemy of state.encounters)
    if (
      enemy.hp < 0 ||
      enemy.hp > enemy.maxHp ||
      enemy.block < 0 ||
      enemy.enemies.some((e) => e.hp < 0 || e.hp > e.maxHp || e.block < 0) ||
      enemy.spawnPower <= 0
    )
      fail("enemy bounds");
  if (state.history.some((event, index) => event.sequence !== index + 1)) fail("event sequence");
  unique(
    state.rewardOffers.map((o) => o.id),
    "reward IDs",
  );
  for (const offer of state.rewardOffers) {
    if (
      !state.heroes.some((h) => h.id === offer.ownerHeroId) ||
      offer.options.length !== 2 ||
      new Set(offer.options.map((o) => o.kind)).size !== 2
    )
      fail("reward entitlement");
    if (offer.status === "claimed" && !offer.options.some((o) => o.id === offer.selectedOptionId))
      fail("reward selection");
  }
  if (state.trial) unique(state.trial.resolvedQuestions, "question resolution");
}
