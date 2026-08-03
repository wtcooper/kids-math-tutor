import type Phaser from "phaser";
import type { GameBus, GameCommand } from "@/components/game/PhaserGame";

/**
 * Enclosure — area and perimeter, felt rather than recited.
 *
 * You walk a line on a grid and close a loop. The loop's **area** is the number of
 * squares inside it; its **perimeter** is the number of edges around it — which is also
 * exactly how much fence you spent walking it. The commission asks for a specific area,
 * and sometimes for a perimeter under a limit.
 *
 * This is the one game in the set where the mechanic *is* the misconception. Kids conflate
 * area and perimeter constantly; here they are two different resources you feel trading
 * off against each other. A long thin 1×12 and a fat 3×4 both have area 12, and walking
 * both makes it obvious that one costs far more fence than the other.
 *
 * No countdown anywhere. You can walk as long as you like, and undo any step.
 */

const W = 1024;
const H = 576;

export const COLS = 16;
export const ROWS = 10;
const CELL = 44;
const GRID_X = (W - COLS * CELL) / 2;
const GRID_Y = 96;

/** Stage palette — spring meadow (plan 06). */
const GRASS = 0x5e8c4a;
const GRASS_MOWN = 0x679455;
const GRID_LINE = 0x4a7340;
const TIMBER = 0xc9a36b;
const TIMBER_DARK = 0x8a6642;
const POST_RED = 0xc4452f;
const WHEAT = 0xd9b44a;
const BANNER_INK = "#FDF6E5";
const FLAG = 0xfdf6e5;

export interface Commission {
  area: number;
  /** Optional cap. When present, the shape must be fat rather than long. */
  maxPerimeter?: number;
  label: string;
}

/**
 * Perimeter of the tightest rectangle with this area — the best she could possibly do.
 * Used to set a cap that is achievable but rules out the lazy 1×n strip.
 */
export function bestPerimeter(area: number): number {
  let best = Infinity;
  for (let w = 1; w <= area; w++) {
    if (area % w !== 0) continue;
    best = Math.min(best, 2 * (w + area / w));
  }
  return best;
}

/** Perimeter of the 1×n strip — the shape she reaches for if nothing stops her. */
export function stripPerimeter(area: number): number {
  return 2 * (area + 1);
}

export function makeCommission(
  level: number,
  rnd: (a: number, b: number) => number,
): Commission {
  // Areas that factor well, so a fat rectangle actually exists.
  const pool =
    level <= 1
      ? [6, 8, 9, 12]
      : level <= 3
        ? [12, 16, 18, 20, 24]
        : level <= 5
          ? [24, 28, 30, 36]
          : [36, 40, 42, 48];
  const area = pool[rnd(0, pool.length - 1)];

  // From level 2 on, cap the fence so the 1×n strip is ruled out and she has to think
  // about shape rather than just count squares.
  if (level >= 2) {
    const best = bestPerimeter(area);
    const cap = best + (level >= 4 ? 2 : 4);
    if (cap < stripPerimeter(area)) {
      return {
        area,
        maxPerimeter: cap,
        label: `Fence exactly ${area} squares — using ${cap} fence or less`,
      };
    }
  }
  return { area, label: `Fence exactly ${area} squares` };
}

interface Pt {
  c: number;
  r: number;
}

const same = (a: Pt, b: Pt) => a.c === b.c && a.r === b.r;

/**
 * The squares enclosed by a closed rectilinear path, by even-odd crossing.
 *
 * A cell is inside when a ray cast to the left crosses an odd number of vertical edges.
 * Exported so the geometry can be tested without a browser — this is the part that has to
 * be right, because it is what the commission is judged on.
 */
export function enclosedCells(path: Pt[]): Pt[] {
  if (path.length < 4) return [];
  const verticals = new Set<string>();
  for (let i = 0; i < path.length; i++) {
    const a = path[i];
    const b = path[(i + 1) % path.length];
    if (a.c !== b.c) continue;
    // Record every unit row the segment spans, not just its start. Walking always steps
    // one unit at a time, but the closing segment back to the first post can be any
    // length, and a multi-row edge counted once puts the crossing parity out for every
    // row it skipped.
    const lo = Math.min(a.r, b.r);
    const hi = Math.max(a.r, b.r);
    for (let r = lo; r < hi; r++) verticals.add(`${a.c},${r}`);
  }

  const inside: Pt[] = [];
  for (let r = 0; r < ROWS; r++) {
    let crossings = 0;
    for (let c = 0; c < COLS; c++) {
      // Edge on the left boundary of cell (c, r).
      if (verticals.has(`${c},${r}`)) crossings++;
      if (crossings % 2 === 1) inside.push({ c, r });
    }
  }
  return inside;
}

export function createEnclosureScene(P: typeof Phaser, config: { level: number }) {
  return class EnclosureScene extends P.Scene {
    private bus!: GameBus;
    private offCommand?: () => void;

    private level = config.level;
    private commission!: Commission;
    /** Lattice points, in order walked. */
    private path: Pt[] = [];
    private head: Pt = { c: 0, r: 0 };
    private ink!: Phaser.GameObjects.Graphics;
    private fill!: Phaser.GameObjects.Graphics;
    private banner!: Phaser.GameObjects.Text;
    private butterflies: Array<{
      obj: Phaser.GameObjects.Container;
      speed: number;
      phase: number;
      baseY: number;
    }> = [];
    private calmMotion = false;
    private startedAt = 0;

    constructor() {
      super("enclosure");
    }

    private rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

    create() {
      this.bus = this.registry.get("bus") as GameBus;
      this.offCommand = this.bus.onCommand((cmd: GameCommand) => {
        if (cmd.type === "level:set") {
          this.level = cmd.level;
          this.newCommission();
        } else if (cmd.type === "pause") this.scene.pause();
        else if (cmd.type === "resume") this.scene.resume();
        else if (cmd.type === "undo") this.undo();
        else if (cmd.type === "reset") this.clearPath();
        else if (cmd.type === "next") this.newCommission();
      });

      this.calmMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      this.drawGrid();
      this.fill = this.add.graphics().setDepth(1);
      this.ink = this.add.graphics().setDepth(2);

      // The commission is a signboard staked at the meadow's edge, not a floating line.
      const sign = this.add.graphics().setDepth(3);
      sign.fillStyle(TIMBER_DARK, 1);
      sign.fillRect(W / 2 - 3, 52, 6, 26);
      sign.fillStyle(0x9c7448, 1);
      sign.fillRoundedRect(W / 2 - 310, 22, 620, 44, 9);
      sign.lineStyle(2, 0x7a5a38, 1);
      sign.strokeRoundedRect(W / 2 - 310, 22, 620, 44, 9);
      this.banner = this.add
        .text(W / 2, 44, "", {
          fontFamily: "Georgia, serif",
          fontSize: "25px",
          color: BANNER_INK,
        })
        .setOrigin(0.5)
        .setDepth(4);

      // Tap the lattice point you want to walk to. Only orthogonal neighbours count, so a
      // stray tap can never teleport the line across the board.
      this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.onTap(p.worldX, p.worldY));

      this.input.keyboard?.on("keydown", (e: KeyboardEvent) => {
        const map: Record<string, [number, number]> = {
          ArrowUp: [0, -1],
          ArrowDown: [0, 1],
          ArrowLeft: [-1, 0],
          ArrowRight: [1, 0],
        };
        const d = map[e.key];
        if (d) {
          e.preventDefault();
          this.walkTo({ c: this.head.c + d[0], r: this.head.r + d[1] });
        } else if (e.key === "Backspace") {
          e.preventDefault();
          this.undo();
        }
      });

      this.newCommission();
    }

    shutdown() {
      this.offCommand?.();
    }

    private drawGrid() {
      const g = this.add.graphics().setDepth(0);
      // Mown stripes across the paddock, like a cut hayfield.
      for (let c = 0; c < COLS; c++) {
        g.fillStyle(c % 2 === 0 ? GRASS : GRASS_MOWN, 1);
        g.fillRect(GRID_X + c * CELL, GRID_Y, CELL, ROWS * CELL);
      }
      g.lineStyle(1, GRID_LINE, 0.55);
      for (let c = 0; c <= COLS; c++) {
        g.lineBetween(GRID_X + c * CELL, GRID_Y, GRID_X + c * CELL, GRID_Y + ROWS * CELL);
      }
      for (let r = 0; r <= ROWS; r++) {
        g.lineBetween(GRID_X, GRID_Y + r * CELL, GRID_X + COLS * CELL, GRID_Y + r * CELL);
      }
      // Tufts and small flowers scattered outside the paddock so the field keeps going.
      for (let i = 0; i < 26; i++) {
        const x = this.rnd(10, W - 10);
        const yTop = this.rnd(6, GRID_Y - 14);
        const yBot = this.rnd(GRID_Y + ROWS * CELL + 10, H - 8);
        const y = Math.random() < 0.5 ? yTop : yBot;
        g.fillStyle(GRASS_MOWN, 1);
        g.fillEllipse(x, y, this.rnd(8, 16), 5);
        if (i % 4 === 0) {
          g.fillStyle(i % 8 === 0 ? 0xe8e2f2 : 0xf2d8ac, 1);
          g.fillCircle(x + 4, y - 4, 2.4);
        }
      }
      // Butterflies for ambient life.
      this.butterflies = [];
      if (!this.calmMotion) {
        for (let i = 0; i < 3; i++) {
          const b = this.add.container(this.rnd(60, W - 60), this.rnd(20, 80));
          const bg = this.add.graphics();
          bg.fillStyle(FLAG, 0.9);
          bg.fillEllipse(-3, 0, 5, 7);
          bg.fillEllipse(3, 0, 5, 7);
          b.add(bg);
          b.setDepth(5);
          this.butterflies.push({
            obj: b,
            speed: 14 + Math.random() * 12,
            phase: Math.random() * Math.PI * 2,
            baseY: b.y,
          });
          this.tweens.add({
            targets: bg,
            scaleX: 0.5,
            duration: 160,
            yoyo: true,
            repeat: -1,
          });
        }
      }
    }

    private px(p: Pt) {
      return { x: GRID_X + p.c * CELL, y: GRID_Y + p.r * CELL };
    }

    private newCommission() {
      this.commission = makeCommission(this.level, this.rnd);
      this.banner.setText(this.commission.label);
      this.clearPath();
      this.startedAt = this.time.now;
    }

    private clearPath() {
      this.head = { c: 2, r: 2 };
      this.path = [{ ...this.head }];
      this.redraw();
    }

    private undo() {
      if (this.path.length <= 1) return;
      this.path.pop();
      this.head = { ...this.path[this.path.length - 1] };
      this.redraw();
    }

    private onTap(x: number, y: number) {
      const c = Math.round((x - GRID_X) / CELL);
      const r = Math.round((y - GRID_Y) / CELL);
      this.walkTo({ c, r });
    }

    private walkTo(next: Pt) {
      if (next.c < 0 || next.c > COLS || next.r < 0 || next.r > ROWS) return;
      const d = Math.abs(next.c - this.head.c) + Math.abs(next.r - this.head.r);
      if (d !== 1) return;

      // Stepping back onto the previous point is an undo — the natural way to take a
      // wrong move back without hunting for a button.
      if (this.path.length >= 2 && same(next, this.path[this.path.length - 2])) {
        this.undo();
        return;
      }

      // Closing the loop.
      if (same(next, this.path[0]) && this.path.length >= 4) {
        this.path.push({ ...next });
        this.head = { ...next };
        this.redraw();
        this.judge();
        return;
      }

      // No crossing your own line — the enclosed area would stop being well defined.
      if (this.path.some((p) => same(p, next))) return;

      this.path.push({ ...next });
      this.head = { ...next };
      this.redraw();
      this.postThunk(next);
    }

    /** A post going in has weight: a small dust puff at the strike point. */
    private postThunk(p: Pt) {
      if (this.calmMotion) return;
      const { x, y } = this.px(p);
      for (let i = 0; i < 4; i++) {
        const d = this.add.circle(x, y, 1.5 + Math.random() * 1.5, 0xd8cfae, 0.7);
        d.setDepth(6);
        const a = Math.random() * Math.PI * 2;
        this.tweens.add({
          targets: d,
          x: x + Math.cos(a) * (10 + Math.random() * 10),
          y: y - Math.random() * 12,
          alpha: 0,
          duration: 280,
          ease: "Cubic.easeOut",
          onComplete: () => d.destroy(),
        });
      }
    }

    /** Fence spent so far, in unit edges. */
    private fenceUsed(): number {
      return Math.max(0, this.path.length - 1);
    }

    private redraw() {
      this.ink.clear();
      this.fill.clear();

      // The fence: a timber rail with its shadow, and a post at every corner walked.
      if (this.path.length > 1) {
        const first = this.px(this.path[0]);
        this.ink.lineStyle(7, 0x3d5233, 0.5);
        this.ink.beginPath();
        this.ink.moveTo(first.x, first.y + 3);
        for (const p of this.path.slice(1)) {
          const q = this.px(p);
          this.ink.lineTo(q.x, q.y + 3);
        }
        this.ink.strokePath();
        this.ink.lineStyle(5, TIMBER, 1);
        this.ink.beginPath();
        this.ink.moveTo(first.x, first.y);
        for (const p of this.path.slice(1)) {
          const q = this.px(p);
          this.ink.lineTo(q.x, q.y);
        }
        this.ink.strokePath();
      }
      for (const p of this.path) {
        const q = this.px(p);
        this.ink.fillStyle(TIMBER_DARK, 1);
        this.ink.fillCircle(q.x, q.y + 1.5, 5);
        this.ink.fillStyle(TIMBER, 1);
        this.ink.fillCircle(q.x, q.y, 4);
      }

      // The start post is the red one — the loop closes back on it.
      const s = this.px(this.path[0]);
      this.ink.fillStyle(POST_RED, 1);
      this.ink.fillCircle(s.x, s.y, 6.5);
      this.ink.fillStyle(0xffffff, 0.35);
      this.ink.fillCircle(s.x - 1.5, s.y - 1.5, 2);

      // Where she is now: a cream survey flag.
      const h = this.px(this.head);
      this.ink.fillStyle(TIMBER_DARK, 1);
      this.ink.fillRect(h.x - 1, h.y - 16, 2, 16);
      this.ink.fillStyle(FLAG, 1);
      this.ink.fillTriangle(h.x + 1, h.y - 16, h.x + 13, h.y - 12, h.x + 1, h.y - 8);
      this.ink.fillStyle(0x3d5233, 0.9);
      this.ink.fillCircle(h.x, h.y, 3);

      // Live area shading, so she can see the enclosure forming rather than only at the
      // end. This is the whole feedback loop of the game. Closed fields grow wheat.
      const closed = this.path.length > 4 && same(this.head, this.path[0]);
      const cells = closed ? enclosedCells(this.path.slice(0, -1)) : [];
      for (const cell of cells) {
        const cx = GRID_X + cell.c * CELL;
        const cy = GRID_Y + cell.r * CELL;
        this.fill.fillStyle(WHEAT, 0.55);
        this.fill.fillRect(cx + 1, cy + 1, CELL - 2, CELL - 2);
        // A few wheat stalks per square.
        this.fill.lineStyle(1.5, 0xb8912f, 0.8);
        for (let i = 0; i < 3; i++) {
          const sx = cx + 8 + i * 13;
          this.fill.lineBetween(sx, cy + CELL - 8, sx + 3, cy + 10);
        }
      }

      this.bus.emit({
        type: "state",
        payload: {
          wantArea: this.commission.area,
          maxPerimeter: this.commission.maxPerimeter,
          area: cells.length,
          fence: this.fenceUsed(),
          closed,
        },
      });
    }

    private judge() {
      const cells = enclosedCells(this.path.slice(0, -1));
      const area = cells.length;
      const fence = this.fenceUsed();
      const areaOk = area === this.commission.area;
      const fenceOk =
        this.commission.maxPerimeter === undefined || fence <= this.commission.maxPerimeter;

      this.bus.emit({
        type: "attempt",
        prompt: {
          wantArea: this.commission.area,
          maxPerimeter: this.commission.maxPerimeter ?? null,
        },
        response: { area, perimeter: fence, ok: areaOk && fenceOk },
        elapsedMs: Math.max(0, Math.round(this.time.now - this.startedAt)),
      });

      this.bus.emit({
        type: "round:complete",
        payload: {
          wantArea: this.commission.area,
          maxPerimeter: this.commission.maxPerimeter ?? null,
          area,
          perimeter: fence,
          areaOk,
          fenceOk,
          bestPossible: bestPerimeter(this.commission.area),
        },
      });
    }

    /** Called by the host when she asks for another commission. */
    next() {
      this.newCommission();
    }

    update(t: number, delta: number) {
      const dt = delta / 1000;
      for (const b of this.butterflies) {
        b.obj.x += b.speed * dt;
        b.obj.y = b.baseY + Math.sin(t / 600 + b.phase) * 9;
        if (b.obj.x > W + 12) b.obj.x = -12;
      }
    }
  };
}

export const ENCLOSURE_SIZE = { W, H };
