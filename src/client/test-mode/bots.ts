import type { HeroAction } from "../../shared/command-types.js";
import type { PlayerRoomView } from "../../shared/view-types.js";

export function botAction(view: PlayerRoomView): HeroAction {
  const hero = view.hero;
  if (!hero) return { kind: "observe" };
  const choose = (kind: HeroAction["kind"]) => view.legalActions.find((a) => a.kind === kind);
  const duel = choose("duel-attack");
  if (!choose("attack") && !duel) return choose("ward") ?? { kind: "observe" };
  if (hero.stress >= 4) return { kind: "brace" };
  const heal = view.legalActions.find((a) => {
    if (a.kind !== "mend") return false;
    const target = view.heroes.find((h) => h.id === a.targetHeroId);
    return target && target.hp <= target.power * 2;
  });
  if (heal) return heal;
  if (duel) {
    if (hero.classId === "wanderer") return choose("duel-skirmish") ?? duel;
    if (hero.classId === "scavenger") return choose("duel-pilfer") ?? duel;
    if (hero.classId === "exorcist" && hero.hp <= hero.power * 2)
      return choose("duel-channel") ?? duel;
    return duel;
  }
  const room = view.encounters.find(
    (e) => e.crewIds.includes(hero.crewId) && e.status === "active",
  );
  const members = view.heroes.filter(
    (member) => member.crewId === hero.crewId && member.status === "alive",
  );
  const breaker = members
    .slice(0, Math.ceil(members.length / 2))
    .some((member) => member.id === hero.id);
  if (
    room?.weakHp &&
    breaker &&
    ((room.definition.family === "sentinel" && view.turn === 2) ||
      (room.definition.family !== "sentinel" && view.turn === 1))
  )
    return (
      view.legalActions.find(
        (a) => "part" in a && a.part === "weak-point" && ["attack", "skirmish"].includes(a.kind),
      ) ?? { kind: "brace" }
    );
  if (hero.classId === "scavenger" && hero.hp > hero.power) return { kind: "pilfer" };
  if (hero.classId === "wanderer") return choose("skirmish") ?? { kind: "brace" };
  if (hero.hp <= hero.power * 2 && hero.classId === "exorcist")
    return choose("channel") ?? { kind: "brace" };
  return (
    view.legalActions.find((a) => a.kind === "attack" && a.part === "body") ?? { kind: "brace" }
  );
}

export function botRoute(view: PlayerRoomView): string | null {
  const reachable =
    view.expeditionMap?.nodes.filter((node) => view.reachableNodeIds.includes(node.id)) ?? [];
  const preferred =
    reachable.find((node) => node.kind === "camp") ??
    reachable.find((node) => node.kind === "treasure") ??
    reachable.find((node) => node.room.risk === "low") ??
    reachable[0];
  return preferred?.id ?? view.offeredRooms.find((room) => room.risk === "low")?.id ?? null;
}
