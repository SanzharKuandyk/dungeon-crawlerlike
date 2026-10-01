import Phaser from "phaser";
import { NEUTRALS } from "../../shared/palette.js";
import { DungeonScene } from "./DungeonScene.js";
export function createArena(parent: HTMLElement) {
  const scene = new DungeonScene();
  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent,
    width: 1200,
    height: 580,
    backgroundColor: NEUTRALS.background,
    scene: [scene],
    audio: { noAudio: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, expandParent: false },
  });
  return { game, scene };
}
