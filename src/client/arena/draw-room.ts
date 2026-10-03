import type Phaser from "phaser";
import type { RoomEncounter } from "../../shared/game-types.js";
import { NEUTRALS } from "../../shared/palette.js";

export function drawRoom(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  encounter: RoomEncounter | null,
) {
  if (encounter)
    layer.add(
      scene.add.image(600, 290, `room-${encounter.definition.family}`).setDisplaySize(1200, 580),
    );
  else
    layer.add(
      scene.add.rectangle(600, 290, 1200, 580, Number.parseInt(NEUTRALS.background.slice(1), 16)),
    );
  layer.add(
    scene.add.text(36, 26, encounter ? encounter.definition.name : "The campfire", {
      fontFamily: "Arial",
      fontSize: "24px",
      fontStyle: "bold",
      color: NEUTRALS.text,
    }),
  );
}
