import type Phaser from "phaser";
import { commonFactors, factorsOf, gcd, isPrime } from "@/lib/math/number";
import { FACTOR_HI, FACTOR_LO } from "@/lib/math/topics/factors";
import type { GameBus, GameCommand } from "@/components/game/PhaserGame";

/**
 * Munchers — factors, multiples and primes.
 *
 * Movement *is* the classification: you step onto a number and eat it, and the only way
 * to play is to decide whether it satisfies the rule. Strip the maths out and there is no
 * game left, which is the test the research sets for intrinsic integration.
 *
 * Number Munchers' real trick, and the reason it is copied here: urgency comes from
 * roamers walking toward you, never from a clock on the question. A wrong munch shakes
 * the cell once and costs nothing — no penalty, no sound, no counter movement.
 *
 * **It is a race.** The Grumps eat the correct numbers too, on their own slow beat. That
 * is what makes them mean something: in the first play-test they only chased, so there
 * was no reason to hurry and no way to tell whether you were winning. Now every number
 * you leave sitting is one they might take, and the round ends with a score you can read.
 *
 * Level 4 is the good one. The rule is "common factors of a and b", the banner reads
 * GCF(a, b) = ?, and **the last one you eat is the GCF** — so the final move is the answer.
 */

const W = 1024;
const H = 576;
const COLS = 6;
const ROWS = 5;
const CELL_W = 132;
const CELL_H = 82;
const GRID_X = (W - COLS * CELL_W) / 2;
const GRID_Y = 150;

/** Stage palette — night orchard (plan 06). Tiles stay light so numbers stay readable. */
const PAPER = 0xf2e9d2;
const LINE = 0xd8ccae;
const SAGE = 0x6d8e68;
const CLAY = 0xbe6e4e;
const BERRY = 0xaf5c63;
const LOAM = 0x232019;
const LOAM_LIGHT = 0x2e2a20;
const MUNCHER = 0x9bc356;
const MUNCHER_DARK = 0x6e9138;
const GRUMP = 0x7b4b6e;
const GRUMP_DARK = 0x5a3651;
const BANNER_INK = "#F2E9D2";

/** Roamer beat, in ms. Deliberately slow — this is pressure, not a reflex test. */
const BEAT = 900;
/**
 * Beats a Grump must sit on a correct number before it eats it. Long enough that she can
 * always beat one to the square she is next to, so losing a number is a decision she
 * made, not a dice roll.
 */
const GRUMP_CHEW = 2;
/**
 * Quiet time at the start of a round, in ms. She gets to read the rule and the board
 * before anything can be taken from her — otherwise numbers vanish while she is still
 * working out what the round is asking, which reads as the game cheating.
 */
const GRACE_MS = 2600;

/**
 * The fewest eatable numbers a rule must be able to put on the board. Below this the
 * round is either trivial or, for a prime, literally unwinnable.
 */
export const MIN_TARGETS = 4;

export type RuleKind = "multiples" | "factors" | "primes" | "common";

export interface Rule {
  kind: RuleKind;
  a: number;
  b?: number;
  label: string;
  satisfies(n: number): boolean;
}

export function makeRule(level: number, rnd: (a: number, b: number) => number): Rule {
  const hi = FACTOR_HI[level - 1];
  const lo = FACTOR_LO[level - 1];

  const choices: RuleKind[] =
    level === 1
      ? ["multiples"]
      : level === 2
        ? ["multiples", "factors"]
        : level === 3
          ? ["multiples", "factors", "primes"]
          : ["factors", "primes", "common"];

  const kind = choices[rnd(0, choices.length - 1)];

  if (kind === "primes") {
    return {
      kind,
      a: 0,
      label: "Eat the primes",
      satisfies: (n) => isPrime(n),
    };
  }
  if (kind === "multiples") {
    const a = rnd(2, Math.min(9, lo + 4));
    return {
      kind,
      a,
      label: `Eat the multiples of ${a}`,
      satisfies: (n) => n % a === 0,
    };
  }
  if (kind === "factors") {
    // A prime here is an unwinnable board: "eat the factors of 61" has nothing on it to
    // eat, because 1 and the number itself are excluded from the pool. Insist on a number
    // with enough factors to fill a board worth playing.
    let a = rnd(lo * 2, hi);
    let guard = 0;
    while (factorsOf(a).filter((n) => n > 1).length < MIN_TARGETS && guard++ < 80) {
      a = rnd(lo * 2, hi);
    }
    if (factorsOf(a).filter((n) => n > 1).length < MIN_TARGETS) a = 48;
    return {
      kind,
      a,
      label: `Eat the factors of ${a}`,
      satisfies: (n) => a % n === 0,
    };
  }
  // common — the GCF round
  let a = rnd(lo * 2, hi);
  let b = rnd(lo * 2, hi);
  let guard = 0;
  while (
    (a === b || commonFactors(a, b).filter((n) => n > 1).length < MIN_TARGETS) &&
    guard++ < 80
  ) {
    a = rnd(lo * 2, hi);
    b = rnd(lo * 2, hi);
  }
  if (commonFactors(a, b).filter((n) => n > 1).length < MIN_TARGETS) {
    a = 48;
    b = 36;
  }
  return {
    kind,
    a,
    b,
    label: `GCF(${a}, ${b}) = ?  ·  eat what divides both`,
    satisfies: (n) => a % n === 0 && b % n === 0,
  };
}

/**
 * Everything this rule could legitimately put on the board. Exported and pure so the
 * "no unwinnable board" invariant can be tested without a browser.
 */
export function answersFor(rule: Rule): number[] {
  const { kind, a, b } = rule;
  if (kind === "primes") return [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37];
  if (kind === "multiples") {
    const out: number[] = [];
    for (let i = 1; i * a <= 99; i++) out.push(i * a);
    return out;
  }
  if (kind === "factors") return factorsOf(a).filter((n) => n > 1);
  return commonFactors(a, b!).filter((n) => n > 1);
}

interface Cell {
  n: number;
  eaten: boolean;
  text: Phaser.GameObjects.Text;
  bg: Phaser.GameObjects.Graphics;
}

interface Roamer {
  col: number;
  row: number;
  obj: Phaser.GameObjects.Container;
  /** Beats spent sitting on the current correct number. */
  chewing: number;
}

export function createGridScene(P: typeof Phaser, config: { level: number }) {
  return class GridScene extends P.Scene {
    private bus!: GameBus;
    private offCommand?: () => void;

    private level = config.level;
    private rule!: Rule;
    private cells: (Cell | null)[][] = [];
    private roamers: Roamer[] = [];
    private col = 2;
    private row = 2;
    private player!: Phaser.GameObjects.Container;
    private playerCritter!: Phaser.GameObjects.Container;
    private calmMotion = false;
    private banner!: Phaser.GameObjects.Text;
    private beatAcc = 0;
    private askedAt = 0;
    private eatenTargets: number[] = [];
    private grumpScore = 0;
    private graceUntil = 0;

    constructor() {
      super("grid");
    }

    private rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

    create() {
      this.bus = this.registry.get("bus") as GameBus;
      this.offCommand = this.bus.onCommand((cmd: GameCommand) => {
        if (cmd.type === "level:set") {
          this.level = cmd.level;
          this.newRound();
        } else if (cmd.type === "pause") this.scene.pause();
        else if (cmd.type === "resume") this.scene.resume();
      });

      this.calmMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // The orchard floor: a soft-lit loam panel behind the whole grid.
      const floor = this.add.graphics();
      floor.fillStyle(LOAM_LIGHT, 1);
      floor.fillRoundedRect(GRID_X - 22, GRID_Y - 22, COLS * CELL_W + 44, ROWS * CELL_H + 44, 22);
      floor.fillStyle(LOAM, 0.55);
      floor.fillRoundedRect(GRID_X - 22, GRID_Y + ROWS * CELL_H - 8, COLS * CELL_W + 44, 30, 14);

      this.banner = this.add
        .text(W / 2, 74, "", {
          fontFamily: "Georgia, serif",
          fontSize: "30px",
          color: BANNER_INK,
        })
        .setOrigin(0.5);
      this.banner.setShadow(0, 1, "#141210", 5, true, true);

      // A ring *and* a creature. The ring alone read as a cursor, so it was not obvious
      // which thing on the board was her — now a round lime muncher sits in the corner.
      this.player = this.add.container(0, 0);
      const ring = this.add.graphics();
      ring.lineStyle(3, MUNCHER, 1);
      ring.strokeRoundedRect(-CELL_W / 2 + 4, -CELL_H / 2 + 4, CELL_W - 8, CELL_H - 8, 12);
      this.player.add(ring);

      const critter = this.add.container(-CELL_W / 2 + 22, -CELL_H / 2 + 18);
      const pg = this.add.graphics();
      // Feet, body, cheeks, eyes, mouth.
      pg.fillStyle(MUNCHER_DARK, 1);
      pg.fillEllipse(-6, 12, 8, 5);
      pg.fillEllipse(6, 12, 8, 5);
      pg.fillStyle(MUNCHER, 1);
      pg.fillCircle(0, 0, 13);
      pg.fillStyle(0xffffff, 0.25);
      pg.fillEllipse(-4, -5, 8, 6);
      pg.fillStyle(0x2c3618, 1);
      pg.fillCircle(-5, -3, 2.6);
      pg.fillCircle(5, -3, 2.6);
      pg.fillStyle(MUNCHER_DARK, 1);
      pg.fillEllipse(0, 6, 9, 4.5);
      critter.add(pg);
      this.player.add(critter);
      this.playerCritter = critter;
      this.player.setDepth(5);
      if (!this.calmMotion) {
        this.tweens.add({
          targets: critter,
          y: critter.y - 3,
          duration: 700,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }

      // Pointer-first: tap an adjacent cell to step, tap your own cell to munch.
      this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.onTap(p));

      // Keyboard as a bonus for laptop play. The constraint is against keyboard-*only*
      // design, not against keyboard support.
      this.input.keyboard?.on("keydown", (e: KeyboardEvent) => {
        if (e.key === "ArrowUp") this.step(0, -1);
        else if (e.key === "ArrowDown") this.step(0, 1);
        else if (e.key === "ArrowLeft") this.step(-1, 0);
        else if (e.key === "ArrowRight") this.step(1, 0);
        else if (e.key === " " || e.key === "Enter") this.munch();
      });

      this.newRound();
    }

    shutdown() {
      this.offCommand?.();
    }

    private newRound() {
      this.cells.flat().forEach((c) => {
        if (c) {
          c.text.destroy();
          c.bg.destroy();
        }
      });
      this.roamers.forEach((r) => r.obj.destroy());
      this.roamers = [];
      this.cells = [];
      this.eatenTargets = [];
      this.grumpScore = 0;

      this.rule = makeRule(this.level, this.rnd);
      this.banner.setText(this.rule.label);

      const hi = FACTOR_HI[this.level - 1];
      // Guarantee a solvable board: seed real answers, then fill with distractors.
      const answers = this.answerPool();
      const wanted = Math.min(answers.length, 8 + this.rnd(0, 3));
      const chosen: number[] = [];
      for (let i = 0; i < wanted && answers.length; i++) {
        chosen.push(answers.splice(this.rnd(0, answers.length - 1), 1)[0]);
      }

      const values: number[] = [...chosen];
      while (values.length < COLS * ROWS) values.push(this.rnd(2, Math.max(hi, 24)));
      // Shuffle so answers are not clustered at the start.
      for (let i = values.length - 1; i > 0; i--) {
        const j = this.rnd(0, i);
        [values[i], values[j]] = [values[j], values[i]];
      }

      for (let r = 0; r < ROWS; r++) {
        this.cells[r] = [];
        for (let c = 0; c < COLS; c++) {
          this.cells[r][c] = this.makeCell(c, r, values[r * COLS + c]);
        }
      }

      this.col = 2;
      this.row = 2;
      this.syncPlayer();

      const roamerCount = Math.min(3, Math.max(1, this.level - 1));
      for (let i = 0; i < roamerCount; i++) this.addRoamer();

      this.askedAt = this.time.now;
      this.graceUntil = this.time.now + GRACE_MS;
      // Zeroed here too: a slow first frame after page load banks a large delta, which
      // let several beats fire back to back and cost her numbers before she had moved.
      this.beatAcc = 0;
      this.pushState();
    }

    /** Live HUD state. Cheap, and only ever read — never persisted. */
    private pushState() {
      this.bus.emit({
        type: "state",
        payload: {
          rule: this.rule.label,
          yours: this.eatenTargets.length,
          grumps: this.grumpScore,
          left: this.remainingTargets(),
        },
      });
    }

    private answerPool(): number[] {
      return answersFor(this.rule);
    }

    private makeCell(c: number, r: number, n: number): Cell {
      const x = GRID_X + c * CELL_W + CELL_W / 2;
      const y = GRID_Y + r * CELL_H + CELL_H / 2;
      const bg = this.add.graphics();
      // A leaf-tile lying on dark loam: shadow under, lit face, soft top highlight.
      bg.fillStyle(0x14110c, 0.55);
      bg.fillRoundedRect(x - CELL_W / 2 + 5, y - CELL_H / 2 + 9, CELL_W - 10, CELL_H - 10, 12);
      bg.fillStyle(PAPER, 1);
      bg.lineStyle(1, LINE, 1);
      bg.fillRoundedRect(x - CELL_W / 2 + 5, y - CELL_H / 2 + 5, CELL_W - 10, CELL_H - 10, 12);
      bg.strokeRoundedRect(x - CELL_W / 2 + 5, y - CELL_H / 2 + 5, CELL_W - 10, CELL_H - 10, 12);
      bg.fillStyle(0xffffff, 0.35);
      bg.fillRoundedRect(x - CELL_W / 2 + 9, y - CELL_H / 2 + 8, CELL_W - 18, 10, 5);
      const text = this.add
        .text(x, y, String(n), {
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: "30px",
          color: "#3D352C",
        })
        .setOrigin(0.5);
      return { n, eaten: false, text, bg };
    }

    private cellAt(c: number, r: number) {
      return this.cells[r]?.[c] ?? null;
    }

    private syncPlayer(animate = false) {
      const x = GRID_X + this.col * CELL_W + CELL_W / 2;
      const y = GRID_Y + this.row * CELL_H + CELL_H / 2;
      if (!animate || this.calmMotion) {
        this.player.setPosition(x, y);
        return;
      }
      // A hop between cells, not a teleport: quick move with a landing bounce.
      this.tweens.add({
        targets: this.player,
        x,
        y,
        duration: 110,
        ease: "Quad.easeOut",
      });
      this.tweens.add({
        targets: this.playerCritter,
        scaleX: 1.15,
        scaleY: 0.85,
        duration: 60,
        delay: 100,
        yoyo: true,
      });
    }

    private onTap(p: Phaser.Input.Pointer) {
      const c = Math.floor((p.worldX - GRID_X) / CELL_W);
      const r = Math.floor((p.worldY - GRID_Y) / CELL_H);
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
      if (c === this.col && r === this.row) {
        this.munch();
        return;
      }
      const dc = c - this.col;
      const dr = r - this.row;
      // Only orthogonal neighbours, so a stray tap never teleports her across the board.
      if (Math.abs(dc) + Math.abs(dr) === 1) this.step(dc, dr);
    }

    private step(dc: number, dr: number) {
      this.col = Math.min(COLS - 1, Math.max(0, this.col + dc));
      this.row = Math.min(ROWS - 1, Math.max(0, this.row + dr));
      this.syncPlayer(true);
    }

    private munch() {
      const cell = this.cellAt(this.col, this.row);
      if (!cell || cell.eaten) return;

      const ok = this.rule.satisfies(cell.n);
      this.bus.emit({
        type: "attempt",
        prompt: { rule: this.rule.kind, a: this.rule.a, b: this.rule.b, n: cell.n },
        response: { ate: true, ok },
        elapsedMs: Math.max(0, Math.round(this.time.now - this.askedAt)),
      });
      this.askedAt = this.time.now;

      if (!ok) {
        // One shake and a pulled face. Nothing else — no penalty, no sound, no counter.
        this.tweens.add({
          targets: [cell.text],
          x: cell.text.x + 6,
          duration: 55,
          yoyo: true,
          repeat: 2,
        });
        if (!this.calmMotion) {
          this.tweens.add({
            targets: this.playerCritter,
            angle: { from: -10, to: 10 },
            duration: 60,
            yoyo: true,
            repeat: 2,
            onComplete: () => this.playerCritter.setAngle(0),
          });
        }
        return;
      }

      cell.eaten = true;
      this.eatenTargets.push(cell.n);
      cell.text.setColor("#4E6E4A");
      // The chomp: the muncher gulps, the number pops, crumbs scatter.
      if (!this.calmMotion) {
        this.tweens.add({
          targets: this.playerCritter,
          scale: 1.35,
          duration: 90,
          yoyo: true,
          ease: "Back.easeOut",
        });
        this.crumbs(cell.text.x, cell.text.y, MUNCHER);
      }
      this.tweens.add({
        targets: [cell.text],
        alpha: 0,
        scale: 1.4,
        duration: 260,
        onComplete: () => {
          cell.text.setVisible(false);
          cell.bg.setAlpha(0.4);
        },
      });

      this.pushState();
      if (this.remainingTargets() === 0) this.completeRound();
    }

    /** Crumb burst where a number was eaten — by her in lime, by a Grump in plum. */
    private crumbs(x: number, y: number, color: number) {
      for (let i = 0; i < 8; i++) {
        const p = this.add.circle(x, y, 1.5 + Math.random() * 2, color, 0.9);
        p.setDepth(6);
        const a = Math.random() * Math.PI * 2;
        const v = 24 + Math.random() * 34;
        this.tweens.add({
          targets: p,
          x: x + Math.cos(a) * v,
          y: y + Math.sin(a) * v + 10,
          alpha: 0,
          duration: 360 + Math.random() * 200,
          ease: "Cubic.easeOut",
          onComplete: () => p.destroy(),
        });
      }
    }

    private remainingTargets(): number {
      let n = 0;
      for (const row of this.cells) {
        for (const cell of row) {
          if (cell && !cell.eaten && this.rule.satisfies(cell.n)) n++;
        }
      }
      return n;
    }

    private completeRound() {
      const { kind, a, b } = this.rule;
      this.bus.emit({
        type: "round:complete",
        payload: {
          rule: kind,
          a,
          b,
          eaten: [...this.eatenTargets].sort((x, y) => x - y),
          yours: this.eatenTargets.length,
          grumps: this.grumpScore,
          // For the GCF round the largest eaten value IS the answer — the last move.
          gcf: kind === "common" ? gcd(a, b!) : undefined,
        },
      });
    }

    private addRoamer() {
      const obj = this.add.container(0, 0);
      const g = this.add.graphics();
      // Small and tucked into the cell's corner. A roamer centred on the cell covered the
      // number, so she could not read what she was about to eat.
      // A Grump: heavy plum body, stubby feet, brows that mean business.
      g.fillStyle(GRUMP_DARK, 1);
      g.fillEllipse(-5, 12, 7, 4);
      g.fillEllipse(5, 12, 7, 4);
      g.fillStyle(GRUMP, 1);
      g.fillCircle(0, 0, 13);
      g.fillStyle(0xffffff, 0.14);
      g.fillEllipse(-4, -5, 7, 5);
      g.fillStyle(0xf2e9d2, 1);
      g.fillCircle(-4.5, -2, 3);
      g.fillCircle(4.5, -2, 3);
      g.fillStyle(0x2a1b26, 1);
      g.fillCircle(-4.5, -1.5, 1.6);
      g.fillCircle(4.5, -1.5, 1.6);
      // The brows.
      g.lineStyle(2.4, GRUMP_DARK, 1);
      g.lineBetween(-8, -8, -1.5, -5.5);
      g.lineBetween(8, -8, 1.5, -5.5);
      // A grim little mouth.
      g.lineBetween(-3.5, 6, 3.5, 6);
      obj.add(g);
      obj.setDepth(6);
      const r: Roamer = { col: this.rnd(0, COLS - 1), row: 0, obj, chewing: 0 };
      this.roamers.push(r);
      this.placeRoamer(r);
    }

    private roamerXY(r: Roamer): [number, number] {
      return [
        GRID_X + r.col * CELL_W + CELL_W - 26,
        GRID_Y + r.row * CELL_H + CELL_H - 22,
      ];
    }

    private placeRoamer(r: Roamer, animate = false) {
      const [x, y] = this.roamerXY(r);
      if (!animate || this.calmMotion) {
        r.obj.setPosition(x, y);
        return;
      }
      // A lumbering waddle: slower than her hop, with a heavy sway.
      this.tweens.add({ targets: r.obj, x, y, duration: 320, ease: "Sine.easeInOut" });
      this.tweens.add({
        targets: r.obj,
        angle: { from: -6, to: 6 },
        duration: 160,
        yoyo: true,
        onComplete: () => r.obj.setAngle(0),
      });
    }

    private moveRoamers() {
      let ateSomething = false;

      for (const r of this.roamers) {
        // Sitting on an uneaten answer? Chew it. This is the race: a number left alone
        // for two beats is a number the Grumps take off the board.
        const grace = this.time.now < this.graceUntil;
        const here = this.cellAt(r.col, r.row);
        if (!grace && here && !here.eaten && this.rule.satisfies(here.n)) {
          r.chewing++;
          if (r.chewing >= GRUMP_CHEW) {
            r.chewing = 0;
            this.grumpEat(here);
            if (!this.calmMotion) {
              this.tweens.add({ targets: r.obj, scale: 1.35, duration: 110, yoyo: true });
            }
            ateSomething = true;
            continue;
          }
          // Stay put while chewing — and telegraph it, so losing the number is
          // something she watched start, not a thing that happened off-screen.
          if (!this.calmMotion) {
            this.tweens.add({
              targets: r.obj,
              scale: 1.18,
              duration: 140,
              yoyo: true,
              repeat: 2,
            });
            this.tweens.add({
              targets: here.text,
              alpha: 0.45,
              duration: 180,
              yoyo: true,
              repeat: 1,
            });
          }
          continue;
        }
        r.chewing = 0;

        // Head for the nearest number they can eat; only sometimes toward her. Chasing was
        // all they used to do, and it gave her no reason to hurry.
        const prey = this.nearestTarget(r.col, r.row);
        const goal = prey && Math.random() < 0.7 ? prey : { col: this.col, row: this.row };

        if (r.col !== goal.col) r.col += r.col < goal.col ? 1 : -1;
        else if (r.row !== goal.row) r.row += r.row < goal.row ? 1 : -1;

        r.col = Math.min(COLS - 1, Math.max(0, r.col));
        r.row = Math.min(ROWS - 1, Math.max(0, r.row));
        this.placeRoamer(r, true);

        if (r.col === this.col && r.row === this.row) this.caught();
      }

      if (ateSomething) {
        this.pushState();
        if (this.remainingTargets() === 0) this.completeRound();
      }
    }

    private nearestTarget(col: number, row: number): { col: number; row: number } | null {
      let best: { col: number; row: number } | null = null;
      let bestD = Infinity;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cell = this.cellAt(c, r);
          if (!cell || cell.eaten || !this.rule.satisfies(cell.n)) continue;
          const d = Math.abs(c - col) + Math.abs(r - row);
          if (d < bestD) {
            bestD = d;
            best = { col: c, row: r };
          }
        }
      }
      return best;
    }

    private grumpEat(cell: Cell) {
      cell.eaten = true;
      this.grumpScore++;
      cell.text.setColor("#A05560");
      if (!this.calmMotion) this.crumbs(cell.text.x, cell.text.y, GRUMP);
      this.tweens.add({
        targets: [cell.text],
        alpha: 0,
        scale: 0.6,
        duration: 240,
        onComplete: () => {
          cell.text.setVisible(false);
          cell.bg.setAlpha(0.25);
        },
      });
    }

    /** Instant respawn at centre. Board unchanged, nothing lost. */
    private caught() {
      this.col = 2;
      this.row = 2;
      this.syncPlayer();
      this.tweens.add({
        targets: [this.player],
        alpha: 0.2,
        duration: 110,
        yoyo: true,
        repeat: 1,
      });
    }

    update(_t: number, delta: number) {
      this.beatAcc += delta;
      if (this.beatAcc >= BEAT) {
        this.beatAcc = 0;
        this.moveRoamers();
      }
    }
  };
}

export const MUNCHERS_SIZE = { W, H, COLS, ROWS };
export const MUNCHERS_COLORS = { PAPER, LINE, SAGE, CLAY, BERRY };
