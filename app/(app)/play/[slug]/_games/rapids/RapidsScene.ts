import type Phaser from "phaser";
import type { GameBus, GameCommand } from "@/components/game/PhaserGame";
import { type Gate, makeGate, makeRun, RAPIDS_LEVELS, type RunState } from "./rapids-model";

/**
 * Rapids — a river you steer, and steering is the answer.
 *
 * The river never stops flowing. Rock gates drift down toward the raft; each has two
 * openings carrying values, and only the one the banner asks for lets you through
 * clean. The wrong opening (or the rocks) just spins the raft — free, silent, and the
 * river carries on. Twelve gates make a run.
 *
 * Pace ramps with gates passed — world-state urgency, never a clock on a question. A
 * spin drops the pace back, so a rough patch gets gentler, not meaner.
 */

const W = 1024;
const H = 576;

/** Dusk river palette, shared with Crossing (plan 06). */
const WATER_DEEP = 0x173b47;
const WATER_MID = 0x1e4757;
const RIPPLE = 0xdfeef2;
const BANK_MOSS = 0x3e5a3c;
const REED = 0x55764e;
const ROCK = 0x5c6a72;
const ROCK_DARK = 0x46525a;
const PLAQUE = 0xe8dcc4;
const PLAQUE_INK = "#3D352C";
const RAFT_WOOD = 0xc9a36b;
const RAFT_DARK = 0x8a6642;
const BANNER_INK = "#F2EADC";
const GOOD = 0x9bc356;
const SPIN = 0xe0a5ad;

const BANK_W = 90;
const GATE_EVERY = 400;
const GAP_HALF = 88;
const GATE_XS = [W * 0.33, W * 0.67];
const RAFT_Y = H - 96;
export const GATES_PER_RUN = 12;

const SPEED_BASE = 120;
const SPEED_PER_GATE = 9;
const SPEED_MAX = 240;
const STEER_MAX = 560;
const STEER_ACCEL = 2400;
const STEER_BRAKE = 2000;

interface LiveGate {
  gate: Gate;
  y: number;
  judged: boolean;
  objs: Phaser.GameObjects.Container;
}

export function createRapidsScene(P: typeof Phaser, config: { level: number }) {
  return class RapidsScene extends P.Scene {
    private bus!: GameBus;
    private offCommand?: () => void;

    private level = config.level;
    private run!: RunState;
    private gates: LiveGate[] = [];
    private spawned = 0;
    private passed = 0;
    private spins = 0;
    private streak = 0;
    private distance = 0;
    private nextSpawnAt = 0;
    private raft!: Phaser.GameObjects.Container;
    private raftX = W / 2;
    private raftVx = 0;
    private pointerX: number | null = null;
    private keyLeft?: Phaser.Input.Keyboard.Key;
    private keyRight?: Phaser.Input.Keyboard.Key;
    private banner!: Phaser.GameObjects.Text;
    private ripples: Array<{ obj: Phaser.GameObjects.Graphics; speed: number }> = [];
    private spinning = 0;
    private askedAt = 0;
    private done = false;
    private calmMotion = false;

    constructor() {
      super("rapids");
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
          this.newRun();
        } else if (cmd.type === "pause") this.scene.pause();
        else if (cmd.type === "resume") this.scene.resume();
      });

      this.drawScenery();
      this.raft = this.makeRaft();

      this.banner = this.add
        .text(W / 2, 26, "", {
          fontFamily: "Georgia, serif",
          fontSize: "26px",
          color: BANNER_INK,
        })
        .setOrigin(0.5)
        .setDepth(9);
      this.banner.setShadow(0, 1, "#12262E", 4, true, true);

      this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
        this.pointerX = p.worldX;
      });
      this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
        this.pointerX = p.worldX;
      });
      this.keyLeft = this.input.keyboard?.addKey(P.Input.Keyboard.KeyCodes.LEFT);
      this.keyRight = this.input.keyboard?.addKey(P.Input.Keyboard.KeyCodes.RIGHT);

      this.newRun();
    }

    shutdown() {
      this.offCommand?.();
    }

    private drawScenery() {
      const g = this.add.graphics().setDepth(0);
      g.fillStyle(WATER_DEEP, 1);
      g.fillRect(0, 0, W, H);
      g.fillStyle(WATER_MID, 0.5);
      g.fillEllipse(W / 2, H / 2, W * 0.7, H * 1.1);
      // Banks down both sides, with grass tufts and reeds.
      g.fillStyle(BANK_MOSS, 1);
      g.fillRect(0, 0, BANK_W, H);
      g.fillRect(W - BANK_W, 0, BANK_W, H);
      g.fillStyle(0x2f4630, 1);
      g.fillRect(BANK_W - 6, 0, 6, H);
      g.fillRect(W - BANK_W, 0, 6, H);
      g.fillStyle(REED, 1);
      for (let y = 8; y < H; y += this.rnd(30, 60)) {
        g.fillEllipse(this.rnd(8, BANK_W - 14), y, this.rnd(10, 18), 6);
        g.fillEllipse(this.rnd(W - BANK_W + 10, W - 8), y + 12, this.rnd(10, 18), 6);
      }

      this.ripples = [];
      if (!this.calmMotion) {
        for (let i = 0; i < 22; i++) {
          const rg = this.add.graphics().setDepth(1);
          rg.fillStyle(RIPPLE, 0.1 + Math.random() * 0.08);
          rg.fillRoundedRect(-14, -1.5, 28, 3, 1.5);
          rg.setPosition(BANK_W + Math.random() * (W - BANK_W * 2), Math.random() * H);
          this.ripples.push({ obj: rg, speed: 0.4 + Math.random() * 0.5 });
        }
      }
    }

    private makeRaft() {
      const c = this.add.container(this.raftX, RAFT_Y).setDepth(6);
      const g = this.add.graphics();
      // Planks, lashings, and a paddler kneeling at the stern.
      g.fillStyle(0x0e2831, 0.5);
      g.fillEllipse(0, 6, 74, 30);
      g.fillStyle(RAFT_WOOD, 1);
      g.fillRoundedRect(-32, -22, 64, 44, 8);
      g.lineStyle(2, RAFT_DARK, 1);
      for (let i = -1; i <= 1; i++) g.lineBetween(i * 16, -22, i * 16, 22);
      g.strokeRoundedRect(-32, -22, 64, 44, 8);
      g.fillStyle(0x8fbf6a, 1);
      g.fillCircle(0, 4, 9);
      g.fillStyle(0x5d8c42, 1);
      g.fillCircle(0, 4, 4.5);
      c.add(g);
      return c;
    }

    private newRun() {
      this.gates.forEach((lg) => lg.objs.destroy());
      this.gates = [];
      this.spawned = 0;
      this.passed = 0;
      this.spins = 0;
      this.streak = 0;
      this.distance = 0;
      this.nextSpawnAt = 0;
      this.spinning = 0;
      this.done = false;
      this.raftX = W / 2;
      this.raftVx = 0;
      this.raft.setPosition(this.raftX, RAFT_Y).setAngle(0);
      this.run = makeRun(RAPIDS_LEVELS[Math.min(this.level, RAPIDS_LEVELS.length) - 1].kind, this.rnd);
      this.askedAt = this.time.now;
      this.pushState(null);
    }

    private pushState(lastGate: Gate | null) {
      this.bus.emit({
        type: "state",
        payload: {
          kind: this.run.kind,
          prompt: this.gates.find((g) => !g.judged)?.gate.prompt ?? lastGate?.prompt ?? "",
          gate: this.gates.find((g) => !g.judged)?.gate ?? null,
          passed: this.passed,
          spins: this.spins,
          streak: this.streak,
          distance: Math.round(this.distance / 10),
          total: GATES_PER_RUN,
        },
      });
    }

    private spawnGate() {
      const { gate, state } = makeGate(this.run, this.rnd);
      this.run = state;
      this.spawned++;

      const c = this.add.container(0, 0).setDepth(3);
      const g = this.add.graphics();
      // Rock wall with two gaps; boulders drawn chunky.
      const spans: Array<[number, number]> = [
        [BANK_W, GATE_XS[0] - GAP_HALF],
        [GATE_XS[0] + GAP_HALF, GATE_XS[1] - GAP_HALF],
        [GATE_XS[1] + GAP_HALF, W - BANK_W],
      ];
      for (const [x0, x1] of spans) {
        for (let x = x0; x < x1 - 8; x += 34) {
          const r = 16 + ((x * 7) % 8);
          g.fillStyle(ROCK_DARK, 1);
          g.fillCircle(x + 17, 6, r);
          g.fillStyle(ROCK, 1);
          g.fillCircle(x + 17, 0, r);
          g.fillStyle(0xffffff, 0.15);
          g.fillEllipse(x + 12, -6, r * 0.8, r * 0.5);
        }
      }
      c.add(g);
      // The two signs, one per opening, on stone plaques.
      gate.sides.forEach((text, i) => {
        const px = GATE_XS[i];
        const pg = this.add.graphics();
        pg.fillStyle(0x0e2831, 0.5);
        pg.fillRoundedRect(px - 44, -58, 88, 40, 9);
        pg.fillStyle(PLAQUE, 1);
        pg.fillRoundedRect(px - 42, -62, 84, 40, 9);
        c.add(pg);
        c.add(
          this.add
            .text(px, -42, text, {
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: "24px",
              fontStyle: "bold",
              color: PLAQUE_INK,
            })
            .setOrigin(0.5),
        );
      });
      c.setY(-80);
      this.gates.push({ gate, y: -80, judged: false, objs: c });
      this.banner.setText(gate.prompt);
      this.pushState(gate);
    }

    private judge(lg: LiveGate) {
      lg.judged = true;
      const inLeft = Math.abs(this.raftX - GATE_XS[0]) < GAP_HALF - 8;
      const inRight = Math.abs(this.raftX - GATE_XS[1]) < GAP_HALF - 8;
      const chose = inLeft ? 0 : inRight ? 1 : -1;
      const ok = chose === lg.gate.correct;

      this.bus.emit({
        type: "attempt",
        prompt: lg.gate.meta,
        response: { chose, correct: lg.gate.correct, ok },
        elapsedMs: Math.max(0, Math.round(this.time.now - this.askedAt)),
      });
      this.askedAt = this.time.now;

      if (ok) {
        this.passed++;
        this.streak++;
        if (!this.calmMotion) {
          for (let i = 0; i < 6; i++) {
            const p = this.add.circle(
              this.raftX + this.rnd(-20, 20),
              RAFT_Y + this.rnd(-8, 8),
              2,
              GOOD,
              0.9,
            ).setDepth(7);
            this.tweens.add({
              targets: p,
              y: RAFT_Y + 40,
              alpha: 0,
              duration: 420,
              onComplete: () => p.destroy(),
            });
          }
        }
      } else {
        this.spins++;
        this.streak = 0;
        this.spinning = 0.9;
        if (!this.calmMotion) {
          this.tweens.add({ targets: this.raft, angle: 360, duration: 800, onComplete: () => this.raft.setAngle(0) });
          const ring = this.add.circle(this.raftX, RAFT_Y, 20, SPIN, 0.35).setDepth(7);
          this.tweens.add({ targets: ring, scale: 2.2, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
        }
      }
      this.pushState(lg.gate);

      if (this.spawned >= GATES_PER_RUN && this.gates.every((g) => g.judged)) {
        this.done = true;
        this.time.delayedCall(600, () => {
          this.bus.emit({
            type: "round:complete",
            payload: {
              passed: this.passed,
              spins: this.spins,
              total: GATES_PER_RUN,
              distance: Math.round(this.distance / 10),
              kind: this.run.kind,
            },
          });
        });
      }
    }

    update(_t: number, delta: number) {
      if (this.done) return;
      const dt = delta / 1000;

      // Pace: ramps with clean gates, eases off while recovering from a spin.
      let speed = Math.min(SPEED_MAX, SPEED_BASE + this.passed * SPEED_PER_GATE);
      if (this.spinning > 0) {
        this.spinning -= dt;
        speed *= 0.45;
      }
      if (this.calmMotion) speed = Math.min(speed, 140);
      this.distance += speed * dt;

      // Steering.
      const left = this.keyLeft?.isDown ?? false;
      const right = this.keyRight?.isDown ?? false;
      if (left || right) {
        this.pointerX = null;
        const dir = (right ? 1 : 0) - (left ? 1 : 0);
        this.raftVx += dir * STEER_ACCEL * dt;
        this.raftVx = Math.max(-STEER_MAX, Math.min(STEER_MAX, this.raftVx));
      } else if (this.pointerX !== null) {
        const dx = this.pointerX - this.raftX;
        this.raftX += dx * Math.min(1, dt * 10);
        this.raftVx = dx * 3;
      }
      if (!left && !right) {
        const sign = Math.sign(this.raftVx);
        this.raftVx -= sign * Math.min(Math.abs(this.raftVx), STEER_BRAKE * dt);
      }
      if (left || right) this.raftX += this.raftVx * dt;
      this.raftX = Math.max(BANK_W + 34, Math.min(W - BANK_W - 34, this.raftX));
      if (this.spinning <= 0) {
        this.raft.setPosition(this.raftX, RAFT_Y);
        this.raft.setRotation(this.calmMotion ? 0 : (this.raftVx / STEER_MAX) * 0.22);
      } else {
        this.raft.setPosition(this.raftX, RAFT_Y);
      }

      // Ambient water runs the same direction as the world.
      for (const r of this.ripples) {
        r.obj.y += speed * r.speed * dt;
        if (r.obj.y > H + 6) {
          r.obj.y = -6;
          r.obj.x = BANK_W + Math.random() * (W - BANK_W * 2);
        }
      }

      // Gates drift down; judge as they reach the raft.
      for (const lg of this.gates) {
        lg.y += speed * dt;
        lg.objs.setY(lg.y);
        if (!lg.judged && lg.y >= RAFT_Y - 8) this.judge(lg);
        if (lg.y > H + 90) {
          lg.objs.destroy();
        }
      }
      this.gates = this.gates.filter((lg) => lg.y <= H + 90);

      // Keep the river stocked until the run's gates are all dealt.
      this.nextSpawnAt -= speed * dt;
      if (this.spawned < GATES_PER_RUN && this.nextSpawnAt <= 0) {
        this.spawnGate();
        this.nextSpawnAt = GATE_EVERY;
      }
    }
  };
}

export const RAPIDS_SIZE = { W, H };
