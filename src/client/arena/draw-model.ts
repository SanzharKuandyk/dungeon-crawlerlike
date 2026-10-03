import Phaser from "phaser";
import type { ClassId } from "../../shared/content-types.js";

export function heroModel(scene: Phaser.Scene, classId: ClassId, color: number) {
  const g = scene.add.graphics();
  g.lineStyle(3, 0x18181b);
  g.fillStyle(0x333337);
  g.fillRect(-19, 23, 14, 24).fillRect(6, 23, 14, 24);
  g.fillStyle(color);
  const coat = new Phaser.Curves.Path(-17, -16)
    .quadraticBezierTo(16, -16, 0, -21)
    .quadraticBezierTo(24, 26, 20, 5)
    .quadraticBezierTo(-24, 26, 0, 33)
    .closePath()
    .getPoints(12);
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

export { enemyModel } from "./enemy-model.js";
