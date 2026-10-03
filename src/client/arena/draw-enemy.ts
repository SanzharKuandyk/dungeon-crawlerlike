import type Phaser from "phaser";
import type { RoomEncounter } from "../../shared/game-types.js";
import { NEUTRALS } from "../../shared/palette.js";
import { enemyModel } from "./draw-model.js";

export function drawEnemy(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  e: RoomEncounter,
) {
  const image = enemyModel(scene, e.definition.family)
    .setPosition(250, 270)
    .setAlpha(e.bodyHp > 0 ? 1 : 0.2);
  layer.add(image);
  layer.add(
    scene.add
      .text(250, 137, e.definition.family.toUpperCase(), {
        fontFamily: "Arial",
        fontSize: "14px",
        fontStyle: "bold",
        color: NEUTRALS.muted,
      })
      .setOrigin(0.5),
  );
  layer.add(
    scene.add
      .text(250, 397, e.bodyHp === 0 ? "DEFEATED" : `${e.bodyHp}/${e.maxBodyHp} HEALTH`, {
        fontFamily: "Arial",
        fontSize: "18px",
        fontStyle: "bold",
        color: NEUTRALS.text,
      })
      .setOrigin(0.5),
  );
  layer.add(
    scene.add
      .text(
        250,
        424,
        e.weakHp > 0 ? `WEAK POINT ${e.weakHp}/${e.maxWeakHp}` : "WEAK POINT BROKEN",
        { fontFamily: "Arial", fontSize: "12px", color: NEUTRALS.muted },
      )
      .setOrigin(0.5),
  );
}
