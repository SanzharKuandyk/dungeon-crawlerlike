import Phaser from "phaser";
import { CLASS_NAMES } from "../../shared/display-names.js";
import type { ArenaState } from "../../shared/game-types.js";
import { teamColor } from "../../shared/palette.js";
import type { RoomView } from "../../shared/view-types.js";
import { animateEffects } from "./animate-events.js";
import {
  type BattleActor,
  createEnemyActor,
  createHeroActor,
  updateActor,
  updateHeroConditions,
} from "./battle-actors.js";

export class DungeonScene extends Phaser.Scene {
  private actors = new Map<string, BattleActor>();
  private background: Phaser.GameObjects.Image | null = null;
  private seal: Phaser.GameObjects.Graphics | null = null;
  private targetMarker: Phaser.GameObjects.Graphics | null = null;
  private effects: Phaser.GameObjects.Graphics | null = null;
  private labels: Phaser.GameObjects.Text[] = [];
  private roomKey = "";
  private revision = -1;
  private received = 0;
  private current: {
    view: RoomView;
    arena: ArenaState;
    roomId: string | null;
    reduced: boolean;
    crewId: string | null;
    targetId: string | null;
  } | null = null;

  constructor() {
    super("dungeon");
  }

  preload() {
    for (const family of ["sentinel", "seer", "devourer", "camp", "merchant"])
      this.load.svg(`room-${family}`, `/assets/rooms/${family}.svg`);
  }

  create() {
    this.background = this.add.image(600, 290, "room-camp").setDisplaySize(1200, 580);

    this.targetMarker = this.add.graphics().setDepth(1);
    this.seal = this.add.graphics().setDepth(5);
    this.effects = this.add.graphics().setDepth(10);
    for (let index = 0; index < 24; index++)
      this.labels.push(
        this.add
          .text(0, 0, "", {
            fontFamily: "Arial",
            fontSize: "26px",
            fontStyle: "bold",
            backgroundColor: "#ffffff",
            padding: { x: 6, y: 3 },
          })
          .setOrigin(0.5)
          .setDepth(11)
          .setVisible(false),
      );
    if (this.current) this.refresh();
  }

  renderArena(
    view: RoomView,
    arena: ArenaState,
    roomId: string | null,
    _actor: string | null,
    reduced: boolean,
    crewId: string | null = null,
    targetId: string | null = null,
  ) {
    this.current = { view, arena, roomId, reduced, crewId, targetId };
    if (this.revision !== view.revision) {
      this.revision = view.revision;
      this.received = Date.now();
    }
    if (this.background) this.refresh();
  }

  private refresh() {
    if (!this.current || !this.background) return;
    const { view, arena, roomId, crewId, targetId } = this.current;
    this.targetMarker?.clear();
    const encounter = arena.encounters.find((entry) => entry.id === roomId);
    const champion = view.duels.some((d) => d.id === encounter?.id && !!d.npc);
    const rivalry = !!encounter?.rivalry && !champion;
    const selectedCrew = arena.crews.find((crew) => crew.id === crewId);
    const node = view.chapterMaps
      ?.flatMap((map) => map.nodes)
      .find((node) => node.id === selectedCrew?.mapPosition?.nodeId);
    const key =
      encounter?.definition.family ??
      (["merchant", "altar", "shrine"].includes(node?.kind ?? "") ? "merchant" : "camp");
    if (key !== this.roomKey) {
      this.background.setTexture(`room-${key}`).setDisplaySize(1200, 580);
      this.roomKey = key;
    }
    const heroes = arena.heroes
      .filter((hero) =>
        crewId && !encounter?.rivalry
          ? hero.crewId === crewId
          : arena.crews.some(
              (crew) =>
                crew.id === hero.crewId &&
                (roomId
                  ? crew.location.kind === "room" && crew.location.roomId === roomId
                  : crew.location.kind === "camp"),
            ),
      )
      .slice(0, rivalry ? 8 : 4);
    const visible = new Set(heroes.map((hero) => hero.id));
    if (encounter && (!encounter.rivalry || champion)) visible.add(encounter.id);
    for (const [id, actor] of this.actors)
      if (!visible.has(id)) {
        actor.root.destroy(true);
        this.actors.delete(id);
      }
    for (const [index, hero] of heroes.entries()) {
      const crew = arena.crews.find((entry) => entry.id === hero.crewId);
      const allies = heroes.filter((member) => member.crewId === hero.crewId);
      const side = rivalry && hero.crewId !== crewId ? 0 : 600;
      const x = rivalry
        ? side + ((allies.indexOf(hero) + 0.5) * 560) / allies.length
        : 600 + ((index + 0.5) * 560) / Math.max(1, heroes.length);
      let actor = this.actors.get(hero.id);
      if (!actor) {
        const name =
          view.players.find((entry) => entry.id === hero.playerId)?.name ??
          CLASS_NAMES[hero.classId];
        actor = createHeroActor(
          this,
          hero,
          teamColor(crew?.colorId ?? "blue").hex,
          view.role === "player" && view.self.id === hero.playerId
            ? "YOU"
            : name.length > 10
              ? `${name.slice(0, 6)}…${name.slice(-3)}`
              : name,
          x,
          436,
        );
        this.actors.set(hero.id, actor);
      }
      actor.x = x;
      if (hero.id === targetId) {
        const color = Number.parseInt(teamColor(crew?.colorId ?? "blue").hex.slice(1), 16);
        this.targetMarker?.lineStyle(4, color).strokeEllipse(x, 436, 112, 28);
      }
      updateHeroConditions(actor, hero);
      updateActor(
        actor,
        hero.hp,
        hero.maxHp,
        `${hero.stress}/10 stress${hero.conditions.injuries.length ? " · injured" : ""}`,
        hero.status === "dead",
      );
    }
    if (encounter && (!encounter.rivalry || champion)) {
      let actor = this.actors.get(encounter.id);
      if (!actor) {
        actor = createEnemyActor(this, encounter, 245, 436);
        if (champion) actor.title.setText("CHAMPION");
        this.actors.set(encounter.id, actor);
      }
      updateActor(
        actor,
        encounter.bodyHp,
        encounter.maxBodyHp,
        `seal ${encounter.weakHp} · shield ${encounter.shield}`,
        encounter.bodyHp === 0,
        true,
      );

      actor.detail.setVisible(
        encounter.weakHp > 0 || encounter.bodyHp === 0 || !!encounter.rivalry,
      );
      actor.health.setVisible(
        encounter.weakHp > 0 || encounter.bodyHp === 0 || !!encounter.rivalry,
      );
    }
  }

  update() {
    if (!this.current || !this.effects) return;
    const { view, reduced } = this.current;
    for (const actor of this.actors.values()) {
      actor.model.x = 0;
      actor.model.rotation = actor.dead ? -0.35 : 0;
      actor.root.x = actor.x;
    }
    const elapsed =
      view.status === "paused"
        ? view.phaseDuration - (view.remaining ?? view.phaseDuration)
        : view.serverNow + Date.now() - this.received - view.phaseStartedAt;
    const fraction = view.phaseDuration > 0 ? elapsed / view.phaseDuration : 1;
    const events = ["combat-reveal", "camp-reveal"].includes(view.phase.kind)
      ? view.events.filter((event) => event.kind === "effect")
      : [];
    if (this.seal) {
      this.seal.clear();
      if (view.quizActive) {
        const opening =
          view.phase.kind === "question-intro"
            ? Math.min(1, fraction)
            : view.phase.kind === "return"
              ? 1 - Math.min(1, fraction)
              : 1;
        const radius = reduced ? 110 : 70 + opening * 40;
        this.seal.fillStyle(0x211c2e, 0.15).fillRect(0, 0, 1200, 580);
        this.seal
          .lineStyle(5, 0x65538a, opening)
          .strokeCircle(600, 235, radius)
          .strokeCircle(600, 235, radius - 20);
        this.seal
          .strokeEllipse(600, 235, radius * 1.25, radius * 0.65)
          .fillStyle(0x65538a, opening)
          .fillEllipse(600, 235, 20, 45);
      }
    }
    animateEffects(this.effects, this.labels, this.actors, events, fraction, reduced);
  }
}
