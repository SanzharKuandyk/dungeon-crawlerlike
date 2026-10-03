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
  const rivals = s.heroes.filter(
    (v) => fighting(s, v) && v.crewId !== h.crewId && encounterFor(s, v)?.id === e.id,
  );
  const choices: HeroAction[] = [
    ...(e.rivalry
      ? rivals.map((v) => ({ kind: "duel-attack" as const, targetHeroId: v.id }))
      : parts.map((part) => ({ kind: "attack" as const, part }))),
    { kind: "brace" },
    { kind: "loot" },
  ];
  const allies = s.heroes.filter(
    (v) =>
      fighting(s, v) && encounterFor(s, v)?.id === e.id && (!e.rivalry || v.crewId === h.crewId),
  );
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
      choices.push(
        ...(e.rivalry
          ? rivals.map((v) => ({ kind: "duel-hex" as const, targetHeroId: v.id }))
          : parts.map((part) => ({ kind: "hex" as const, part }))),
      );
      break;
    case "scavenger":
      if (e.rivalry)
        choices.push(...rivals.map((v) => ({ kind: "duel-pilfer" as const, targetHeroId: v.id })));
      else choices.push({ kind: "pilfer" });
      break;
    case "wanderer":
      choices.push(
        ...(e.rivalry
          ? rivals.map((v) => ({ kind: "duel-skirmish" as const, targetHeroId: v.id }))
          : parts.map((part) => ({ kind: "skirmish" as const, part }))),
      );
      break;
    case "exorcist":
      choices.push(
        ...(e.rivalry
          ? rivals.map((v) => ({ kind: "duel-channel" as const, targetHeroId: v.id }))
          : parts.map((part) => ({ kind: "channel" as const, part }))),
      );
      break;
  }
  return choices;
}
export function actionKey(a: HeroAction) {
  return `${a.kind}:${"part" in a ? a.part : "targetHeroId" in a ? a.targetHeroId : ""}`;
}
