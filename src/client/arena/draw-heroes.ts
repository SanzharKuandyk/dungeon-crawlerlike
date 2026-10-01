import type Phaser from "phaser";
import type { ArenaState, Hero } from "../../shared/game-types.js";
import { colorNumber, NEUTRALS, teamColor } from "../../shared/palette.js";
import type { RoomView } from "../../shared/view-types.js";
import { heroModel } from "./draw-model.js";
export function drawHeroes(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  arena: ArenaState,
  view: RoomView,
  roomId: string | null,
  actor: string | null,
) {
  const own = view.role === "player" ? view.self.id : null;
  let heroes = arena.heroes.filter((h) =>
    arena.crews.some(
      (c) =>
        c.id === h.crewId &&
        (roomId
          ? c.location.kind === "room" && c.location.roomId === roomId
          : c.location.kind === "camp"),
    ),
  );
  if (heroes.length > 8) {
    const distinct = heroes
      .filter((h, i, all) => all.findIndex((v) => v.crewId === h.crewId) === i)
      .slice(0, 6);
    const important = heroes.find((h) => h.id === actor || h.playerId === own);
    if (important && !distinct.includes(important)) distinct[0] = important;
    heroes = distinct;
  }
  const count = heroes.length;
  const gap = Math.min(155, 1050 / Math.max(1, count));
  for (const [i, h] of heroes.entries())
    drawHero(
      scene,
      layer,
      h,
      arena,
      view,
      600 + (i - (count - 1) / 2) * gap,
      490,
      actor === h.id,
      own === h.playerId,
    );
  if (!count)
    layer.add(
      scene.add
        .text(600, 490, "No characters in this room", {
          fontSize: "18px",
          fontFamily: "Arial",
          color: NEUTRALS.muted,
        })
        .setOrigin(0.5),
    );
}
function drawHero(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  h: Hero,
  arena: ArenaState,
  view: RoomView,
  x: number,
  y: number,
  active: boolean,
  self: boolean,
) {
  const crew = arena.crews.find((c) => c.id === h.crewId);
  const color = teamColor(crew?.colorId ?? "blue").hex;
  const circle = scene.add
    .circle(x, y, 43, colorNumber(color), h.status === "dead" ? 0.15 : 0.12)
    .setStrokeStyle(active ? 4 : self ? 3 : 1, colorNumber(color));
  layer.add(circle);
  layer.add(
    heroModel(scene, h.classId, colorNumber(color))
      .setPosition(x, y - 5)
      .setScale(0.72)
      .setAlpha(h.status === "dead" ? 0.35 : 1),
  );
  const name = view.players.find((p) => p.id === h.playerId)?.name ?? "Character";
  layer.add(
    scene.add
      .text(x, y + 50, `${crew?.symbol ?? ""} · ${name}${self ? " · YOU" : ""}`, {
        fontSize: "12px",
        fontFamily: "Arial",
        fontStyle: "bold",
        color,
      })
      .setOrigin(0.5),
  );
  layer.add(
    scene.add
      .text(
        x,
        y + 69,
        h.status === "dead" ? "SPIRIT" : `${h.hp}/${h.maxHp} HP · ${h.stress}/6 stress`,
        { fontSize: "11px", fontFamily: "Arial", color: NEUTRALS.muted },
      )
      .setOrigin(0.5),
  );
}
