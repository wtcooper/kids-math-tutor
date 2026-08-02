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

const PAPER = 0xfffcf7;
const LINE = 0xeadfce;
const SAGE = 0x6d8e68;
const CLAY = 0xbe6e4e;
const BERRY = 0xaf5c63;

/** Roamer beat, in ms. Deliberately slow — this is pressure, not a reflex test. */
const BEAT = 900;

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
    const a = rnd(lo * 2, hi);
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
  while ((a === b || gcd(a, b) < 3) && guard++ < 60) {
    a = rnd(lo * 2, hi);
    b = rnd(lo * 2, hi);
  }
  return {
    kind,
    a,
    b,
    label: `GCF(${a}, ${b}) = ?  ·  eat what divides both`,
    satisfies: (n) => a % n === 0 && b % n === 0,
  };
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
    private banner!: Phaser.GameObjects.Text;
    private beatAcc = 0;
    private askedAt = 0;
    private eatenTargets: number[] = [];

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

      this.banner = this.add
        .text(W / 2, 74, "", {
          fontFamily: "Georgia, serif",
          fontSize: "30px",
          color: "#3D352C",
        })
        .setOrigin(0.5);

      this.player = this.add.container(0, 0);
      const pg = this.add.graphics();
      pg.lineStyle(3, CLAY, 1);
      pg.strokeRoundedRect(-CELL_W / 2 + 4, -CELL_H / 2 + 4, CELL_W - 8, CELL_H - 8, 12);
      this.player.add(pg);

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
    }

    private answerPool(): number[] {
      const { kind, a, b } = this.rule;
      if (kind === "primes") {
        return [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37];
      }
      if (kind === "multiples") {
        const out: number[] = [];
        for (let i = 1; i * a <= 99; i++) out.push(i * a);
        return out;
      }
      if (kind === "factors") return factorsOf(a).filter((n) => n > 1);
      return commonFactors(a, b!).filter((n) => n > 1);
    }

    private makeCell(c: number, r: number, n: number): Cell {
      const x = GRID_X + c * CELL_W + CELL_W / 2;
      const y = GRID_Y + r * CELL_H + CELL_H / 2;
      const bg = this.add.graphics();
      bg.fillStyle(PAPER, 1);
      bg.lineStyle(1, LINE, 1);
      bg.fillRoundedRect(x - CELL_W / 2 + 5, y - CELL_H / 2 + 5, CELL_W - 10, CELL_H - 10, 12);
      bg.strokeRoundedRect(x - CELL_W / 2 + 5, y - CELL_H / 2 + 5, CELL_W - 10, CELL_H - 10, 12);
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

    private syncPlayer() {
      this.player.setPosition(
        GRID_X + this.col * CELL_W + CELL_W / 2,
        GRID_Y + this.row * CELL_H + CELL_H / 2,
      );
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
      this.syncPlayer();
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
        // One shake. Nothing else — no penalty, no sound, no counter.
        this.tweens.add({
          targets: [cell.text],
          x: cell.text.x + 6,
          duration: 55,
          yoyo: true,
          repeat: 2,
        });
        return;
      }

      cell.eaten = true;
      this.eatenTargets.push(cell.n);
      cell.text.setColor("#4E6E4A");
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

      if (this.remainingTargets() === 0) this.completeRound();
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
          // For the GCF round the largest eaten value IS the answer — the last move.
          gcf: kind === "common" ? gcd(a, b!) : undefined,
        },
      });
    }

    private addRoamer() {
      const obj = this.add.container(0, 0);
      const g = this.add.graphics();
      g.fillStyle(BERRY, 0.85);
      g.fillCircle(0, 0, 17);
      g.fillStyle(0xfffcf7, 1);
      g.fillCircle(-6, -4, 3.5);
      g.fillCircle(6, -4, 3.5);
      obj.add(g);
      const r: Roamer = { col: this.rnd(0, COLS - 1), row: 0, obj };
      this.roamers.push(r);
      this.placeRoamer(r);
    }

    private placeRoamer(r: Roamer) {
      r.obj.setPosition(
        GRID_X + r.col * CELL_W + CELL_W / 2,
        GRID_Y + r.row * CELL_H + CELL_H / 2,
      );
    }

    private moveRoamers() {
      for (const r of this.roamers) {
        // Mild bias toward her, so pressure builds without becoming a chase.
        const towards = Math.random() < 0.45;
        if (towards) {
          if (r.col !== this.col) r.col += r.col < this.col ? 1 : -1;
          else if (r.row !== this.row) r.row += r.row < this.row ? 1 : -1;
        } else {
          if (Math.random() < 0.5) r.col += Math.random() < 0.5 ? 1 : -1;
          else r.row += Math.random() < 0.5 ? 1 : -1;
        }
        r.col = Math.min(COLS - 1, Math.max(0, r.col));
        r.row = Math.min(ROWS - 1, Math.max(0, r.row));
        this.placeRoamer(r);

        if (r.col === this.col && r.row === this.row) this.caught();
      }
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
