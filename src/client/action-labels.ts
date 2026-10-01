import type { HeroAction } from "../shared/command-types.js";
import type { PlayerRoomView } from "../shared/view-types.js";
export function actionLabel(a: HeroAction | null, view: PlayerRoomView) {
  if (!a) return "Not chosen";
  const h = view.hero,
    p = h?.power ?? 0;
  const target =
    "targetHeroId" in a
      ? (view.players.find(
          (v) => v.id === view.heroes.find((h) => h.id === a.targetHeroId)?.playerId,
        )?.name ?? "character")
      : "";
  const bonus = h?.bargainDepth === view.depth ? p : 0;
  switch (a.kind) {
    case "attack":
      return `Attack ${a.part === "body" ? "body" : "weak point"} · ${2 * p + bonus} damage`;
    case "brace":
      return `Brace · ${2 * p} barrier · −1 stress`;
    case "loot":
      return `Loot · ${2 * p} claim`;
    case "protect":
      return `Protect ${target} · ${3 * p} barrier`;
    case "mend":
      return `Mend ${target} · ${2 * p} healing`;
    case "hex":
      return `Hex ${a.part === "body" ? "body" : "weak point"} · ${3 * p + bonus} damage · +2 stress`;
    case "pilfer":
      return `Pilfer · ${p + bonus} damage · ${p} claim`;
    case "skirmish":
      return `Skirmish ${a.part === "body" ? "body" : "weak point"} · ${2 * p + bonus} damage · ${p} barrier · +1 stress`;
    case "channel":
      return `Channel ${a.part === "body" ? "body" : "weak point"} · ${p + bonus} damage · ${p} healing · −1 stress`;
    case "ward":
      return `Ward ${target}`;
    case "observe":
      return "Observe";
  }
}
