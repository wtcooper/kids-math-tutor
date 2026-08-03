import type Phaser from "phaser";
import type { GameBus, GameCommand } from "@/components/game/PhaserGame";
import {
  catalogFor,
  COINS_PER_STOP,
  makeWave,
  satisfies,
  START_COINS,
  TOWER_COST,
  type TowerSpec,
  WAVES_PER_ROUND,
} from "./garden-model";

/**
 * Number Garden Defense — the garden, drawn and marching.
 *
 * Gnomes carry numbers down the path toward the vegetable patch. Towers are plants with
 * RULES — a tower only zaps a gnome its rule matches, so what she plants (and where) is
 * the classification. Planting pauses the world (a build decision deserves quiet);
 * everything between decisions runs live.
 *
 * A leaked gnome munches a vegetable — visible, never fatal: the round always runs its
 * five waves and ends with a tally, and vegetables regrow between rounds. No clocks
 * anywhere; the pressure is the march.
 */

const W = 1024;
const H = 576;

const GRASS = 0x5e8c4a;
const GRASS_DARK = 0x527e40;
const PATH = 0xc9b48a;
const PATH_EDGE = 0xa8926a;
const BANNER_INK = "#FDF6E5";
const GNOME_BODY = 0x7b4b6e;
const GNOME_HAT = 0xc4452f;
const PLAQUE = 0xf2e9d2;
const VEG = 0xe08a3c;
const VEG_LEAF = 0x4e6e4a;
const COIN = 0xe3c14a;

const TOWER_TINT: Record<string, number> = {
  multiples: 0x6fc3e8,
  factors: 0x9bc356,
  primes: 0xe06c8c,
};

/** The path, as waypoints; gnomes walk it segment by segment. */
const WAY: Array<[number, number]> = [
  [-30, 300],
  [230, 300],
  [230, 140],
  [520, 140],
  [520, 400],
  [790, 400],
  [790, 250],
  [1000, 250],
];

/** Fixed planting plots beside the path. */
const PLOTS: Array<[number, number]> = [
  [150, 220],
  [320, 220],
  [430, 60],
  [610, 320],
  [700, 480],
  [880, 330],
];
const RANGE = 150;

interface Gnome {
  container: Phaser.GameObjects.Container;
  value: number;
  seg: number;
  t: number;
  dead: boolean;
  leaked: boolean;
}

interface Tower {
  plot: number;
  spec: TowerSpec;
  obj: Phaser.GameObjects.Container;
  cooldown: number;
}

export function createGardenScene(P: typeof Phaser, config: { level: number }) {
  return class GardenScene extends P.Scene {
    private bus!: GameBus;
    private offCommand?: () => void;

    private level = config.level;
    private wave = 0;
    private coins = START_COINS;
    private veggies = 6;
    private vegMarks: Phaser.GameObjects.Container[] = [];
    private gnomes: Gnome[] = [];
    private towers: Tower[] = [];
    private plotMarks: Phaser.GameObjects.Container[] = [];
    private pendingWave: number[] = [];
    private toSpawn: number[] = [];
    private spawnAt = 0;
    private stopped = 0;
    private leaked = 0;
    /** "ready" (wave preview up, world paused-ish) | "marching" | "picking" | "over" */
    private phase: "ready" | "marching" | "picking" | "over" = "ready";
    private pickingPlot = -1;
    private banner!: Phaser.GameObjects.Text;
    private askedAt = 0;
    private calmMotion = false;

    constructor() {
      super("garden");
    }

    private rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

    create() {
      this.bus = this.registry.get("bus") as GameBus;
      this.calmMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      this.offCommand = this.bus.onCommand((cmd: GameCommand) => {
        if (cmd.type === "level:set") {
          this.level = cmd.level;
          this.newRound();
        } else if (cmd.type === "pause") this.scene.pause();
        else if (cmd.type === "resume") this.scene.resume();
        else if (cmd.type === "next") this.sendWave();
      });

      this.drawGarden();
      this.banner = this.add
        .text(W / 2, 24, "", {
          fontFamily: "Georgia, serif",
          fontSize: "24px",
          color: BANNER_INK,
        })
        .setOrigin(0.5)
        .setDepth(9);
      this.banner.setShadow(0, 1, "#22371F", 4, true, true);

      this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.onTap(p.worldX, p.worldY));

      this.newRound();
    }

    shutdown() {
      this.offCommand?.();
    }

    private drawGarden() {
      const g = this.add.graphics().setDepth(0);
      g.fillStyle(GRASS, 1);
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < 40; i++) {
        g.fillStyle(GRASS_DARK, 0.5);
        g.fillEllipse(this.rnd(10, W - 10), this.rnd(10, H - 10), this.rnd(8, 22), 6);
      }
      // The path.
      g.lineStyle(46, PATH_EDGE, 1);
      this.strokeWay(g);
      g.lineStyle(38, PATH, 1);
      this.strokeWay(g);

      // The vegetable patch at the path's end.
      const px = WAY[WAY.length - 1][0] - 20;
      const py = WAY[WAY.length - 1][1];
      const patch = this.add.graphics().setDepth(1);
      patch.fillStyle(0x6b4d33, 1);
      patch.fillRoundedRect(px - 26, py - 64, 92, 128, 12);
      this.vegMarks = [];
      for (let i = 0; i < 6; i++) {
        const vx = px + (i % 2) * 44;
        const vy = py - 44 + Math.floor(i / 2) * 44;
        const c = this.add.container(vx, vy).setDepth(2);
        const vg = this.add.graphics();
        vg.fillStyle(VEG, 1);
        vg.fillCircle(0, 4, 11);
        vg.fillStyle(VEG_LEAF, 1);
        vg.fillEllipse(-3, -9, 8, 10);
        vg.fillEllipse(5, -8, 7, 9);
        c.add(vg);
        this.vegMarks.push(c);
      }

      // Planting plots: turned-earth circles.
      this.plotMarks = PLOTS.map(([x, y], i) => {
        const c = this.add.container(x, y).setDepth(2);
        const pg = this.add.graphics();
        pg.fillStyle(0x8a6642, 1);
        pg.fillEllipse(0, 3, 46, 30);
        pg.fillStyle(0x9c7a52, 1);
        pg.fillEllipse(0, 0, 44, 28);
        pg.lineStyle(2, 0xf2e9d2, 0.6);
        pg.strokeEllipse(0, 0, 44, 28);
        c.add(pg);
        c.setData("plot", i);
        return c;
      });
    }

    private strokeWay(g: Phaser.GameObjects.Graphics) {
      g.beginPath();
      g.moveTo(WAY[0][0], WAY[0][1]);
      for (let i = 1; i < WAY.length; i++) g.lineTo(WAY[i][0], WAY[i][1]);
      g.strokePath();
    }

    private newRound() {
      this.gnomes.forEach((gn) => gn.container.destroy());
      this.towers.forEach((t) => t.obj.destroy());
      this.gnomes = [];
      this.towers = [];
      this.wave = 0;
      this.coins = START_COINS;
      this.veggies = 6;
      this.vegMarks.forEach((v) => v.setAlpha(1));
      this.stopped = 0;
      this.leaked = 0;
      this.phase = "ready";
      this.pendingWave = makeWave(this.level, 1, this.rnd);
      this.askedAt = this.time.now;
      this.pushState();
    }

    private pushState() {
      this.bus.emit({
        type: "state",
        payload: {
          phase: this.phase,
          wave: this.wave + 1,
          waves: WAVES_PER_ROUND,
          coins: this.coins,
          veggies: this.veggies,
          stopped: this.stopped,
          leaked: this.leaked,
          preview: [...this.pendingWave],
          pickingPlot: this.pickingPlot,
          catalog: catalogFor(this.level),
          planted: this.towers.map((t) => ({ plot: t.plot, label: t.spec.label })),
          canAfford: this.coins >= TOWER_COST,
        },
      });
    }

    /** Host pressed "Send the wave". */
    private sendWave() {
      if (this.phase !== "ready") return;
      this.phase = "marching";
      this.wave++;
      this.toSpawn = [...this.pendingWave];
      this.spawnAt = 0;
      this.banner.setText(`Wave ${this.wave} — ${this.toSpawn.length} gnomes`);
      this.pushState();
    }

    private onTap(x: number, y: number) {
      if (this.phase === "picking" || this.phase === "over") return;
      for (let i = 0; i < PLOTS.length; i++) {
        const [px, py] = PLOTS[i];
        if ((x - px) * (x - px) + (y - py) * (y - py) < 30 * 30) {
          if (this.towers.some((t) => t.plot === i)) return;
          if (this.coins < TOWER_COST) return;
          this.pickingPlot = i;
          this.phase = "picking";
          this.scene.pause();
          this.pushState();
          return;
        }
      }
    }

    /** Host: a tower was chosen for the pending plot. */
    plant(specId: string) {
      const i = this.pickingPlot;
      const spec = catalogFor(this.level).find((s) => s.id === specId);
      if (i < 0 || !spec || this.coins < spec.cost) return this.cancelPlant();
      this.coins -= spec.cost;
      const [x, y] = PLOTS[i];
      const obj = this.makeTower(x, y, spec);
      this.towers.push({ plot: i, spec, obj, cooldown: 0 });
      this.bus.emit({
        type: "attempt",
        prompt: { wave: this.wave + 1, plot: i },
        response: { planted: spec.label },
        elapsedMs: Math.max(0, Math.round(this.time.now - this.askedAt)),
      });
      this.askedAt = this.time.now;
      this.cancelPlant();
    }

    cancelPlant() {
      this.pickingPlot = -1;
      this.phase = this.toSpawn.length || this.gnomes.some((g) => !g.dead) ? "marching" : "ready";
      this.scene.resume();
      this.pushState();
    }

    private makeTower(x: number, y: number, spec: TowerSpec) {
      const tint = TOWER_TINT[spec.kind];
      const c = this.add.container(x, y).setDepth(3);
      const g = this.add.graphics();
      // A plant with a glowing head in the rule's colour, petals by kind.
      g.fillStyle(0x3d5233, 1);
      g.fillRect(-2.5, -6, 5, 16);
      if (spec.kind === "primes") {
        g.fillStyle(tint, 1);
        g.fillTriangle(0, -30, -11, -8, 11, -8);
        g.fillStyle(0xffffff, 0.3);
        g.fillTriangle(0, -26, -5, -12, 5, -12);
      } else if (spec.kind === "multiples") {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          g.fillStyle(tint, 0.9);
          g.fillEllipse(Math.cos(a) * 10, -16 + Math.sin(a) * 10, 11, 7);
        }
        g.fillStyle(0xffffff, 0.85);
        g.fillCircle(0, -16, 6);
      } else {
        g.fillStyle(tint, 1);
        g.fillCircle(-8, -14, 9);
        g.fillCircle(8, -14, 9);
        g.fillCircle(0, -22, 9);
        g.fillStyle(0x2c3618, 0.7);
        g.fillCircle(0, -17, 4);
      }
      c.add(g);
      const label = this.add
        .text(0, 16, spec.kind === "primes" ? "primes" : spec.kind === "multiples" ? `×${spec.a}` : `| ${spec.a}`, {
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: "13px",
          fontStyle: "bold",
          color: "#FDF6E5",
        })
        .setOrigin(0.5);
      label.setShadow(0, 1, "#22371F", 3, true, true);
      c.add(label);
      return c;
    }

    private spawnGnome(value: number) {
      const c = this.add.container(WAY[0][0], WAY[0][1]).setDepth(4);
      const g = this.add.graphics();
      g.fillStyle(0x0e2415, 0.35);
      g.fillEllipse(0, 14, 26, 8);
      g.fillStyle(GNOME_BODY, 1);
      g.fillEllipse(0, 4, 20, 18);
      g.fillStyle(0xe8c9a8, 1);
      g.fillCircle(0, -8, 7);
      g.fillStyle(GNOME_HAT, 1);
      g.fillTriangle(0, -26, -8, -11, 8, -11);
      c.add(g);
      const plaque = this.add.graphics();
      plaque.fillStyle(PLAQUE, 1);
      plaque.fillRoundedRect(-17, 20, 34, 20, 5);
      c.add(plaque);
      c.add(
        this.add
          .text(0, 30, String(value), {
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: "15px",
            fontStyle: "bold",
            color: "#3D352C",
          })
          .setOrigin(0.5),
      );
      this.gnomes.push({ container: c, value, seg: 0, t: 0, dead: false, leaked: false });
    }

    private zap(tower: Tower, gnome: Gnome) {
      gnome.dead = true;
      this.stopped++;
      this.coins += COINS_PER_STOP;
      const { x, y } = gnome.container;
      const [tx, ty] = PLOTS[tower.plot];
      if (!this.calmMotion) {
        const beam = this.add.graphics().setDepth(5);
        beam.lineStyle(3, TOWER_TINT[tower.spec.kind], 0.9);
        beam.lineBetween(tx, ty - 18, x, y);
        this.tweens.add({ targets: beam, alpha: 0, duration: 180, onComplete: () => beam.destroy() });
        for (let i = 0; i < 7; i++) {
          const p = this.add.circle(x, y, 2, TOWER_TINT[tower.spec.kind], 0.9).setDepth(5);
          const a = Math.random() * Math.PI * 2;
          this.tweens.add({
            targets: p,
            x: x + Math.cos(a) * 28,
            y: y + Math.sin(a) * 28,
            alpha: 0,
            duration: 320,
            onComplete: () => p.destroy(),
          });
        }
        const coin = this.add.circle(x, y, 5, COIN, 1).setDepth(6);
        this.tweens.add({ targets: coin, y: y - 30, alpha: 0, duration: 500, onComplete: () => coin.destroy() });
      }
      this.tweens.add({
        targets: gnome.container,
        scale: 0.2,
        alpha: 0,
        duration: 220,
        onComplete: () => gnome.container.destroy(),
      });
      this.pushState();
    }

    private leak(gnome: Gnome) {
      gnome.dead = true;
      gnome.leaked = true;
      this.leaked++;
      if (this.veggies > 0) {
        this.veggies--;
        const mark = this.vegMarks[this.veggies];
        this.tweens.add({ targets: mark, alpha: 0.22, duration: 300 });
      }
      this.tweens.add({
        targets: gnome.container,
        x: gnome.container.x + 40,
        alpha: 0,
        duration: 400,
        onComplete: () => gnome.container.destroy(),
      });
      this.pushState();
    }

    private waveDone() {
      if (this.wave >= WAVES_PER_ROUND) {
        this.phase = "over";
        this.bus.emit({
          type: "round:complete",
          payload: {
            stopped: this.stopped,
            leaked: this.leaked,
            veggies: this.veggies,
            waves: WAVES_PER_ROUND,
            towers: this.towers.map((t) => t.spec.label),
          },
        });
        return;
      }
      this.phase = "ready";
      this.pendingWave = makeWave(this.level, this.wave + 1, this.rnd);
      this.banner.setText("");
      this.pushState();
    }

    update(_t: number, delta: number) {
      if (this.phase !== "marching") return;
      const dt = delta / 1000;
      const speed = 46 + this.wave * 4;

      // Spawning.
      if (this.toSpawn.length) {
        this.spawnAt -= dt;
        if (this.spawnAt <= 0) {
          this.spawnGnome(this.toSpawn.shift()!);
          this.spawnAt = 0.95;
        }
      }

      // March.
      for (const gn of this.gnomes) {
        if (gn.dead) continue;
        const [x0, y0] = WAY[gn.seg];
        const [x1, y1] = WAY[gn.seg + 1];
        const len = Math.hypot(x1 - x0, y1 - y0);
        gn.t += (speed * dt) / len;
        if (gn.t >= 1) {
          gn.seg++;
          gn.t = 0;
          if (gn.seg >= WAY.length - 1) {
            this.leak(gn);
            continue;
          }
        }
        const [ax, ay] = WAY[gn.seg];
        const [bx, by] = WAY[gn.seg + 1];
        gn.container.setPosition(ax + (bx - ax) * gn.t, ay + (by - ay) * gn.t);
        // A waddle so the march reads as walking.
        if (!this.calmMotion) gn.container.setAngle(Math.sin(this.time.now / 90 + gn.value) * 4);
      }

      // Towers fire at the first matching gnome in range.
      for (const tw of this.towers) {
        tw.cooldown -= dt;
        if (tw.cooldown > 0) continue;
        const [tx, ty] = PLOTS[tw.plot];
        const target = this.gnomes.find((gn) => {
          if (gn.dead || !satisfies(tw.spec, gn.value)) return false;
          const dx = gn.container.x - tx;
          const dy = gn.container.y - ty;
          return dx * dx + dy * dy <= RANGE * RANGE;
        });
        if (target) {
          tw.cooldown = 0.85;
          this.zap(tw, target);
        }
      }

      this.gnomes = this.gnomes.filter((gn) => !gn.dead || gn.container.active);
      if (!this.toSpawn.length && this.gnomes.every((gn) => gn.dead)) {
        this.gnomes = [];
        this.waveDone();
      }
    }
  };
}

export const GARDEN_SIZE = { W, H };
