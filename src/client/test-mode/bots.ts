import { outgoingDamage } from "../../game/combat/damage.js";
import { publishedIntent } from "../../game/combat/enemy-patterns.js";
import type { HeroAction } from "../../shared/command-types.js";
import type { PlayerRoomView } from "../../shared/view-types.js";

export function botAction(view: PlayerRoomView): HeroAction {
  const hero = view.hero;
  if (!hero) return { kind: "observe" };
  const choose = (kind: HeroAction["kind"]) => view.legalActions.find((a) => a.kind === kind);
  if (!choose("attack")) return choose("ward") ?? { kind: "observe" };
  const enemy = view.encounters.find(
    (e) => e.crewIds.includes(hero.crewId) && e.status === "active",
  );
  const fighting = view.heroes.filter((h) => h.crewId === hero.crewId && h.status === "alive");
  if (enemy) {
    const lethalPart = (["body", "weak-point"] as const).find((part) => {
      if (part === "weak-point" && !enemy.weakHp) return false;
      const damage = fighting.reduce(
        (sum, h) =>
          sum +
          outgoingDamage(
            h,
            h.power *
              (h.classId === "occultist" && view.turn >= h.skillReadyTurn && h.stress < 7 ? 3 : 2),
            part,
          ),
        0,
      );
      return damage >= enemy.bodyHp + enemy.shield + (part === "weak-point" ? enemy.weakHp : 0);
    });
    if (lethalPart)
      return (
        view.legalActions.find(
          (a) => a.kind === "hex" && a.part === lethalPart && hero.stress < 7,
        ) ??
        view.legalActions.find((a) => a.kind === "skirmish" && a.part === lethalPart) ??
        view.legalActions.find((a) => a.kind === "attack" && a.part === lethalPart) ?? {
          kind: "brace",
        }
      );
  }
  const sealAttack = fighting.reduce(
    (sum, h) => sum + outgoingDamage(h, 2 * h.power, "weak-point"),
    0,
  );
  const expectedEnemy =
    enemy && enemy.weakHp > 0 && sealAttack >= enemy.weakHp + enemy.shield
      ? { ...enemy, weakHp: 0 }
      : enemy;
  const intent = expectedEnemy ? publishedIntent(expectedEnemy, fighting, view.turn) : null;
  const threat = (target: typeof hero) => {
    const next = intent?.targets.find((t) => t.heroId === target.id);
    return (
      (next?.damage ?? 0) +
      (target.conditions.combatEffects.some((e) => e.kind === "bleed") || next?.bleed
        ? target.power
        : 0) +
      (target.stress + (next?.stress ?? 0) >= 10 ? target.power : 0)
    );
  };
  if (hero.hp <= threat(hero)) {
    const protect = view.legalActions.find(
      (a) => a.kind === "protect" && a.targetHeroId === hero.id,
    );
    if (protect) return protect;
    const item = view.legalActions.find(
      (a) =>
        a.kind === "use-item" &&
        a.targetHeroId === hero.id &&
        hero.inventory.backpack.some(
          (i) => i.id === a.itemId && ["draught", "bandage"].includes(i.kind),
        ),
    );
    if (item) return item;
  }
  if (hero.stress >= 7) {
    const tonic = view.legalActions.find(
      (a) =>
        a.kind === "use-item" &&
        a.targetHeroId === hero.id &&
        hero.inventory.backpack.some((i) => i.id === a.itemId && i.kind === "tonic"),
    );
    if (tonic) return tonic;
  }
  const heal = view.legalActions.find((a) => {
    if (a.kind !== "mend") return false;
    const target = view.heroes.find((h) => h.id === a.targetHeroId);
    return target && target.hp <= threat(target);
  });
  if (heal) return heal;
  const room = view.encounters.find(
    (e) => e.crewIds.includes(hero.crewId) && e.status === "active",
  );
  if (hero.classId === "occultist" && hero.stress < 7 && choose("hex"))
    return (
      view.legalActions.find(
        (a) => a.kind === "hex" && a.part === (room?.weakHp ? "weak-point" : "body"),
      ) ?? { kind: "attack", part: "body" }
    );
  if (room?.weakHp && room.status === "active")
    return (
      view.legalActions.find((a) => a.kind === "skirmish" && a.part === "weak-point") ??
      view.legalActions.find((a) => a.kind === "attack" && a.part === "weak-point") ?? {
        kind: "brace",
      }
    );
  if (
    hero.classId === "scavenger" &&
    hero.hp > hero.power &&
    !room?.pilfered.includes(hero.id) &&
    room?.kind !== "boss"
  )
    return choose("pilfer") ?? { kind: "attack", part: "body" };
  if (hero.classId === "wanderer") return choose("skirmish") ?? { kind: "attack", part: "body" };
  if (hero.hp <= threat(hero) && hero.classId === "exorcist")
    return choose("channel") ?? { kind: "attack", part: "body" };
  return (
    view.legalActions.find((a) => a.kind === "attack" && a.part === "body") ?? { kind: "brace" }
  );
}

export function botRoute(view: PlayerRoomView): string | null {
  const reachable =
    view.expeditionMap?.nodes.filter((node) => view.reachableNodeIds.includes(node.id)) ?? [];
  const needsSupplies =
    !!view.hero && (view.hero.hp < view.hero.maxHp || !view.hero.inventory.equipment.weapon);
  const preferred =
    (needsSupplies ? reachable.find((n) => n.kind === "merchant") : undefined) ??
    reachable.find((node) => node.kind === "camp") ??
    reachable.find((node) => node.kind === "treasure") ??
    reachable.find((node) => node.room.risk === "low") ??
    reachable[0];
  return preferred?.id ?? view.offeredRooms.find((room) => room.risk === "low")?.id ?? null;
}

export type BotPreparation =
  | { kind: "rescue" }
  | { kind: "equip"; itemId: string }
  | { kind: "buy"; offerId: string }
  | { kind: "treat"; treatment: import("../../shared/inventory-types.js").Treatment };
export function botPreparation(view: PlayerRoomView): BotPreparation | null {
  const hero = view.hero;
  const crew = view.crews.find((c) => c.id === hero?.crewId);
  if (!hero || !["route", "camp"].includes(view.phase.kind) || view.trial || view.decisionReady)
    return null;
  if (hero.status === "dead") return crew?.status === "active" ? { kind: "rescue" } : null;
  if (view.phase.kind !== "camp") return null;
  const slots = {
    "body-blade": "weapon",
    "seal-pick": "weapon",
    "ward-vest": "armor",
    "guard-coat": "armor",
    "calm-charm": "charm",
    "healer-charm": "charm",
  } as const;
  const gear = hero.inventory.backpack.find(
    (i) => i.kind in slots && !hero.inventory.equipment[slots[i.kind as keyof typeof slots]],
  );
  if (gear) return { kind: "equip", itemId: gear.id };
  const allowance = Math.min(view.shop?.allowances[hero.id] ?? 0, crew?.economy.gold ?? 0);
  const node = view.expeditionMap?.nodes.find((n) => n.id === crew?.mapPosition?.nodeId);
  const freeRest = view.recoveryAvailable || ["camp", "altar", "shrine"].includes(node?.kind ?? "");
  if (!freeRest && hero.hp < 3 * hero.power && allowance >= hero.power)
    return { kind: "treat", treatment: { kind: "heal" } };
  const injury = hero.conditions.injuries[0];
  if (injury && allowance >= hero.power * 2)
    return { kind: "treat", treatment: { kind: "injury", injury } };
  const affliction = hero.conditions.afflictions.find((a) => a.kind === "doubtful");
  if (affliction && allowance >= hero.power * 2)
    return { kind: "treat", treatment: { kind: "affliction", affliction: affliction.kind } };
  const healing = view.shop?.offers[hero.id]?.find(
    (o) => o.kind === "draught" && o.stock && o.price <= allowance,
  );
  if (
    hero.inventory.equipment.weapon &&
    healing &&
    !hero.inventory.backpack.some((i) => i.kind === "draught")
  )
    return { kind: "buy", offerId: healing.id };
  const offer = view.shop?.offers[hero.id]?.find(
    (o) =>
      o.stock &&
      o.price <= allowance &&
      o.kind in slots &&
      !hero.inventory.equipment[slots[o.kind as keyof typeof slots]],
  );
  if (offer) return { kind: "buy", offerId: offer.id };
  if (healing && !hero.inventory.backpack.some((i) => i.kind === "draught"))
    return { kind: "buy", offerId: healing.id };
  if (hero.stress >= 4 && allowance >= hero.power)
    return { kind: "treat", treatment: { kind: "calm" } };
  return null;
}

export function botCamp(view: PlayerRoomView): import("../../shared/command-types.js").CampChoice {
  const crew = view.crews.find((c) => c.id === view.self.crewId);
  if (crew?.status === "eliminated") return "rescue";
  const living = view.heroes.filter((h) => h.crewId === view.self.crewId && h.status === "alive");
  if (view.recoveryAvailable)
    return living.some((h) => h.hp < h.maxHp || h.stress > 0) ? "rest" : "continue";
  const node = view.expeditionMap?.nodes.find((n) => n.id === crew?.mapPosition?.nodeId);
  return ["camp", "altar", "shrine"].includes(node?.kind ?? "") ? "rest" : "continue";
}
