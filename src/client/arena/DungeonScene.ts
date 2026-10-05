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
import { actorY, enemyX, heroX, sceneHeight } from "./scene-layout.js";

export class DungeonScene extends Phaser.Scene {
  private actors = new Map<string, BattleActor>();
  private background: Phaser.GameObjects.Image | null = null;
  private secondBackdrop: Phaser.GameObjects.Image | null = null;
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
    combatHud: boolean;
    rows: boolean;
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

    this.secondBackdrop = this.add
      .image(600, 750, "room-camp")
      .setDisplaySize(1200, 500)
      .setVisible(false);
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
    combatHud = false,
    rows = false,
  ) {
    this.current = { view, arena, roomId, reduced, crewId, targetId, combatHud, rows };
    if (this.revision !== view.revision) {
      this.revision = view.revision;
      this.received = Date.now();
    }
    if (this.background) this.refresh();
  }

  private refresh() {
    if (!this.current || !this.background) return;
    const { view, arena, roomId, crewId, targetId, combatHud, rows } = this.current;
    this.targetMarker?.clear();
    if (this.scale.gameSize.height !== sceneHeight(rows)) {
      this.scale.setGameSize(1200, sceneHeight(rows));
      this.cameras.main.setSize(1200, sceneHeight(rows));
    }
    this.background.setPosition(600, rows ? 250 : 290).setDisplaySize(1200, rows ? 500 : 580);
    this.secondBackdrop?.setVisible(rows);
    const encounter =
      view.role === "player" && view.recoveryAvailable
        ? undefined
        : arena.encounters.find((entry) => entry.id === roomId);
    const champion = view.duels.some((d) => d.id === encounter?.id && !!d.npc);
    const rivalry = !!encounter?.rivalry && !champion;
    const selectedCrew = arena.crews.find((crew) => crew.id === crewId);
    const node = view.chapterMaps
      ?.flatMap((map) => map.nodes)
      .find((node) => node.id === selectedCrew?.mapPosition?.nodeId);
    const key =
      (view.role === "player" && view.recoveryAvailable ? "camp" : encounter?.definition.family) ??
      (["merchant"].includes(node?.kind ?? "") ? "merchant" : "camp");
    if (key !== this.roomKey) {
      this.background.setTexture(`room-${key}`);
      this.secondBackdrop?.setTexture(`room-${key}`);
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
    if (encounter && (!encounter.rivalry || champion))
      for (const enemy of encounter.enemies) visible.add(enemy.id);
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
        : heroX(index, heroes.length, rows);
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
          actorY(index, rows),
        );
        this.actors.set(hero.id, actor);
      }
      actor.x = x;
      actor.y = actorY(index, rows);
      if (hero.id === targetId) {
        const color = Number.parseInt(teamColor(crew?.colorId ?? "blue").hex.slice(1), 16);
        this.targetMarker?.lineStyle(4, color).strokeEllipse(x, actorY(index, rows), 112, 28);
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
      for (const [index, enemy] of encounter.enemies.entries()) {
        const x = enemyX(index, encounter.enemies.length, rows);
        let actor = this.actors.get(enemy.id);
        if (!actor) {
          actor = createEnemyActor(
            this,
            { ...encounter, definition: { ...encounter.definition, family: enemy.family } },
            x,
            actorY(index, rows),
          );
          actor.title.setText(enemy.name.toUpperCase());
          this.actors.set(enemy.id, actor);
        }
        actor.x = x;
        actor.y = actorY(index, rows);
        updateActor(actor, enemy.hp, enemy.maxHp, `Block ${enemy.block}`, enemy.hp === 0, true);
        if (encounter.enemies.length > 1) actor.model.setScale(rows ? 0.9 : 0.6);
        actor.detail.setText(
          enemy.hp === 0
            ? "FALLEN"
            : `${enemy.hp}/${enemy.maxHp}${enemy.block ? ` · Block ${enemy.block}` : ""}`,
        );
        if (enemy.id === targetId)
          this.targetMarker?.lineStyle(4, 0x286e9b).strokeEllipse(x, actorY(index, rows), 112, 28);
      }
    }
    for (const actor of this.actors.values()) {
      actor.title.setVisible(!combatHud);
      actor.detail.setVisible(!combatHud);
      actor.health.setVisible(!combatHud);
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
