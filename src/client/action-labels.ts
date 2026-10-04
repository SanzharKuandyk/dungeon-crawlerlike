import { actionPreview } from "../game/combat/hero-actions.js";
import type { HeroAction } from "../shared/command-types.js";
import { ACTION_NAMES } from "../shared/display-names.js";
import type { PlayerRoomView } from "../shared/view-types.js";
export function actionLabel(action: HeroAction | null, view: PlayerRoomView, actor = view.hero) {
  if (!action) return "Not chosen";
  if (!actor) return ACTION_NAMES[action.kind];
  const label = ACTION_NAMES[action.kind];
  const target =
    "part" in action
      ? ` ${action.part === "body" ? "body" : "seal"}`
      : "targetHeroId" in action
        ? ` ${view.players.find((p) => p.id === view.heroes.find((h) => h.id === action.targetHeroId)?.playerId)?.name ?? "ally"}`
        : "";
  const targetHero =
    "targetHeroId" in action ? view.heroes.find((h) => h.id === action.targetHeroId) : actor;
  if (action.kind === "pilfer" && view.encounters.some((e) => e.pilfered.includes(actor.id)))
    return `${label} · ${actionPreview(actor, action).split(" · ")[0]} · gold already claimed`;
  return `${label}${target} · ${actionPreview(actor, action, targetHero ?? actor, view.skillStress.skirmish)}`;
}
