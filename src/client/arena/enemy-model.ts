import Phaser from "phaser";
import type { EnemyFamily } from "../../shared/content-types.js";

const INK = 0x25242b;
const PAPER = 0xfffcf5;

export function enemyModel(scene: Phaser.Scene, family: EnemyFamily) {
  const g = scene.add.graphics().lineStyle(4, INK).fillStyle(INK);
  const shape = (path: Phaser.Curves.Path, fill: number) => {
    const points = path.closePath().getPoints(20);
    g.fillStyle(fill).fillPoints(points, true).strokePoints(points, true);
  };
  if (family === "sentinel") {
    shape(
      new Phaser.Curves.Path(-55, -25)
        .quadraticBezierTo(55, -25, 0, -65)
        .quadraticBezierTo(67, 74, 73, 10)
        .lineTo(28, 91)
        .lineTo(0, 67)
        .lineTo(-28, 91)
        .lineTo(-67, 74),
      0x74757b,
    );
    shape(
      new Phaser.Curves.Path(-40, -90)
        .quadraticBezierTo(40, -90, 0, -122)
        .lineTo(36, -35)
        .quadraticBezierTo(-36, -35, 0, -15),
      0xbec1c6,
    );
    g.lineStyle(6, INK).lineBetween(-30, -64, 30, -64);
    g.lineStyle(4, INK).lineBetween(0, -85, 0, -38);
    g.fillStyle(PAPER).fillCircle(0, 2, 19).strokeCircle(0, 2, 19);
    g.lineBetween(-9, 2, 9, 2).lineBetween(0, -7, 0, 11);
    g.lineStyle(9, INK).lineBetween(-94, -40, -94, 94);
    g.fillStyle(0x74757b)
      .fillRoundedRect(-120, -65, 52, 37, 9)
      .strokeRoundedRect(-120, -65, 52, 37, 9);
    g.lineStyle(4, INK).lineBetween(48, 13, 76, 37);
  } else if (family === "seer") {
    shape(
      new Phaser.Curves.Path(0, -116)
        .quadraticBezierTo(59, -35, 82, -96)
        .quadraticBezierTo(88, 82, 35, 36)
        .quadraticBezierTo(0, 63, 53, 62)
        .quadraticBezierTo(-88, 82, -53, 62)
        .quadraticBezierTo(-59, -35, -35, 36)
        .quadraticBezierTo(0, -116, -82, -96),
      0x666278,
    );
    shape(
      new Phaser.Curves.Path(-45, -31)
        .quadraticBezierTo(45, -31, 0, -74)
        .quadraticBezierTo(-45, -31, 0, 4),
      PAPER,
    );
    g.fillStyle(INK).fillEllipse(0, -32, 16, 35);
    g.lineStyle(3, PAPER)
      .strokeCircle(0, 22, 14)
      .lineBetween(-28, 13, -41, 43)
      .lineBetween(28, 13, 41, 43);
    g.lineStyle(4, INK).strokeEllipse(0, -108, 104, 21);
  } else {
    shape(
      new Phaser.Curves.Path(-93, 82)
        .quadraticBezierTo(-86, -55, -127, -12)
        .quadraticBezierTo(0, -86, -58, -116)
        .quadraticBezierTo(86, -55, 58, -116)
        .quadraticBezierTo(93, 82, 127, -12)
        .quadraticBezierTo(-93, 82, 0, 102),
      0x7c6861,
    );
    shape(
      new Phaser.Curves.Path(-62, -16)
        .quadraticBezierTo(62, -16, 0, -63)
        .quadraticBezierTo(-62, -16, 0, 121),
      INK,
    );
    g.fillStyle(PAPER);
    for (const x of [-40, -20, 0, 20, 40]) {
      g.fillTriangle(x - 7, -18, x + 7, -18, x, 11);
      g.fillTriangle(x - 7, 47, x + 7, 47, x, 24);
    }
    g.fillStyle(PAPER).fillCircle(-38, -56, 8).fillCircle(38, -56, 8);
    g.fillStyle(INK).fillCircle(-37, -55, 3).fillCircle(37, -55, 3);
    g.lineStyle(5, INK).lineBetween(-77, 41, -98, 77).lineBetween(77, 41, 98, 77);
  }
  return g;
}
