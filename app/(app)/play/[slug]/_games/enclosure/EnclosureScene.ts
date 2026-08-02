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

const PAPER = 0xfffcf7;
const LINE = 0xe6dccb;
const INK = "#3D352C";
const CLAY = 0xbe6e4e;
const SAGE = 0x6d8e68;

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

      this.drawGrid();
      this.fill = this.add.graphics().setDepth(1);
      this.ink = this.add.graphics().setDepth(2);
      this.banner = this.add
        .text(W / 2, 44, "", {
          fontFamily: "Georgia, serif",
          fontSize: "26px",
          color: INK,
        })
        .setOrigin(0.5);

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
      g.fillStyle(PAPER, 1);
      g.fillRect(GRID_X, GRID_Y, COLS * CELL, ROWS * CELL);
      g.lineStyle(1, LINE, 1);
      for (let c = 0; c <= COLS; c++) {
        g.lineBetween(GRID_X + c * CELL, GRID_Y, GRID_X + c * CELL, GRID_Y + ROWS * CELL);
      }
      for (let r = 0; r <= ROWS; r++) {
        g.lineBetween(GRID_X, GRID_Y + r * CELL, GRID_X + COLS * CELL, GRID_Y + r * CELL);
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
    }

    /** Fence spent so far, in unit edges. */
    private fenceUsed(): number {
      return Math.max(0, this.path.length - 1);
    }

    private redraw() {
      this.ink.clear();
      this.fill.clear();

      // The walked line.
      if (this.path.length > 1) {
        this.ink.lineStyle(5, SAGE, 1);
        this.ink.beginPath();
        const first = this.px(this.path[0]);
        this.ink.moveTo(first.x, first.y);
        for (const p of this.path.slice(1)) {
          const q = this.px(p);
          this.ink.lineTo(q.x, q.y);
        }
        this.ink.strokePath();
      }

      // Start post and head.
      const s = this.px(this.path[0]);
      this.ink.fillStyle(CLAY, 1);
      this.ink.fillCircle(s.x, s.y, 6);
      const h = this.px(this.head);
      this.ink.fillStyle(SAGE, 1);
      this.ink.fillCircle(h.x, h.y, 8);

      // Live area shading, so she can see the enclosure forming rather than only at the
      // end. This is the whole feedback loop of the game.
      const closed = this.path.length > 4 && same(this.head, this.path[0]);
      const cells = closed ? enclosedCells(this.path.slice(0, -1)) : [];
      this.fill.fillStyle(SAGE, 0.16);
      for (const cell of cells) {
        this.fill.fillRect(GRID_X + cell.c * CELL + 1, GRID_Y + cell.r * CELL + 1, CELL - 2, CELL - 2);
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
  };
}

export const ENCLOSURE_SIZE = { W, H };
