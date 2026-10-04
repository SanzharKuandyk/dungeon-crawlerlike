import type Phaser from "phaser";
import type { Hero, RoomEncounter } from "../../shared/game-types.js";
import { colorNumber } from "../../shared/palette.js";
import { enemyModel, heroModel } from "./draw-model.js";

export type BattleActor = {
  root: Phaser.GameObjects.Container;
  model: Phaser.GameObjects.Graphics;
  health: Phaser.GameObjects.Graphics;
  conditions: Phaser.GameObjects.Graphics;
  title: Phaser.GameObjects.Text;
  detail: Phaser.GameObjects.Text;
  x: number;
  y: number;
  dead: boolean;
};

function actor(
  scene: Phaser.Scene,
  model: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
): BattleActor {
  const root = scene.add.container(x, y);
  const shadow = scene.add.ellipse(0, 0, 90, 15, 0x18181b, 0.18);
  const health = scene.add.graphics();
  const conditions = scene.add.graphics().setPosition(0, -70).setScale(1.45);
  const style = {
    fontFamily: "Arial",
    fontSize: "23px",
    color: "#18181b",
    backgroundColor: "#ffffff",
  };
  const title = scene.add.text(0, 24, "", { ...style, fontStyle: "bold" }).setOrigin(0.5);
  const detail = scene.add.text(0, 70, "", { ...style, fontSize: "20px" }).setOrigin(0.5);
  root.add([shadow, model, conditions, title, health, detail]);
  return { root, model, conditions, health, title, detail, x, y, dead: false };
}

export function createHeroActor(
  scene: Phaser.Scene,
  hero: Hero,
  color: string,
  name: string,
  x: number,
  y: number,
) {
  const entry = actor(scene, heroModel(scene, hero.classId, colorNumber(color)), x, y);
  entry.title.setText(name).setColor(color);
  return entry;
}

export function createEnemyActor(
  scene: Phaser.Scene,
  encounter: RoomEncounter,
  x: number,
  y: number,
) {
  const entry = actor(scene, enemyModel(scene, encounter.definition.family), x, y);
  entry.title.setText(encounter.definition.family.toUpperCase());
  return entry;
}

export function updateActor(
  entry: BattleActor,
  hp: number,
  maxHp: number,
  _detail: string,
  dead: boolean,
  enemy = false,
) {
  entry.dead = dead;
  entry.model
    .setPosition(0, enemy ? -95 : -70)
    .setScale(enemy ? 0.92 : 1.45)
    .setAlpha(dead ? 0.3 : 1);
  entry.root.setPosition(entry.x, entry.y);
  entry.health.clear().fillStyle(0xd8d8d8).fillRoundedRect(-55, 49, 110, 8, 4);
  if (hp > 0)
    entry.health
      .fillStyle(0x18181b)
      .fillRoundedRect(-55, 49, Math.max(4, (110 * hp) / maxHp), 8, 4);
  entry.detail.setText(dead ? "FALLEN" : `${hp}/${maxHp}`);
}

export function updateHeroConditions(entry: BattleActor, hero: Hero) {
  const g = entry.conditions.clear().setAlpha(hero.status === "dead" ? 0.3 : 1);
  const bandage = (x: number, y: number) => {
    g.fillStyle(0xffffff).lineStyle(1, 0x18181b);
    g.fillRoundedRect(x, y, 13, 9, 2).strokeRoundedRect(x, y, 13, 9, 2);
    g.lineBetween(x + 3, y, x + 6, y + 9).lineBetween(x + 7, y, x + 10, y + 9);
  };
  if (hero.conditions.injuries.includes("arm")) bandage(14, 5);
  if (hero.conditions.injuries.includes("leg")) bandage(-19, 33);
  if (hero.conditions.combatEffects.some((e) => e.kind === "bleed")) {
    g.fillStyle(0x18181b).fillCircle(-27, 17, 3).fillCircle(-28, 27, 2);
  }
  if (hero.stress >= 4) {
    g.lineStyle(2, hero.stress >= 7 ? 0x9c3d2e : 0x9d6a18);
    g.strokeCircle(0, -55, 19);
    g.lineBetween(-4, -62, 3, -57).lineBetween(3, -57, -3, -52).lineBetween(-3, -52, 3, -47);
  }
}
