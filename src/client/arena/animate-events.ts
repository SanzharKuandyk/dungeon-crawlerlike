import type Phaser from "phaser";
import { colorNumber, NEUTRALS } from "../../shared/palette.js";
export function animateEvents(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  reduced: boolean,
) {
  if (reduced) return;
  const ring = scene.add
    .circle(600, 245, 105)
    .setStrokeStyle(3, colorNumber(NEUTRALS.strongBorder));
  layer.add(ring);
  scene.tweens.add({ targets: ring, alpha: 0, scale: 1.2, duration: 240 });
}
