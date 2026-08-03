import type Phaser from "phaser";
import { isPrime } from "@/lib/math/number";
import type { GameBus, GameCommand } from "@/components/game/PhaserGame";
import {
  primeFactorCount,
  splitPair,
  startingNumbers,
} from "../split/SplitScene";

/**
 * Orbit — Split with the thinking moved into the trigger finger.
 *
 * The cannon is loaded with a PRIME you choose (2, 3, 5, 7, 11, 13 on the ammo rack).
 * Firing p at a rock carrying n splits it **only if p divides n** — into the crystal p
 * and the rock n/p, live, mid-flight, no pause and no menu. Choosing the ammo IS trial
 * division: facing 51, the whole game is "does 3 go into 51?" — thought before the
 * trigger, not a quiz after the hit. Divisibility rules are the skill ceiling: knowing
 * that 87's digits sum to 15 is what makes you fast.
 *
 * A wrong prime ricochets off with a spark, free and silent. The board ends, exactly as
 * in Split, as nothing but primes — the factorisation, extracted one prime at a time.
 *
 * No countdown. Rocks drift a little faster than Split's; the pressure is only ever the
 * crowding of the board you made.
 */

const W = 1024;
const H = 576;

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
const GUIDE = "#9FB0FF";

/** The ammo rack. Six primes covers every factor the generators can deal. */
export const AMMO: readonly number[] = [2, 3, 5, 7, 11, 13];
/** Each prime's tracer colour, so a 3-shot looks different from a 7-shot. */
const AMMO_TINT: Record<number, number> = {
  2: 0xffe9a8,
  3: 0x9fd66d,
  5: 0x6fc3e8,
  7: 0xe08aa0,
  11: 0xc9a2f0,
  13: 0xf2a03d,
};

const SHIP_MAX = 640;
const SHIP_ACCEL = 2600;
const SHIP_BRAKE = 2200;
const SHOT_SPEED = 700;
const ROCK_SPEED_LO = 70;
const ROCK_SPEED_HI = 110;

interface Rock {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  value: number;
  prime: boolean;
  vx: number;
  vy: number;
  vr: number;
  r: number;
  dead: boolean;
}

interface Shot {
  obj: Phaser.GameObjects.Container;
  prime: number;
  x: number;
  y: number;
  vy: number;
  dead: boolean;
}

export function createOrbitScene(P: typeof Phaser, config: { level: number }) {
  return class OrbitScene extends P.Scene {
    private bus!: GameBus;
    private offCommand?: () => void;

    private level = config.level;
    private rocks: Rock[] = [];
    private shots: Shot[] = [];
    private stars: Array<{ obj: Phaser.GameObjects.Arc; speed: number }> = [];
    private ship!: Phaser.GameObjects.Container;
    private flame!: Phaser.GameObjects.Graphics;
    private ammoRack!: Phaser.GameObjects.Container;
    private ammoMarks: Phaser.GameObjects.Graphics[] = [];
    private shipX = W / 2;
    private shipY = H - 64;
    private shipVx = 0;
    private pointerX: number | null = null;
    private keyLeft?: Phaser.Input.Keyboard.Key;
    private keyRight?: Phaser.Input.Keyboard.Key;
    private cooldown = 0;
    private trailAt = 0;
    private startedWith: number[] = [];
    private loaded = 2;
    private splits = 0;
    private bounces = 0;
    private askedAt = 0;
    private guide?: Phaser.GameObjects.Container;
    private fired = false;
    private calmMotion = false;

    constructor() {
      super("orbit");
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
      this.makeAmmoRack();

      this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
        // The rack is tappable; anywhere else fires.
        if (this.tapAmmo(p.worldX, p.worldY)) return;
        this.fire();
      });
      this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
        this.pointerX = p.worldX;
      });

      this.keyLeft = this.input.keyboard?.addKey(P.Input.Keyboard.KeyCodes.LEFT);
      this.keyRight = this.input.keyboard?.addKey(P.Input.Keyboard.KeyCodes.RIGHT);
      this.input.keyboard?.on("keydown", (e: KeyboardEvent) => {
        if (e.key === " " || e.key === "ArrowUp") {
          e.preventDefault();
          this.fire();
        } else {
          const i = Number(e.key) - 1;
          if (i >= 0 && i < AMMO.length) this.loadAmmo(AMMO[i]);
        }
      });

      this.newBoard();
    }

    shutdown() {
      this.offCommand?.();
    }

    private makeStarfield() {
      const layers = [
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
          this.stars.push({ obj: star, speed: this.calmMotion ? 0 : L.sp });
        }
      }
    }

    private makeShip() {
      const c = this.add.container(this.shipX, this.shipY);
      this.flame = this.add.graphics();
      this.flame.fillStyle(FLAME, 0.9);
      this.flame.fillTriangle(-5, 16, 5, 16, 0, 32);
      this.flame.setAlpha(0);
      c.add(this.flame);
      const g = this.add.graphics();
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

    /** The rack: six prime shells along the bottom-left, tap or press 1–6 to load. */
    private makeAmmoRack() {
      this.ammoRack = this.add.container(0, 0).setDepth(8);
      this.ammoMarks = [];
      AMMO.forEach((p, i) => {
        const x = 34 + i * 52;
        const y = H - 30;
        const mark = this.add.graphics();
        this.drawAmmoShell(mark, x, y, p, p === this.loaded);
        this.ammoMarks.push(mark);
        const label = this.add
          .text(x, y, String(p), {
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: "17px",
            fontStyle: "bold",
            color: CRYSTAL_INK,
          })
          .setOrigin(0.5);
        const key = this.add
          .text(x, y - 27, String(i + 1), {
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            fontSize: "10px",
            color: "#5B6280",
          })
          .setOrigin(0.5);
        this.ammoRack.add([mark, label, key]);
      });
    }

    private drawAmmoShell(g: Phaser.GameObjects.Graphics, x: number, y: number, p: number, on: boolean) {
      g.clear();
      g.fillStyle(on ? 0x51263c : 0x1c2233, 1);
      g.lineStyle(2, on ? CRYSTAL_EDGE : 0x39415a, 1);
      g.fillCircle(x, y, 16);
      g.strokeCircle(x, y, 16);
      if (on) {
        g.lineStyle(1.5, AMMO_TINT[p] ?? 0xffffff, 0.9);
        g.strokeCircle(x, y, 20);
      }
    }

    private tapAmmo(x: number, y: number): boolean {
      if (y < H - 58) return false;
      const i = Math.round((x - 34) / 52);
      if (i < 0 || i >= AMMO.length || Math.abs(34 + i * 52 - x) > 24) return false;
      this.loadAmmo(AMMO[i]);
      return true;
    }

    private loadAmmo(p: number) {
      this.loaded = p;
      AMMO.forEach((q, i) => {
        this.drawAmmoShell(this.ammoMarks[i], 34 + i * 52, H - 30, q, q === this.loaded);
      });
      this.pushState();
    }

    private newBoard() {
      this.rocks.forEach((r) => r.container.destroy());
      this.shots.forEach((s) => s.obj.destroy());
      this.rocks = [];
      this.shots = [];
      this.splits = 0;
      this.bounces = 0;

      this.startedWith = startingNumbers(this.level, this.rnd);
      this.startedWith.forEach((n, i) => {
        const angle = (i / this.startedWith.length) * Math.PI * 2;
        this.addRock(n, W / 2 + Math.cos(angle) * 260, 200 + Math.sin(angle) * 100);
      });

      this.shipX = W / 2;
      this.shipVx = 0;
      this.pointerX = null;
      this.ship.setPosition(this.shipX, this.shipY);
      this.askedAt = this.time.now;
      if (!this.fired) this.makeGuide();
      this.pushState();
    }

    private makeGuide() {
      this.guide?.destroy();
      const label = this.add
        .text(W / 2, this.shipY - 46, "load a prime below — a shot only splits what it divides", {
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          fontSize: "16px",
          color: GUIDE,
        })
        .setOrigin(0.5)
        .setAlpha(0.9)
        .setDepth(2);
      const c = this.add.container(0, 0);
      c.add(label);
      this.guide = c;
    }

    private pushState() {
      this.bus.emit({
        type: "state",
        payload: {
          loaded: this.loaded,
          started: [...this.startedWith],
          left: this.rocks.filter((r) => !r.dead && !r.prime).length,
          composites: this.rocks
            .filter((r) => !r.dead && !r.prime)
            .map((r) => r.value)
            .sort((a, b) => a - b),
          primes: this.rocks
            .filter((r) => !r.dead && r.prime)
            .map((r) => r.value)
            .sort((a, b) => a - b),
          splits: this.splits,
          bounces: this.bounces,
        },
      });
    }

    private drawRockBody(g: Phaser.GameObjects.Graphics, r: number, prime: boolean, seed: number) {
      if (prime) {
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
        return;
      }
      const n = 9;
      g.fillStyle(ROCK_FILL, 1);
      g.lineStyle(2.5, ROCK_EDGE, 1);
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
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
    }

    private addRock(value: number, x: number, y: number, burstIn = false) {
      const prime = isPrime(value);
      const r = prime ? 22 : Math.min(50, 26 + String(value).length * 8);
      const container = this.add.container(x, y);
      const body = this.add.graphics();
      this.drawRockBody(body, r, prime, value);
      const label = this.add
        .text(0, 0, String(value), {
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: prime ? "20px" : "26px",
          fontStyle: "bold",
          color: prime ? CRYSTAL_INK : INK_BRIGHT,
        })
        .setOrigin(0.5);
      label.setShadow(0, 0, prime ? "#E06C8C" : "#101426", 6, true, true);
      container.add([body, label]);
      container.setDepth(3);

      const angle = Math.random() * Math.PI * 2;
      const speed = this.calmMotion
        ? 0
        : ROCK_SPEED_LO + Math.random() * (ROCK_SPEED_HI - ROCK_SPEED_LO);
      this.rocks.push({
        container,
        label,
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
        this.tweens.add({ targets: container, scale: 1, duration: 260, ease: "Back.easeOut" });
      }
    }

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
      if (this.cooldown > 0) return;
      this.cooldown = 0.2;

      if (this.guide && !this.fired) {
        this.fired = true;
        this.tweens.add({
          targets: this.guide,
          alpha: 0,
          duration: 350,
          onComplete: () => this.guide?.destroy(),
        });
      }

      const tint = AMMO_TINT[this.loaded] ?? 0xffffff;
      this.burst(this.shipX, this.shipY - 22, tint, 4, 26);
      if (!this.calmMotion) {
        this.tweens.add({ targets: this.ship, y: this.shipY + 3, duration: 45, yoyo: true });
      }

      // The shot IS the prime: a small labelled shell, so what you fired stays readable.
      const c = this.add.container(this.shipX, this.shipY - 24).setDepth(4);
      const g = this.add.graphics();
      g.fillStyle(tint, 1);
      g.fillCircle(0, 0, 9);
      g.fillStyle(0x101426, 0.85);
      g.fillCircle(0, 0, 6.5);
      c.add(g);
      c.add(
        this.add
          .text(0, 0, String(this.loaded), {
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: "11px",
            fontStyle: "bold",
            color: "#FFFFFF",
          })
          .setOrigin(0.5),
      );
      this.shots.push({
        obj: c,
        prime: this.loaded,
        x: this.shipX,
        y: this.shipY - 24,
        vy: -SHOT_SPEED,
        dead: false,
      });
    }

    private hit(shot: Shot, rock: Rock) {
      shot.dead = true;
      shot.obj.destroy();
      const p = shot.prime;
      const divides = !rock.prime && rock.value % p === 0;

      this.bus.emit({
        type: "attempt",
        prompt: { n: rock.value, prime: rock.prime, fired: p },
        response: { divides },
        elapsedMs: Math.max(0, Math.round(this.time.now - this.askedAt)),
      });
      this.askedAt = this.time.now;

      if (!divides) {
        // p does not go into n (or n is already prime): the shell glances off. Free.
        this.bounces++;
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
        this.pushState();
        return;
      }

      // p divides n: the prime is pulled out of the rock, live.
      this.splits++;
      rock.dead = true;
      const { x, y } = rock.container;
      rock.container.destroy();
      this.burst(x, y, ROCK_EDGE, 14, 90);
      this.burst(x, y, AMMO_TINT[p] ?? 0xffffff, 6, 55);
      if (!this.calmMotion) this.cameras.main.shake(90, 0.004);

      this.addRock(p, x - 44, y - 10, true);
      const rest = rock.value / p;
      this.addRock(rest, x + 44, y + 10, true);
      this.pushState();

      if (this.rocks.filter((r) => !r.dead && !r.prime).length === 0) this.complete();
    }

    private complete() {
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

      for (const s of this.stars) {
        s.obj.y += s.speed * dt;
        if (s.obj.y > H + 4) {
          s.obj.y = -4;
          s.obj.x = Math.random() * W;
        }
      }

      const left = this.keyLeft?.isDown ?? false;
      const right = this.keyRight?.isDown ?? false;
      if (left || right) {
        this.pointerX = null;
        const dir = (right ? 1 : 0) - (left ? 1 : 0);
        this.shipVx += dir * SHIP_ACCEL * dt;
        this.shipVx = Math.max(-SHIP_MAX, Math.min(SHIP_MAX, this.shipVx));
      } else if (this.pointerX !== null) {
        const dx = this.pointerX - this.shipX;
        this.shipX += dx * Math.min(1, dt * 14);
        this.shipVx = dx * 4;
      }
      if (!left && !right) {
        const sign = Math.sign(this.shipVx);
        this.shipVx -= sign * Math.min(Math.abs(this.shipVx), SHIP_BRAKE * dt);
      }
      if (left || right) this.shipX += this.shipVx * dt;
      this.shipX = Math.max(30, Math.min(W - 30, this.shipX));
      this.ship.setPosition(this.shipX, this.shipY);

      const moving = Math.abs(this.shipVx) > 60;
      this.flame.setAlpha(moving && !this.calmMotion ? 0.5 + Math.random() * 0.5 : 0);
      this.flame.setScale(1, moving ? 0.7 + Math.random() * 0.6 : 1);
      this.ship.setRotation(this.calmMotion ? 0 : (this.shipVx / SHIP_MAX) * 0.18);

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

      for (const r of this.rocks) {
        if (r.dead) continue;
        r.container.x += r.vx * dt;
        r.container.y += r.vy * dt;
        r.container.rotation += r.vr * dt;
        r.label.rotation = -r.container.rotation;
        if (r.container.x < -r.r) r.container.x = W + r.r;
        if (r.container.x > W + r.r) r.container.x = -r.r;
        if (r.container.y < -r.r) r.container.y = H - 130;
        if (r.container.y > H - 120) r.container.y = -r.r;
      }

      for (const s of this.shots) {
        if (s.dead) continue;
        s.y += s.vy * dt;
        s.obj.setPosition(s.x, s.y);
        if (s.y < -12) {
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

// Re-exported so Orbit's tests exercise the same helpers Split's do.
export { primeFactorCount, splitPair, startingNumbers };
export const ORBIT_SIZE = { W, H };
