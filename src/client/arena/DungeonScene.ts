import Phaser from "phaser";
import type { ArenaState } from "../../shared/game-types.js";
import { NEUTRALS } from "../../shared/palette.js";
import type { RoomView } from "../../shared/view-types.js";
import { animateEvents } from "./animate-events.js";
import { drawEnemy } from "./draw-enemy.js";
import { drawHeroes } from "./draw-heroes.js";
import { drawRoom } from "./draw-room.js";
export class DungeonScene extends Phaser.Scene {
  private layer: Phaser.GameObjects.Container | null = null;
  private signature = "";
  private queued: {
    view: RoomView;
    arena: ArenaState;
    roomId: string | null;
    actor: string | null;
    reduced: boolean;
    crewId: string | null;
  } | null = null;
  constructor() {
    super("dungeon");
  }
  preload() {
    for (const id of ["sentinel", "seer", "devourer"]) {
      this.load.svg(`room-${id}`, `/assets/rooms/${id}.svg`);
    }
  }
  create() {
    if (this.queued) {
      const q = this.queued;
      this.renderArena(q.view, q.arena, q.roomId, q.actor, q.reduced, q.crewId);
    }
  }
  renderArena(
    view: RoomView,
    arena: ArenaState,
    roomId: string | null,
    actor: string | null,
    reduced: boolean,
    crewId: string | null = null,
  ) {
    this.queued = { view, arena, roomId, actor, reduced, crewId };
    if (!this.sys.isActive()) return;
    const signature = JSON.stringify([
      arena,
      roomId,
      actor,
      view.role === "player" ? view.self.id : null,
      reduced,
      crewId,
    ]);
    if (signature === this.signature) return;
    const changed = this.signature !== "";
    this.signature = signature;
    this.layer?.destroy(true);
    this.layer = this.add.container();
    const encounter = arena.encounters.find((e) => e.id === roomId) ?? null;
    drawRoom(this, this.layer, encounter);
    if (encounter && !encounter.rivalry) drawEnemy(this, this.layer, encounter);
    if (encounter?.rivalry)
      this.layer.add(
        this.add
          .text(600, 95, "LETHAL RIVALRY", {
            fontSize: "22px",
            color: NEUTRALS.text,
            fontFamily: "Arial",
          })
          .setOrigin(0.5),
      );
    drawHeroes(this, this.layer, arena, view, encounter?.id ?? null, actor, crewId);
    if (changed && actor) animateEvents(this, this.layer, reduced);
  }
}
