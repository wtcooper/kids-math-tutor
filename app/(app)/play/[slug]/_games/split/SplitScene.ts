import type Phaser from "phaser";
import { isPrime } from "@/lib/math/number";
import { FACTOR_HI } from "@/lib/math/topics/factors";
import type { GameBus, GameCommand } from "@/components/game/PhaserGame";

/**
 * Split — a factor tree you play.
 *
 * Rocks drift in carrying composite numbers. Shoot one and SHE says what it breaks into;
 * the two factors tumble out and can be shot again. **Primes cannot be broken** — a shot
 * ricochets off — so the board fills with the primes she made and she has to fly around
 * them. The board state at the end literally is the prime factorisation.
 *
 * The world is deep space (plan 06): indigo void, parallax starfield, rock asteroids,
 * faceted crystals for primes — a prime *looks* like a thing that cannot be broken.
 *
 * Controls, rebuilt after the play-test complaint that movement was "wonky and slow":
 * - The ship tracks the pointer directly (fast lerp, no fixed-speed glide).
 * - A tap/click ONLY fires, from where the ship is now. It never retargets the ship —
 *   the old behaviour fired from the wrong place and then slid over, which read as broken.
 * - Holding ← / → flies with real velocity (accelerate, coast, brake). Space fires.
 *
 * No countdown. Rocks drift and never accelerate; the pressure is that the board gets
 * more crowded as you split, which is a consequence of your own choices.
 */

const W = 1024;
const H = 576;

/** Stage palette — deep space (plan 06). The paper tokens stay outside the canvas. */
const STAR = 0xe8ecff;
const ROCK_FILL = 0x39415a;
const ROCK_EDGE = 0x8a93b0;
const ROCK_CRATER = 0x2b3247;
const INK_BRIGHT = "#F4F6FF";
const CRYSTAL_FILL = 0x51263c;
const CRYSTAL_EDGE = 0xe06c8c;
const CRYSTAL_INK = "#FFB7CC";
const HULL = 0xc9d2f2;
const HULL_DARK = 0x6a7396;
const COCKPIT = 0x9fdcff;
const FLAME = 0xff9e4a;
const TRACER = 0xffe9a8;
const GUIDE = "#9FB0FF";

/** Max ship speed px/s under keys; pointer tracking is a lerp and can move faster. */
const SHIP_MAX = 640;
const SHIP_ACCEL = 2600;
const SHIP_BRAKE = 2200;
const SHOT_SPEED = 760;
/** Rocks drift with visible life but never menace. */
const ROCK_SPEED_LO = 55;
const ROCK_SPEED_HI = 90;

export interface Rock {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  disc: Phaser.GameObjects.Graphics;
  value: number;
  prime: boolean;
  vx: number;
  vy: number;
  /** Spin, radians/s. Asteroids tumble; crystals barely sway. */
  vr: number;
  r: number;
  dead: boolean;
}

interface Shot {
  obj: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  dead: boolean;
}

interface StarDot {
  obj: Phaser.GameObjects.Arc;
  speed: number;
}

/**
 * Smallest factor pair of n, both > 1. Used to decide whether a rock *can* be split at
 * all — she chooses which pair to actually use.
 */
export function splitPair(n: number): [number, number] | null {
  for (let d = 2; d * d <= n; d++) {
    if (n % d === 0) return [d, n / d];
  }
  return null;
}

/** Every way to write n as a product of two factors above 1, smallest factor first. */
export function factorPairs(n: number): [number, number][] {
  const out: [number, number][] = [];
  for (let d = 2; d * d <= n; d++) {
    if (n % d === 0) out.push([d, n / d]);
  }
  return out;
}

/** How many rocks a starting number will eventually become — its prime-factor count. */
export function primeFactorCount(n: number): number {
  let count = 0;
  let m = n;
  for (let d = 2; d * d <= m; d++) {
    while (m % d === 0) {
      m /= d;
      count++;
    }
  }
  return m > 1 ? count + 1 : count;
}

/** A starting number worth splitting: composite, and not just two primes. */
export function startingNumbers(level: number, rnd: (a: number, b: number) => number): number[] {
  const hi = Math.max(24, FACTOR_HI[Math.min(level, FACTOR_HI.length) - 1] ?? 72);
  // Two or three rocks, never more. Five at level 3 produced sixteen primes and a round
  // that would not end — the point is a factor tree she can see, not an endurance test.
  const wanted = level <= 2 ? 2 : 3;
  const out: number[] = [];
  let guard = 0;
  while (out.length < wanted && guard++ < 400) {
    const n = rnd(8, hi);
    // At least three prime factors, so there is a tree rather than one snip. Distinct,
    // because three identical rocks is three copies of one problem.
    if (!isPrime(n) && primeFactorCount(n) >= 3 && !out.includes(n)) out.push(n);
  }
  for (const fallback of [12, 18, 20, 24, 27]) {
    if (out.length >= wanted) break;
    if (!out.includes(fallback)) out.push(fallback);
  }
  return out;
}

export function createSplitScene(P: typeof Phaser, config: { level: number }) {
  return class SplitScene extends P.Scene {
    private bus!: GameBus;
    private offCommand?: () => void;

    private level = config.level;
    private rocks: Rock[] = [];
    private shots: Shot[] = [];
    private stars: StarDot[] = [];
    private ship!: Phaser.GameObjects.Container;
    private flame!: Phaser.GameObjects.Graphics;
    private shipX = W / 2;
    private shipY = H - 64;
    private shipVx = 0;
    /** Pointer x the ship is tracking, or null while keyboard has the wheel. */
    private pointerX: number | null = null;
    private keyLeft?: Phaser.Input.Keyboard.Key;
    private keyRight?: Phaser.Input.Keyboard.Key;
    private cooldown = 0;
    private trailAt = 0;
    private startedWith: number[] = [];
    /** The rock she has shot and must now factorise. Play is paused while it is set. */
    private pending: Rock | null = null;
    private askedAt = 0;
    private splits = 0;
    private bounces = 0;
    /** First-board coach marks, drawn in the world and gone after the first shot. */
    private guide?: Phaser.GameObjects.Container;
    private guideDots?: Phaser.GameObjects.Graphics;
    private guideTarget?: Rock;
    private fired = false;
    private calmMotion = false;

    constructor() {
      super("split");
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
          this.newBoard();
        } else if (cmd.type === "pause") this.scene.pause();
        else if (cmd.type === "resume") this.scene.resume();
      });

      this.makeStarfield();
      this.ship = this.makeShip();

      /*
       * Firing and moving are separate acts. The old scheme made a tap do both — the
       * shot left from wherever the ship was mid-glide, which is why aiming felt broken.
       */
      this.input.on("pointerdown", () => this.fire());
      this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
        this.pointerX = p.worldX;
      });

      this.keyLeft = this.input.keyboard?.addKey(P.Input.Keyboard.KeyCodes.LEFT);
      this.keyRight = this.input.keyboard?.addKey(P.Input.Keyboard.KeyCodes.RIGHT);
      this.input.keyboard?.on("keydown", (e: KeyboardEvent) => {
        if (e.key === " " || e.key === "ArrowUp") {
          e.preventDefault();
          this.fire();
        }
      });

      this.newBoard();
    }

    shutdown() {
      this.offCommand?.();
    }

    /** Two parallax layers of drifting stars, with a handful twinkling. */
    private makeStarfield() {
      const layers: Array<{ n: number; rLo: number; rHi: number; a: number; sp: number }> = [
        { n: 80, rLo: 1, rHi: 1.6, a: 0.4, sp: 7 },
        { n: 34, rLo: 1.8, rHi: 2.6, a: 0.8, sp: 16 },
      ];
      for (const L of layers) {
        for (let i = 0; i < L.n; i++) {
          const star = this.add.circle(
            Math.random() * W,
            Math.random() * H,
            L.rLo + Math.random() * (L.rHi - L.rLo),
            STAR,
            L.a,
          );
          star.setDepth(0);
          this.stars.push({ obj: star, speed: this.calmMotion ? 0 : L.sp });
          if (!this.calmMotion && i % 9 === 0) {
            this.tweens.add({
              targets: star,
              alpha: L.a * 0.25,
              duration: 900 + Math.random() * 1400,
              yoyo: true,
              repeat: -1,
              delay: Math.random() * 2000,
            });
          }
        }
      }
    }

    private makeShip() {
      const c = this.add.container(this.shipX, this.shipY);

      // Thruster flame first so it sits behind the hull. Flickers while flying.
      this.flame = this.add.graphics();
      this.flame.fillStyle(FLAME, 0.9);
      this.flame.fillTriangle(-5, 16, 5, 16, 0, 32);
      this.flame.setAlpha(0);
      c.add(this.flame);

      const g = this.add.graphics();
      // Wings, hull, cockpit — a ship, not a cursor.
      g.fillStyle(HULL_DARK, 1);
      g.fillTriangle(-17, 15, -3, 6, -3, 15);
      g.fillTriangle(17, 15, 3, 6, 3, 15);
      g.fillStyle(HULL, 1);
      g.fillTriangle(0, -20, -10, 15, 10, 15);
      g.fillStyle(COCKPIT, 1);
      g.fillCircle(0, -2, 3.4);
      c.add(g);
      c.setDepth(6);
      return c;
    }

    private newBoard() {
      this.rocks.forEach((r) => r.container.destroy());
      this.shots.forEach((s) => s.obj.destroy());
      this.rocks = [];
      this.shots = [];
      this.splits = 0;
      this.bounces = 0;
      this.pending = null;

      this.startedWith = startingNumbers(this.level, this.rnd);
      this.startedWith.forEach((n, i) => {
        const angle = (i / this.startedWith.length) * Math.PI * 2;
        this.addRock(
          n,
          W / 2 + Math.cos(angle) * 260,
          210 + Math.sin(angle) * 110,
        );
      });

      this.shipX = W / 2;
      this.shipVx = 0;
      this.pointerX = null;
      this.ship.setPosition(this.shipX, this.shipY);
      this.askedAt = this.time.now;
      if (!this.fired) this.makeGuide();
      this.pushState();
    }

    /** In-world coach mark: nobody should need the side panel to know what to do.
     *  The dotted line is re-aimed every frame because the rock it points at drifts. */
    private makeGuide() {
      this.guide?.destroy();
      const target = this.rocks.find((r) => !r.prime);
      if (!target) return;
      const c = this.add.container(0, 0);
      const dots = this.add.graphics();
      const label = this.add
        .text(W / 2, this.shipY - 46, "slide under a rock — tap to shoot", {
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          fontSize: "16px",
          color: GUIDE,
        })
        .setOrigin(0.5)
        .setAlpha(0.9);
      c.add([dots, label]);
      c.setDepth(2);
      this.guide = c;
      this.guideDots = dots;
      this.guideTarget = target;
    }

    /** Redraw the coach-mark dots under the drifting target rock. */
    private aimGuide() {
      const dots = this.guideDots;
      const target = this.guideTarget;
      if (!dots || !target || target.dead) {
        this.guideDots?.clear();
        return;
      }
      dots.clear();
      dots.fillStyle(0x9fb0ff, 0.55);
      const x = target.container.x;
      if (x < 30 || x > W - 30) return; // mid-wrap; pointing at an edge helps nobody
      for (let y = this.shipY - 58; y > target.container.y + target.r + 14; y -= 22) {
        dots.fillCircle(x, y, 2.4);
      }
    }

    private pushState() {
      this.bus.emit({
        type: "state",
        payload: {
          asking: this.pending ? this.pending.value : null,
          pairs: this.pending ? factorPairs(this.pending.value) : [],
          started: [...this.startedWith],
          left: this.rocks.filter((r) => !r.dead && !r.prime).length,
          primes: this.rocks
            .filter((r) => !r.dead && r.prime)
            .map((r) => r.value)
            .sort((a, b) => a - b),
          splits: this.splits,
        },
      });
    }

    /** An irregular asteroid for a composite; a faceted crystal for a prime. */
    private drawRockBody(g: Phaser.GameObjects.Graphics, r: number, prime: boolean, seed: number) {
      if (prime) {
        // Elongated hexagonal crystal with facet lines — visibly not breakable rock.
        const pts: Array<[number, number]> = [
          [0, -r * 1.25],
          [r * 0.85, -r * 0.4],
          [r * 0.7, r * 0.75],
          [0, r * 1.15],
          [-r * 0.7, r * 0.75],
          [-r * 0.85, -r * 0.4],
        ];
        g.fillStyle(CRYSTAL_FILL, 1);
        g.lineStyle(2.5, CRYSTAL_EDGE, 1);
        g.beginPath();
        g.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
        g.closePath();
        g.fillPath();
        g.strokePath();
        g.lineStyle(1.2, CRYSTAL_EDGE, 0.45);
        g.lineBetween(pts[0][0], pts[0][1], pts[3][0], pts[3][1]);
        g.lineBetween(pts[5][0], pts[5][1], pts[1][0], pts[1][1]);
        return;
      }
      // Irregular polygon asteroid with a couple of craters.
      const n = 9;
      g.fillStyle(ROCK_FILL, 1);
      g.lineStyle(2.5, ROCK_EDGE, 1);
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        // Deterministic-ish wobble from the seed so redraws match.
        const wobble = 0.82 + 0.3 * Math.abs(Math.sin(seed * 3.7 + i * 2.1));
        const px = Math.cos(a) * r * wobble;
        const py = Math.sin(a) * r * wobble;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fillPath();
      g.strokePath();
      g.fillStyle(ROCK_CRATER, 0.8);
      g.fillEllipse(-r * 0.35, r * 0.3, r * 0.42, r * 0.3);
      g.fillEllipse(r * 0.4, -r * 0.28, r * 0.3, r * 0.22);
    }

    private addRock(value: number, x: number, y: number, burstIn = false) {
      const prime = isPrime(value);
      // Size tracks magnitude so a big composite reads as something to break down.
      const r = prime ? 24 : Math.min(52, 26 + String(value).length * 8);
      const container = this.add.container(x, y);
      const disc = this.add.graphics();
      this.drawRockBody(disc, r, prime, value);
      const label = this.add
        .text(0, 0, String(value), {
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: prime ? "21px" : "26px",
          fontStyle: "bold",
          color: prime ? CRYSTAL_INK : INK_BRIGHT,
        })
        .setOrigin(0.5);
      label.setShadow(0, 0, prime ? "#E06C8C" : "#101426", 6, true, true);
      container.add([disc, label]);
      container.setDepth(3);

      const angle = Math.random() * Math.PI * 2;
      const speed = this.calmMotion
        ? 0
        : ROCK_SPEED_LO + Math.random() * (ROCK_SPEED_HI - ROCK_SPEED_LO);
      this.rocks.push({
        container,
        label,
        disc,
        value,
        prime,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vr: this.calmMotion ? 0 : (prime ? 0.15 : 0.55) * (Math.random() < 0.5 ? -1 : 1),
        r,
        dead: false,
      });

      if (burstIn) {
        container.setScale(0.3);
        this.tweens.add({
          targets: container,
          scale: 1,
          duration: 260,
          ease: "Back.easeOut",
        });
      }
    }

    /** A quick hand-rolled particle burst — no texture pipeline, fully in our control. */
    private burst(x: number, y: number, color: number, count: number, speed: number) {
      if (this.calmMotion) return;
      for (let i = 0; i < count; i++) {
        const p = this.add.circle(x, y, 1.6 + Math.random() * 2.2, color, 0.95);
        p.setDepth(5);
        const a = Math.random() * Math.PI * 2;
        const v = speed * (0.4 + Math.random() * 0.8);
        this.tweens.add({
          targets: p,
          x: x + Math.cos(a) * v,
          y: y + Math.sin(a) * v,
          alpha: 0,
          scale: 0.3,
          duration: 380 + Math.random() * 260,
          ease: "Cubic.easeOut",
          onComplete: () => p.destroy(),
        });
      }
    }

    private fire() {
      if (this.cooldown > 0 || this.pending) return;
      this.cooldown = 0.18;

      if (this.guide && !this.fired) {
        this.fired = true;
        this.tweens.add({
          targets: this.guide,
          alpha: 0,
          duration: 350,
          onComplete: () => this.guide?.destroy(),
        });
      }

      // Muzzle flash + a 3px recoil dip: the tap answers back instantly.
      this.burst(this.shipX, this.shipY - 22, TRACER, 4, 26);
      if (!this.calmMotion) {
        this.tweens.add({ targets: this.ship, y: this.shipY + 3, duration: 45, yoyo: true });
      }

      const g = this.add.graphics();
      g.fillStyle(TRACER, 1);
      g.fillRect(-1.6, -9, 3.2, 18);
      g.fillStyle(0xffffff, 0.9);
      g.fillRect(-0.8, -9, 1.6, 6);
      g.setPosition(this.shipX, this.shipY - 24);
      g.setDepth(4);
      this.shots.push({
        obj: g,
        x: this.shipX,
        y: this.shipY - 24,
        vx: 0,
        vy: -SHOT_SPEED,
        dead: false,
      });
    }

    private hit(shot: Shot, rock: Rock) {
      shot.dead = true;
      shot.obj.destroy();

      const pair = splitPair(rock.value);

      if (pair) {
        /*
         * The whole point of the rebuild: the shot opens the question and SHE says what
         * the rock breaks into. A crack flashes on the rock so the pause reads as
         * "you hit it", not "the game stopped".
         */
        this.burst(shot.x, shot.y, TRACER, 6, 40);
        if (!this.calmMotion) {
          this.tweens.add({
            targets: rock.container,
            scale: 1.08,
            angle: rock.container.angle + 4,
            duration: 80,
            yoyo: true,
          });
        }
        this.pending = rock;
        this.time.delayedCall(120, () => {
          this.scene.pause();
          this.pushState();
        });
        return;
      }

      // A prime. It cannot break — the shot ricochets off with a spark, and the crystal
      // shrugs. No penalty; the cost is that it is still there, in your way.
      this.bounces++;
      this.bus.emit({
        type: "attempt",
        prompt: { n: rock.value, prime: true },
        response: { shot: true, split: false, into: null },
        elapsedMs: Math.max(0, Math.round(this.time.now - this.askedAt)),
      });
      this.askedAt = this.time.now;

      this.burst(shot.x, shot.y, 0xe06c8c, 8, 60);
      if (!this.calmMotion) {
        this.tweens.add({
          targets: rock.container,
          angle: rock.container.angle + 10,
          scale: 1.1,
          duration: 90,
          yoyo: true,
        });
      }
      // The ricochet itself: the tracer glances away and fades.
      const ric = this.add.graphics();
      ric.fillStyle(TRACER, 0.9);
      ric.fillRect(-1.4, -7, 2.8, 14);
      ric.setPosition(shot.x, shot.y);
      ric.setDepth(4);
      ric.setRotation(Math.random() < 0.5 ? -0.9 : 0.9);
      this.tweens.add({
        targets: ric,
        x: shot.x + (Math.random() < 0.5 ? -70 : 70),
        y: shot.y - 40,
        alpha: 0,
        duration: 240,
        ease: "Cubic.easeOut",
        onComplete: () => ric.destroy(),
      });
      this.pushState();
    }

    /**
     * She has named a factor pair for the rock she shot. Called from the host, because
     * the question is rendered in HTML — a number pad in a canvas is a bad number pad.
     */
    answerSplit(a: number, b: number) {
      const rock = this.pending;
      if (!rock || rock.dead) return;
      const ok = a > 1 && b > 1 && a * b === rock.value;

      this.bus.emit({
        type: "attempt",
        prompt: { n: rock.value, prime: false },
        response: { shot: true, split: ok, into: ok ? [a, b] : null },
        elapsedMs: Math.max(0, Math.round(this.time.now - this.askedAt)),
      });
      this.askedAt = this.time.now;
      if (!ok) return;

      this.pending = null;
      this.scene.resume();
      this.splits++;
      rock.dead = true;
      const { x, y } = rock.container;
      rock.container.destroy();

      // The break is the biggest beat in the game: burst, kick, children tumble out.
      this.burst(x, y, ROCK_EDGE, 14, 90);
      this.burst(x, y, TRACER, 6, 55);
      if (!this.calmMotion) this.cameras.main.shake(90, 0.004);

      this.addRock(a, x - 44, y - 10, true);
      this.addRock(b, x + 44, y + 10, true);
      this.pushState();

      if (this.rocks.filter((r) => !r.dead && !r.prime).length === 0) this.complete();
    }

    /** She gave up on this rock; put it back and carry on. */
    cancelSplit() {
      this.pending = null;
      this.scene.resume();
      this.pushState();
    }

    private complete() {
      // Let the last burst land, then line the primes up — the answer, arranged.
      const primes = this.rocks.filter((r) => !r.dead).sort((a, b) => a.value - b.value);
      const gap = Math.min(110, (W - 160) / Math.max(1, primes.length - 1));
      const x0 = W / 2 - (gap * (primes.length - 1)) / 2;
      primes.forEach((r, i) => {
        r.vx = 0;
        r.vy = 0;
        r.vr = 0;
        this.tweens.add({
          targets: r.container,
          x: x0 + i * gap,
          y: H / 2 - 30,
          angle: 0,
          duration: this.calmMotion ? 0 : 520,
          ease: "Cubic.easeInOut",
        });
      });
      this.time.delayedCall(this.calmMotion ? 100 : 700, () => {
        this.bus.emit({
          type: "round:complete",
          payload: {
            started: [...this.startedWith],
            primes: primes.map((r) => r.value),
            splits: this.splits,
            bounces: this.bounces,
          },
        });
      });
    }

    update(_t: number, delta: number) {
      const dt = delta / 1000;
      this.cooldown = Math.max(0, this.cooldown - dt);

      // Starfield drift, slow and endless.
      for (const s of this.stars) {
        s.obj.y += s.speed * dt;
        if (s.obj.y > H + 4) {
          s.obj.y = -4;
          s.obj.x = Math.random() * W;
        }
      }

      // --- Ship control ---------------------------------------------------------
      const left = this.keyLeft?.isDown ?? false;
      const right = this.keyRight?.isDown ?? false;

      if (left || right) {
        // Keyboard has the wheel: real velocity, so holding a key *flies*.
        this.pointerX = null;
        const dir = (right ? 1 : 0) - (left ? 1 : 0);
        this.shipVx += dir * SHIP_ACCEL * dt;
        this.shipVx = Math.max(-SHIP_MAX, Math.min(SHIP_MAX, this.shipVx));
      } else if (this.pointerX !== null) {
        // Pointer has the wheel: track it directly. No glide-to-target lag.
        const dx = this.pointerX - this.shipX;
        this.shipX += dx * Math.min(1, dt * 14);
        this.shipVx = dx * 4; // remembered so the flame knows we are moving
      }

      if (!left && !right) {
        // Brake toward rest so a released key coasts to a stop instead of snapping.
        const sign = Math.sign(this.shipVx);
        this.shipVx -= sign * Math.min(Math.abs(this.shipVx), SHIP_BRAKE * dt);
      }
      if (left || right) this.shipX += this.shipVx * dt;

      this.shipX = Math.max(30, Math.min(W - 30, this.shipX));
      this.ship.setPosition(this.shipX, this.shipY);

      // Thruster: flickers while flying, banks the ship slightly into the turn.
      const moving = Math.abs(this.shipVx) > 60;
      this.flame.setAlpha(moving && !this.calmMotion ? 0.5 + Math.random() * 0.5 : 0);
      this.flame.setScale(1, moving ? 0.7 + Math.random() * 0.6 : 1);
      this.ship.setRotation(this.calmMotion ? 0 : (this.shipVx / SHIP_MAX) * 0.18);

      // A faint engine trail while moving fast — presence, not spectacle.
      if (moving && !this.calmMotion && this.time.now > this.trailAt) {
        this.trailAt = this.time.now + 50;
        const p = this.add.circle(this.shipX, this.shipY + 22, 2.2, FLAME, 0.5);
        p.setDepth(1);
        this.tweens.add({
          targets: p,
          y: this.shipY + 40,
          alpha: 0,
          scale: 0.4,
          duration: 300,
          onComplete: () => p.destroy(),
        });
      }

      // --- Rocks ----------------------------------------------------------------
      for (const r of this.rocks) {
        if (r.dead) continue;
        r.container.x += r.vx * dt;
        r.container.y += r.vy * dt;
        r.container.rotation += r.vr * dt;
        // The label stays upright while the rock tumbles under it.
        r.label.rotation = -r.container.rotation;
        // Wrap rather than bounce: a rock that leaves is never lost, so the board can
        // always be finished.
        if (r.container.x < -r.r) r.container.x = W + r.r;
        if (r.container.x > W + r.r) r.container.x = -r.r;
        if (r.container.y < -r.r) r.container.y = H - 130;
        if (r.container.y > H - 120) r.container.y = -r.r;
      }

      // --- Shots ----------------------------------------------------------------
      for (const s of this.shots) {
        if (s.dead) continue;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.obj.setPosition(s.x, s.y);
        if (s.x < -10 || s.x > W + 10 || s.y < -10 || s.y > H + 10) {
          s.dead = true;
          s.obj.destroy();
          continue;
        }
        for (const r of this.rocks) {
          if (r.dead) continue;
          const dx = r.container.x - s.x;
          const dy = r.container.y - s.y;
          if (dx * dx + dy * dy <= r.r * r.r) {
            this.hit(s, r);
            break;
          }
        }
      }

      this.rocks = this.rocks.filter((r) => !r.dead);
      this.shots = this.shots.filter((s) => !s.dead);

      if (this.guide && !this.fired) this.aimGuide();
    }
  };
}

export const SPLIT_SIZE = { W, H };
