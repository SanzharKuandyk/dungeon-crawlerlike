import type Phaser from "phaser";
import type { GameEvent } from "../../shared/event-types.js";
import type { BattleActor } from "./battle-actors.js";

type EffectEvent = Extract<GameEvent, { kind: "effect" }>;

export function animateEffects(
  graphics: Phaser.GameObjects.Graphics,
  labels: Phaser.GameObjects.Text[],
  actors: Map<string, BattleActor>,
  events: EffectEvent[],
  fraction: number,
  reduced: boolean,
) {
  graphics.clear();
  for (const label of labels) label.setVisible(false);
  let labelIndex = 0;
  const shownLabels = new Set<string>();
  for (const event of events) {
    const effect = event.effect;
    const source = actors.get(event.actor);
    const target = actors.get(effect.target);
    if (!target) continue;
    const age = fraction - event.at;
    if (age < -0.1 || age > 0.16) continue;
    const color =
      effect.type === "heal"
        ? 0x137b51
        : ["barrier", "ward"].includes(effect.type)
          ? 0x2165ac
          : 0xb93228;
    if (effect.type === "hit" && source) {
      const direction = Math.sign(target.x - source.x);
      if (!reduced && age < 0) {
        const anticipation = Math.min(1, Math.max(0, (age + 0.1) / 0.1));
        source.model.x =
          direction *
          (anticipation < 0.45 ? (-18 * anticipation) / 0.45 : (70 * (anticipation - 0.45)) / 0.55);
        if (["hex", "channel", "seer"].includes(effect.action)) {
          graphics
            .fillStyle(color, 0.9)
            .fillCircle(source.x + (target.x - source.x) * anticipation, source.y - 115, 12);
        }
      }
      if (age >= 0 && age < 0.06) {
        graphics
          .lineStyle(7, color, 1 - age / 0.06)
          .lineBetween(target.x - 30, target.y - 135, target.x + 30, target.y - 75);
        if (!reduced) target.root.x = target.x + Math.sin(age * 360) * 6;
      }
    } else if (age >= 0 && age < 0.12) {
      graphics
        .lineStyle(5, color, 1 - age / 0.12)
        .strokeEllipse(target.x, target.y - 85, 95 + age * 160, 165);
      if (!reduced && effect.type === "death") target.model.setRotation(Math.min(1.2, age * 10));
    }
    const labelKey = `${event.at}:${effect.target}:${effect.type}`;
    if (age >= 0 && labelIndex < labels.length && !shownLabels.has(labelKey)) {
      shownLabels.add(labelKey);
      const hits = events.filter(
        (other) =>
          other.at === event.at &&
          other.effect.target === effect.target &&
          other.effect.type === "hit",
      );
      const damage = hits.reduce(
        (sum, other) => sum + (other.effect.type === "hit" ? other.effect.damage : 0),
        0,
      );
      const blocked = hits.reduce(
        (sum, other) => sum + (other.effect.type === "hit" ? other.effect.blocked : 0),
        0,
      );
      const text =
        effect.type === "hit"
          ? `${damage ? `−${damage}` : "BLOCK"}${blocked ? ` · ${blocked} blocked` : ""}`
          : effect.type === "heal"
            ? `+${effect.amount} HP`
            : effect.type === "barrier" || effect.type === "ward"
              ? `+${effect.amount} shield`
              : effect.type === "death"
                ? "SPIRIT"
                : effect.type.toUpperCase();
      labels[labelIndex++]
        .setText(text)
        .setColor(`#${color.toString(16).padStart(6, "0")}`)
        .setPosition(target.x, target.y - 190 - (reduced ? 0 : age * 160))
        .setAlpha(Math.min(1, (0.16 - age) * 15))
        .setVisible(true);
    }
  }
}
