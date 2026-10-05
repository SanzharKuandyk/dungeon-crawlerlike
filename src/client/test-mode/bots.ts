import { outgoingDamage } from "../../game/combat/damage.js";
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
  const target = enemy?.enemies
    .filter((e) => e.hp > 0)
    .sort((a, b) =>
      a.role === "supporter" ? -1 : b.role === "supporter" ? 1 : a.hp + a.block - b.hp - b.block,
    )[0];
  const threat = (targetHero: typeof hero) =>
    enemy?.enemies
      .filter((e) => e.hp > 0)
      .reduce(
        (sum, e) =>
          sum +
          (e.intent?.targets
            .filter((t) => t.heroId === targetHero.id)
            .reduce((n, t) => n + t.damage + (t.bleed ? targetHero.power : 0), 0) ?? 0),
        0,
      ) ?? 0;
  const attack = () =>
    view.legalActions.find((a) => a.kind === "attack" && a.enemyId === target?.id) ??
    choose("attack") ??
    ({ kind: "brace" } as HeroAction);
  if (target && outgoingDamage(hero, 2 * hero.power) >= target.hp + target.block) return attack();
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
  if (hero.classId === "occultist" && hero.stress < 6) return choose("hex") ?? attack();
  if (hero.classId === "scavenger" && !enemy?.pilfered.includes(hero.id))
    return choose("pilfer") ?? attack();
  if (hero.classId === "wanderer" && hero.stress < 6) return choose("skirmish") ?? attack();
  if (hero.classId === "exorcist" && (hero.hp < hero.maxHp || hero.stress > 0))
    return choose("channel") ?? attack();
  return attack();
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
  | { kind: "revive"; targetHeroId: string; payment: "gold" | "debt" }
  | { kind: "equip"; itemId: string }
  | { kind: "buy"; offerId: string }
  | { kind: "treat"; treatment: import("../../shared/inventory-types.js").Treatment };
export function botPreparation(view: PlayerRoomView): BotPreparation | null {
  const hero = view.hero;
  const crew = view.crews.find((c) => c.id === hero?.crewId);
  if (
    !hero ||
    !["result", "camp"].includes(view.phase.kind) ||
    view.quizActive ||
    view.decisionReady
  )
    return null;
  const node = view.expeditionMap?.nodes.find((n) => n.id === crew?.mapPosition?.nodeId);
  if (
    view.phase.kind === "camp" &&
    !view.recoveryAvailable &&
    !["camp", "merchant", "shrine"].includes(node?.kind ?? "")
  )
    return null;
  if (hero.status === "dead")
    return crew?.status === "active" && !view.revivalRequests.includes(hero.id)
      ? { kind: "rescue" }
      : null;
  const dead = view.heroes.find((h) => h.crewId === hero.crewId && h.status === "dead");
  if (dead)
    return {
      kind: "revive",
      targetHeroId: dead.id,
      payment: (crew?.economy.gold ?? 0) >= 2 * dead.power ? "gold" : "debt",
    };
  if (view.phase.kind !== "camp") return null;
  const slots = {
    blade: "weapon",
    "piercing-blade": "weapon",
    "ward-vest": "armor",
    "guard-coat": "armor",
    "calm-charm": "charm",
    "healer-charm": "charm",
    "haste-charm": "charm",
  } as const;
  const gear = hero.inventory.backpack.find(
    (i) => i.kind in slots && !hero.inventory.equipment[slots[i.kind as keyof typeof slots]],
  );
  if (gear) return { kind: "equip", itemId: gear.id };
  const allowance = Math.min(view.shop?.allowances[hero.id] ?? 0, crew?.economy.gold ?? 0);
  const freeRest = view.restAvailable && !view.recoveryAvailable && node?.kind === "camp";
  if (!freeRest && hero.hp < 3 * hero.power && allowance >= hero.power)
    return { kind: "treat", treatment: { kind: "heal" } };
  const injury = hero.conditions.injuries[0];
  if (injury && allowance >= hero.power * 2)
    return { kind: "treat", treatment: { kind: "injury", injury } };
  const affliction = hero.conditions.afflictions.find((a) => a.kind === "doubtful");
  if (affliction && allowance >= hero.power * 2)
    return { kind: "treat", treatment: { kind: "affliction", affliction: affliction.kind } };
  const healing =
    node?.kind === "merchant"
      ? view.shop?.offers[hero.id]?.find(
          (o) => o.kind === "draught" && o.stock && o.price <= allowance,
        )
      : undefined;
  if (
    hero.inventory.equipment.weapon &&
    hero.inventory.backpack.length < 6 &&
    healing &&
    !hero.inventory.backpack.some((i) => i.kind === "draught")
  )
    return { kind: "buy", offerId: healing.id };
  const offer =
    node?.kind === "merchant"
      ? view.shop?.offers[hero.id]?.find(
          (o) =>
            o.stock &&
            o.price <= allowance &&
            o.kind in slots &&
            !hero.inventory.equipment[slots[o.kind as keyof typeof slots]],
        )
      : undefined;
  if (offer && hero.inventory.backpack.length < 6) return { kind: "buy", offerId: offer.id };
  if (
    healing &&
    hero.inventory.backpack.length < 6 &&
    !hero.inventory.backpack.some((i) => i.kind === "draught")
  )
    return { kind: "buy", offerId: healing.id };
  if (hero.stress >= 4 && allowance >= hero.power)
    return { kind: "treat", treatment: { kind: "calm" } };
  return null;
}

export function botCamp(view: PlayerRoomView): import("../../shared/command-types.js").CampChoice {
  const crew = view.crews.find((c) => c.id === view.self.crewId);
  if (crew?.status === "eliminated") return "rescue";
  if (!view.restAvailable) return "continue";
  if (view.recoveryAvailable) return "continue";
  const node = view.expeditionMap?.nodes.find((n) => n.id === crew?.mapPosition?.nodeId);
  return node?.kind === "camp" ? "rest" : "continue";
}

export function botPlan(view: PlayerRoomView): import("../../shared/turn-plans.js").TurnPlan {
  const action = botAction(view);
  const charm = view.hero?.inventory.equipment.charm;
  const follow =
    view.legalActions.find(
      (a) => a.kind === "attack" && (!("enemyId" in action) || a.enemyId === action.enemyId),
    ) ?? view.legalActions.find((a) => a.kind === "attack");
  if (
    action.kind !== "ward" &&
    action.kind !== "observe" &&
    follow?.kind === "attack" &&
    charm?.kind === "haste-charm" &&
    !view.hero?.encounterUses.includes("haste")
  )
    return {
      kind: "hero",
      actions: [action, follow],
      activation: { kind: "haste", itemId: charm.id },
      inventoryRevision: view.hero?.inventory.revision ?? 0,
    };
  return action.kind === "ward" || action.kind === "observe"
    ? { kind: "spirit", action }
    : {
        kind: "hero",
        actions: [action],
        activation: null,
        inventoryRevision: view.hero?.inventory.revision ?? 0,
      };
}
