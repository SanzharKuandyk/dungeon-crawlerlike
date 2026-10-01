import type { HeroAction } from "../shared/command-types.js";
import type { Hero, MatchState } from "../shared/game-types.js";
import { encounterFor, fighting } from "./routes.js";
export function legalActions(s: MatchState, h: Hero): HeroAction[] {
  if (!fighting(s, h))
    return [
      { kind: "observe" },
      ...s.heroes
        .filter((v) => fighting(s, v))
        .map((v) => ({ kind: "ward" as const, targetHeroId: v.id })),
    ];
  const e = encounterFor(s, h);
  if (!e) return [];
  const parts = e.weakHp > 0 ? (["body", "weak-point"] as const) : (["body"] as const);
  const choices: HeroAction[] = [
    ...parts.map((part) => ({ kind: "attack" as const, part })),
    { kind: "brace" },
    { kind: "loot" },
  ];
  const allies = s.heroes.filter((v) => fighting(s, v) && encounterFor(s, v)?.id === e.id);
  switch (h.classId) {
    case "knight":
      choices.push(...allies.map((v) => ({ kind: "protect" as const, targetHeroId: v.id })));
      break;
    case "physician":
      choices.push(
        ...allies
          .filter((v) => v.hp < v.maxHp)
          .map((v) => ({ kind: "mend" as const, targetHeroId: v.id })),
      );
      break;
    case "occultist":
      choices.push(...parts.map((part) => ({ kind: "hex" as const, part })));
      break;
    case "scavenger":
      choices.push({ kind: "pilfer" });
      break;
    case "wanderer":
      choices.push(...parts.map((part) => ({ kind: "skirmish" as const, part })));
      break;
    case "exorcist":
      choices.push(...parts.map((part) => ({ kind: "channel" as const, part })));
      break;
  }
  return choices;
}
export function actionKey(a: HeroAction) {
  return `${a.kind}:${"part" in a ? a.part : "targetHeroId" in a ? a.targetHeroId : ""}`;
}
