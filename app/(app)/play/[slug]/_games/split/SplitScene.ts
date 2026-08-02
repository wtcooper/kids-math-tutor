import type Phaser from "phaser";
import { isPrime } from "@/lib/math/number";
import { FACTOR_HI } from "@/lib/math/topics/factors";
import type { GameBus, GameCommand } from "@/components/game/PhaserGame";

/**
 * Split — a factor tree you play.
 *
 * Rocks drift in carrying composite numbers. Shoot one and it breaks into two factors,
 * which drift apart and can be shot again. **Primes cannot be broken** — a shot bounces
 * off — so the board fills with the primes you made and you have to fly around them.
 *
 * The maths is the mechanic in the strict sense: what a rock *does* when you shoot it is
 * determined entirely by its factorisation, and the board state at the end literally is
 * the prime factorisation of what you started with. Clearing the board means reducing
 * every number to primes, which is the whole topic.
 *
 * No countdown. Rocks drift slowly and never accelerate; the pressure is that the board
 * gets more crowded as you split, which is a consequence of your own choices.
 */

const W = 1024;
const H = 576;

const PAPER = 0xfffcf7;
const LINE = 0xd9cbb4;
const INK = "#3D352C";
const CLAY = 0xbe6e4e;
const SAGE = 0x6d8e68;
const BERRY = 0xaf5c63;

/** Ship travel speed, px/s. Slow enough to be deliberate. */
const SHIP_SPEED = 300;
const SHOT_SPEED = 520;
/** Rocks never move faster than this, at any level. */
const ROCK_SPEED = 26;

export interface Rock {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  disc: Phaser.GameObjects.Graphics;
  value: number;
  prime: boolean;
  vx: number;
  vy: number;
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
    private ship!: Phaser.GameObjects.Container;
    private shipX = W / 2;
    private shipY = H - 70;
    /** Where the ship is heading. Shots always go straight up. */
    private pointerX = W / 2;
    private cooldown = 0;
    private startedWith: number[] = [];
    /** The rock she has shot and must now factorise. Play is paused while it is set. */
    private pending: Rock | null = null;
    private askedAt = 0;
    private splits = 0;
    private bounces = 0;

    constructor() {
      super("split");
    }

    private rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

    create() {
      this.bus = this.registry.get("bus") as GameBus;
      this.offCommand = this.bus.onCommand((cmd: GameCommand) => {
        if (cmd.type === "level:set") {
          this.level = cmd.level;
          this.newBoard();
        } else if (cmd.type === "pause") this.scene.pause();
        else if (cmd.type === "resume") this.scene.resume();
      });

      this.ship = this.makeShip();

      /*
       * One control, and only one: the ship slides to wherever you point, and a tap fires
       * straight up. An earlier version let you aim at the tap *and* had the ship follow
       * the pointer, which fought itself — the ship arrived under the pointer, so every
       * shot went straight up regardless. Lining up under a rock is the whole aiming
       * problem, and it works identically with a finger.
       */
      this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
        this.pointerX = p.worldX;
        this.fire();
      });
      this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
        this.pointerX = p.worldX;
      });

      this.input.keyboard?.on("keydown", (e: KeyboardEvent) => {
        if (e.key === " " || e.key === "ArrowUp") {
          e.preventDefault();
          this.fire();
        } else if (e.key === "ArrowLeft") this.pointerX = Math.max(30, this.shipX - 70);
        else if (e.key === "ArrowRight") this.pointerX = Math.min(W - 30, this.shipX + 70);
      });

      this.newBoard();
    }

    shutdown() {
      this.offCommand?.();
    }

    private makeShip() {
      const c = this.add.container(this.shipX, this.shipY);
      const g = this.add.graphics();
      g.fillStyle(CLAY, 1);
      g.fillTriangle(0, -16, -12, 13, 12, 13);
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
      this.shipY = H - 70;
      this.ship.setPosition(this.shipX, this.shipY);
      this.askedAt = this.time.now;
      this.pushState();
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

    private addRock(value: number, x: number, y: number) {
      const prime = isPrime(value);
      // Size tracks magnitude so a big composite reads as something to break down.
      const r = prime ? 26 : Math.min(52, 26 + String(value).length * 8);
      const container = this.add.container(x, y);
      const disc = this.add.graphics();
      disc.fillStyle(prime ? 0xf1e4e6 : PAPER, 1);
      disc.lineStyle(2, prime ? BERRY : LINE, 1);
      disc.fillCircle(0, 0, r);
      disc.strokeCircle(0, 0, r);
      const label = this.add
        .text(0, 0, String(value), {
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: prime ? "22px" : "26px",
          color: prime ? "#8C4750" : INK,
        })
        .setOrigin(0.5);
      container.add([disc, label]);

      const angle = Math.random() * Math.PI * 2;
      this.rocks.push({
        container,
        label,
        disc,
        value,
        prime,
        vx: Math.cos(angle) * ROCK_SPEED,
        vy: Math.sin(angle) * ROCK_SPEED,
        r,
        dead: false,
      });
    }

    private fire() {
      if (this.cooldown > 0) return;
      this.cooldown = 0.22;
      const g = this.add.graphics();
      g.fillStyle(SAGE, 1);
      g.fillCircle(0, 0, 4);
      g.setPosition(this.shipX, this.shipY);
      this.shots.push({
        obj: g,
        x: this.shipX,
        y: this.shipY,
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
         * The whole point of the rebuild. The game used to pick the factor pair itself,
         * so she could clear a board without naming a single factor — she was only
         * aiming. Now the shot opens the question and SHE says what it breaks into.
         */
        this.pending = rock;
        this.scene.pause();
        this.bus.emit({
          type: "state",
          payload: {
            asking: rock.value,
            pairs: factorPairs(rock.value),
            started: [...this.startedWith],
            left: this.rocks.filter((r) => !r.dead && !r.prime).length,
            primes: this.rocks.filter((r) => !r.dead && r.prime).map((r) => r.value).sort((a, b) => a - b),
            splits: this.splits,
          },
        });
        return;
      }

      this.bus.emit({
        type: "attempt",
        prompt: { n: rock.value, prime: rock.prime },
        response: { shot: true, split: false, into: null },
        elapsedMs: Math.max(0, Math.round(this.time.now - this.askedAt)),
      });
      this.askedAt = this.time.now;

      if (!pair) {
        // A prime. It cannot break, so it shrugs the shot off and drifts on. No penalty —
        // the cost of shooting a prime is that it is still there, in your way.
        this.bounces++;
        this.tweens.add({
          targets: rock.container,
          scale: 1.12,
          duration: 90,
          yoyo: true,
        });
        this.pushState();
        return;
      }
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
      this.addRock(a, x - 40, y - 10);
      this.addRock(b, x + 40, y + 10);
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
      this.bus.emit({
        type: "round:complete",
        payload: {
          started: [...this.startedWith],
          primes: this.rocks
            .filter((r) => !r.dead)
            .map((r) => r.value)
            .sort((a, b) => a - b),
          splits: this.splits,
          bounces: this.bounces,
        },
      });
    }

    update(_t: number, delta: number) {
      const dt = delta / 1000;
      this.cooldown = Math.max(0, this.cooldown - dt);

      const dx = this.pointerX - this.shipX;
      if (Math.abs(dx) > 2) {
        this.shipX += Math.sign(dx) * Math.min(Math.abs(dx), SHIP_SPEED * dt);
        this.shipX = Math.max(30, Math.min(W - 30, this.shipX));
        this.ship.setPosition(this.shipX, this.shipY);
      }

      for (const r of this.rocks) {
        if (r.dead) continue;
        r.container.x += r.vx * dt;
        r.container.y += r.vy * dt;
        // Wrap rather than bounce: a rock that leaves is never lost, so the board can
        // always be finished.
        if (r.container.x < -r.r) r.container.x = W + r.r;
        if (r.container.x > W + r.r) r.container.x = -r.r;
        if (r.container.y < -r.r) r.container.y = H - 130;
        if (r.container.y > H - 120) r.container.y = -r.r;
      }

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
    }
  };
}

export const SPLIT_SIZE = { W, H };
