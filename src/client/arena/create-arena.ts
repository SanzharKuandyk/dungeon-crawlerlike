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
    scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.NO_CENTER, expandParent: false },
  });
  const fitCanvas = () => {
    if (!game.canvas) return;
    game.canvas.style.width = "100%";
    game.canvas.style.height = "100%";
    game.canvas.style.margin = "0";
  };
  game.events.on(Phaser.Core.Events.POST_RENDER, () => {
    if (game.canvas.style.width !== "100%") fitCanvas();
  });
  return { game, scene };
}
