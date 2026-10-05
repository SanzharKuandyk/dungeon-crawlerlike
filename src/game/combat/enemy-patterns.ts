import DEFAULT_PATTERNS from "../../../content/dungeon/enemies.json" with { type: "json" };
import type { EnemyInstance, StructuredIntent } from "../../shared/encounter-types.js";
import type { EnemyPatternId, EnemyPatterns } from "../../shared/enemy-content-types.js";
import type { Hero, RoomEncounter } from "../../shared/game-types.js";

export function enemyMove(
  enemy: EnemyInstance,
  encounter: RoomEncounter,
  heroes: Hero[],
  turn: number,
  index = 0,
): StructuredIntent {
  const patternId: EnemyPatternId =
    encounter.kind === "boss"
      ? encounter.chapter === 1
        ? "iron-warden"
        : "hollow-regent"
      : enemy.role;
  const pattern = encounter.patterns?.[patternId] ?? (DEFAULT_PATTERNS as EnemyPatterns)[patternId];
  const move = pattern.moves[(turn - 1) % 3];
  const living = heroes.filter((hero) => hero.status === "alive");
  const target =
    move.target === "none"
      ? null
      : move.target === "wounded"
        ? living
            .slice()
            .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.id.localeCompare(b.id))[0]
        : living[(turn - 1 + index) % Math.max(1, living.length)];
  const recipient =
    move.recipient === "self"
      ? enemy
      : move.recipient === "ally"
        ? encounter.enemies.find((other) => other.id !== enemy.id && other.hp > 0)
        : null;
  return {
    moveId: `${patternId}:${move.id}:${encounter.bossPhase}`,
    name: move.name,
    blockGain: recipient ? Math.ceil(encounter.spawnPower * move.blockPower) : 0,
    recipientEnemyId: recipient?.id ?? null,
    targets: !target
      ? []
      : [
          {
            heroId: target.id,
            damage: Math.floor(
              target.power *
                (move.damagePower + (encounter.bossPhase === 3 ? move.finalPhaseDamagePower : 0)),
            ),
            stress: move.stress + (move.stressPerPhase ? encounter.bossPhase : 0),
            bleed: move.bleed,
            injury: move.injury,
            injuryChance: move.injuryChance,
          },
        ],
  };
}
export function publishIntents(encounter: RoomEncounter, heroes: Hero[], turn: number) {
  encounter.enemies.forEach((enemy, index) => {
    enemy.intent = enemyMove(enemy, encounter, heroes, turn, index);
  });
}
export function publishedIntent(
  encounter: RoomEncounter,
  _heroes: Hero[],
  _turn: number,
): StructuredIntent {
  const living = encounter.enemies.filter((e) => e.hp > 0);
  return {
    moveId: living.map((e) => e.intent.moveId).join("+"),
    name: living.map((e) => `${e.name}: ${e.intent.name}`).join(" · "),
    targets: living.flatMap((e) => e.intent.targets),
    blockGain: living.reduce((sum, e) => sum + e.intent.blockGain, 0),
    recipientEnemyId: null,
  };
}
