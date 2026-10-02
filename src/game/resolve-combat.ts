import type { MatchState } from "../shared/game-types.js";
import { actionKey, legalActions } from "./action-options.js";
import { combatContext } from "./combat-context.js";
import { applyEnemyActions } from "./enemy-actions.js";
import { beginEvents, crewEvent, enemyEvent, finalizeEvents, lockResolution } from "./events.js";
import { applyAid, applyHeroActions, damageEnemies } from "./hero-actions.js";
import { chooseQuestion } from "./learning.js";
import { awardLoot } from "./loot.js";
import { rewardMastery } from "./mastery.js";
import { creditParticipation } from "./participation.js";
import { applyRivalryDamage, rivalryOutcome } from "./rivalry.js";
import { fighting } from "./routes.js";
import { finalizeDeaths, resolveStress } from "./stress-and-death.js";
import { applyWithdrawals } from "./withdrawal.js";
export function resolveCombat(input: MatchState) {
  const s = structuredClone(input);
  lockResolution(s);
  beginEvents(s);
  s.globalTurn++;
  const actions = Object.fromEntries(
    s.heroes.map((h) => {
      const submitted = s.actions[h.playerId];
      const legal =
        submitted && legalActions(s, h).some((a) => actionKey(a) === actionKey(submitted));
      return [
        h.playerId,
        legal
          ? submitted
          : fighting(s, h)
            ? { kind: "brace" as const }
            : { kind: "observe" as const },
      ];
    }),
  );
  const ctx = combatContext(
    actions,
    new Set(s.heroes.filter((h) => fighting(s, h)).map((h) => h.id)),
  );
  applyWithdrawals(s, ctx);
  s.resolvedActions = structuredClone(ctx.actions);
  applyHeroActions(s, ctx);
  applyAid(s, ctx);
  damageEnemies(s, ctx);
  applyRivalryDamage(s, ctx);
  applyEnemyActions(s, ctx);
  resolveStress(s, ctx.fightingAtLock);
  creditParticipation(s, ctx);
  finalizeDeaths(s);
  awardLoot(s, ctx);
  for (const e of s.encounters.filter((e) => e.status === "active")) {
    const remaining = s.crews.some(
      (c) => c.status === "active" && c.location.kind === "room" && c.location.roomId === e.id,
    );
    e.status = e.rivalry
      ? rivalryOutcome(s, e)
      : e.bodyHp === 0
        ? "defeated"
        : !remaining
          ? "abandoned"
          : s.turn >= 4
            ? "timed-out"
            : "active";
    rewardMastery(s, e);
    enemyEvent(
      s,
      e,
      `${e.definition.name}: ${e.status === "active" ? "the fight continues" : e.status}.`,
      0.95,
      "room-result",
    );
    if (e.status !== "active")
      for (const c of s.crews.filter(
        (c) => c.location.kind === "room" && c.location.roomId === e.id,
      )) {
        c.location = { kind: "camp" };
        crewEvent(s, c, `${c.name} returns to camp.`, 0.96, "camp-arrival");
      }
  }
  chooseQuestion(s);
  finalizeEvents(s);
  return { state: s, events: s.events };
}
