import Phaser from "phaser";
import type { ClassId, EnemyFamily } from "../../shared/content-types.js";

const points = (...pairs: [number, number][]) =>
  pairs.map(([x, y]) => new Phaser.Math.Vector2(x, y));

export function heroModel(scene: Phaser.Scene, classId: ClassId, color: number) {
  const g = scene.add.graphics();
  g.lineStyle(3, 0x18181b);
  g.fillStyle(0x333337);
  g.fillRect(-19, 23, 14, 24).fillRect(6, 23, 14, 24);
  g.fillStyle(color);
  const coat = points([-17, -16], [16, -16], [24, 26], [-24, 26]);
  g.fillPoints(coat, true).strokePoints(coat, true);
  g.fillStyle(0xfffaf0).fillCircle(0, -32, 15);
  g.strokeCircle(0, -32, 15);
  if (classId === "knight") {
    g.fillStyle(0xdedee2).fillRect(-17, -48, 34, 27);
    g.strokeRect(-17, -48, 34, 27);
    g.lineBetween(-15, -32, 15, -32);
    g.fillStyle(color).fillRect(25, -12, 20, 31);
    g.strokeRect(25, -12, 20, 31);
    g.lineBetween(-31, -41, -31, 28);
  } else if (classId === "physician") {
    g.fillStyle(0xffffff).fillRect(-17, -47, 34, 13);
    g.strokeRect(-17, -47, 34, 13);
    g.lineBetween(-5, -40, 5, -40).lineBetween(0, -45, 0, -35);
    g.fillStyle(0xffffff).fillRoundedRect(27, 5, 16, 21, 3);
    g.strokeRoundedRect(27, 5, 16, 21, 3);
  } else if (classId === "occultist" || classId === "wanderer") {
    g.fillStyle(color).fillTriangle(-23, -22, 0, -60, 24, -22);
    g.strokeTriangle(-23, -22, 0, -60, 24, -22);
    g.fillStyle(0x18181b).fillRect(-9, -35, 18, 11);
    g.lineBetween(36, -41, 36, 44);
    if (classId === "occultist") {
      g.fillStyle(0xffffff).fillCircle(36, -48, 9);
      g.strokeCircle(36, -48, 9);
    }
  } else {
    g.fillStyle(0x333337).fillTriangle(-25, -34, 0, -58, 25, -34);
    if (classId === "exorcist") {
      g.lineBetween(35, -35, 35, 46).lineBetween(26, -20, 44, -20);
      g.lineStyle(3, 0xffffff).lineBetween(-12, -8, 14, 18).lineBetween(12, -8, -14, 18);
    } else {
      g.fillStyle(0xdedee2).fillTriangle(30, 25, 43, -20, 41, 28);
    }
  }
  return g;
}

export function enemyModel(scene: Phaser.Scene, family: EnemyFamily) {
  const g = scene.add.graphics().lineStyle(4, 0x18181b).fillStyle(0x18181b);
  if (family === "sentinel") {
    g.fillTriangle(-80, 80, 0, -110, 80, 80);
    g.fillRoundedRect(-40, -100, 80, 95, 8);
    g.lineStyle(5, 0xfafaf9).lineBetween(-26, -68, 26, -68).lineBetween(0, -90, 0, -32);
    g.lineStyle(8, 0x18181b).lineBetween(-100, -65, -100, 95);
    g.fillRect(-121, -83, 42, 30);
  } else if (family === "seer") {
    g.fillEllipse(0, -10, 170, 180).fillTriangle(-80, 85, 0, -100, 80, 85);
    g.fillStyle(0xfafaf9).fillEllipse(0, -30, 88, 36);
    g.fillStyle(0x18181b).fillCircle(0, -30, 14);
  } else {
    g.fillPoints(
      points(
        [-95, 80],
        [-110, -20],
        [-75, -100],
        [-25, -65],
        [0, -115],
        [25, -65],
        [75, -100],
        [110, -20],
        [95, 80],
      ),
      true,
    );
    g.fillStyle(0xfafaf9).fillEllipse(0, 0, 148, 102);
    g.fillStyle(0x18181b);
    for (let x = -55; x <= 55; x += 22) {
      g.fillTriangle(x - 9, -37, x + 9, -37, x, -4);
      g.fillTriangle(x - 9, 37, x + 9, 37, x, 5);
    }
  }
  return g;
}
