import type Phaser from "phaser";
import { card, fams, type FactKind } from "@/lib/math/facts";
import type { GameBus, GameCommand } from "@/components/game/PhaserGame";

/**
 * Threading — the math-facts game.
 *
 * Number tiles drift right-to-left across three lanes. Drag a thread from one tile to
 * another; if the pair satisfies the target, both fly into it and a new target appears.
 * A wrong pair dissolves. Nothing else happens — no sound, no shake, no counter movement.
 *
 * Two design rules from docs/research/ are load-bearing:
 *
 * - **No countdown, anywhere.** Urgency comes only from the flow of tiles. Math anxiety
 *   peaks in 6th grade and timed drilling is the documented way to manufacture it. Tiles
 *   that reach the edge simply exit; a missed tile is a non-event.
 * - **The symbolic fade** is staged on progress *within a session*, never on level, so it
 *   can never read as a difficulty label. Dots → dots with numeral → bare notation.
 */

const W = 1024;
const H = 576;
const LANES = [210, 330, 450];
const TILE_W = 96;
const TILE_H = 76;

const INK = 0x3d352c;
const INK2 = 0x6e6053;
const PAPER = 0xfffcf7;
const LINE = 0xeadfce;
const CLAY = 0xbe6e4e;
const SAGE = 0x6d8e68;

/** How many solves before each fade stage. Progress-based, not level-based. */
const FADE_DOTS_ONLY = 3;
const FADE_MIXED = 8;

interface Tile {
  container: Phaser.GameObjects.Container;
  value: number;
  /** Which operand this represents, so a pair can be checked without re-deriving. */
  fam: number;
  other: number;
  lane: number;
  dead: boolean;
}

export interface ThreadingConfig {
  kind: FactKind;
  level: number;
}

export function createLaneScene(P: typeof Phaser, config: ThreadingConfig) {
  return class LaneScene extends P.Scene {
    private bus!: GameBus;
    private offCommand?: () => void;

    private level = config.level;
    private tiles: Tile[] = [];
    private targetValue = 0;
    private targetPair: [number, number] = [2, 2];
    private solved = 0;
    private spawnAcc = 0;
    private askedAt = 0;
    private seq = 0;

    private targetText!: Phaser.GameObjects.Text;
    private targetSub!: Phaser.GameObjects.Text;
    private dotGroup!: Phaser.GameObjects.Container;
    private thread!: Phaser.GameObjects.Graphics;
    private dragFrom: Tile | null = null;

    constructor() {
      super("lane");
    }

    create() {
      this.bus = this.registry.get("bus") as GameBus;
      this.offCommand = this.bus.onCommand((cmd: GameCommand) => {
        if (cmd.type === "level:set") {
          this.level = cmd.level;
          this.resetBoard();
        } else if (cmd.type === "pause") this.scene.pause();
        else if (cmd.type === "resume") this.scene.resume();
      });

      // Lane guides — faint, so the eye follows the flow without being led by it.
      const g = this.add.graphics();
      g.lineStyle(1, LINE, 1);
      for (const y of LANES) {
        g.lineBetween(0, y + TILE_H / 2 + 14, W, y + TILE_H / 2 + 14);
      }

      this.dotGroup = this.add.container(W / 2, 96);
      this.targetText = this.add
        .text(W / 2, 64, "", {
          fontFamily: "Georgia, serif",
          fontSize: "54px",
          color: "#3D352C",
        })
        .setOrigin(0.5);
      this.targetSub = this.add
        .text(W / 2, 132, "", {
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          fontSize: "17px",
          color: "#9A8B7C",
        })
        .setOrigin(0.5);

      this.thread = this.add.graphics();

      this.input.on("pointerup", () => this.endDrag(null));

      this.resetBoard();
    }

    shutdown() {
      this.offCommand?.();
    }

    private resetBoard() {
      this.tiles.forEach((t) => t.container.destroy());
      this.tiles = [];
      this.solved = 0;
      this.newTarget();
      // Seed the board so she is not staring at an empty screen.
      for (let i = 0; i < 5; i++) this.spawnTile(W * 0.35 + i * 150);
    }

    private newTarget() {
      const pool = fams(this.level);
      const f = pool[Math.floor(Math.random() * pool.length)];
      const i = 2 + Math.floor(Math.random() * 11);
      this.targetPair = [f, i];
      const c = card(config.kind, f, i);
      // For mul the target is the product; for div it is the quotient. Same generator
      // drives both, because facts-div.card(f,i) is (f*i) ÷ f = i.
      this.targetValue = config.kind === "mul" ? f * i : i;
      this.renderTarget(c.q);
      this.askedAt = this.time.now;
    }

    /** The symbolic fade. Stage is a function of solves this session, never of level. */
    private renderTarget(question: string) {
      this.dotGroup.removeAll(true);
      const [f, i] = this.targetPair;

      if (this.solved < FADE_DOTS_ONLY) {
        this.targetText.setText(String(this.targetValue));
        this.targetSub.setText("");
        this.drawDots(f, i);
      } else if (this.solved < FADE_MIXED) {
        this.targetText.setText(String(this.targetValue));
        this.targetSub.setText(question.replace(/\d+$/, "?"));
        this.drawDots(f, i, 0.35);
      } else {
        // Pure notation. By now she has been reading it for a while.
        this.targetText.setText(
          config.kind === "mul" ? `${f} × ? = ${f * i}` : `${f * i} ÷ ${f} = ?`,
        );
        this.targetSub.setText("");
      }
    }

    private drawDots(rows: number, cols: number, alpha = 1) {
      const r = 4;
      const gap = 12;
      const w = (cols - 1) * gap;
      const h = (rows - 1) * gap;
      const dots = this.add.graphics();
      dots.fillStyle(CLAY, alpha * 0.85);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          dots.fillCircle(x * gap - w / 2, y * gap - h / 2 + 26, r);
        }
      }
      this.dotGroup.add(dots);
    }

    private spawnTile(atX = W + TILE_W) {
      const pool = fams(this.level);
      const lane = Math.floor(Math.random() * LANES.length);

      // Bias toward numbers that can actually complete the current target, so the board
      // is solvable without being obvious.
      let value: number;
      let fam: number;
      let other: number;
      if (Math.random() < 0.45) {
        const [f, i] = this.targetPair;
        const useF = Math.random() < 0.5;
        value = config.kind === "mul" ? (useF ? f : i) : useF ? f * i : f;
        fam = f;
        other = i;
      } else {
        fam = pool[Math.floor(Math.random() * pool.length)];
        other = 2 + Math.floor(Math.random() * 11);
        value = config.kind === "mul" ? other : fam * other;
      }

      const container = this.add.container(atX, LANES[lane]);
      const bg = this.add.graphics();
      bg.fillStyle(PAPER, 1);
      bg.lineStyle(1, LINE, 1);
      bg.fillRoundedRect(-TILE_W / 2, -TILE_H / 2, TILE_W, TILE_H, 14);
      bg.strokeRoundedRect(-TILE_W / 2, -TILE_H / 2, TILE_W, TILE_H, 14);
      const label = this.add
        .text(0, 0, String(value), {
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: "34px",
          color: "#3D352C",
        })
        .setOrigin(0.5);
      container.add([bg, label]);
      container.setSize(TILE_W, TILE_H);
      container.setInteractive(
        new P.Geom.Rectangle(-TILE_W / 2, -TILE_H / 2, TILE_W, TILE_H),
        P.Geom.Rectangle.Contains,
      );

      const tile: Tile = { container, value, fam, other, lane, dead: false };

      container.on("pointerdown", () => this.beginDrag(tile));
      container.on("pointerover", () => {
        if (this.dragFrom && this.dragFrom !== tile) this.endDrag(tile);
      });
      container.on("pointerup", () => this.endDrag(tile));

      this.tiles.push(tile);
    }

    private beginDrag(tile: Tile) {
      this.dragFrom = tile;
    }

    private endDrag(to: Tile | null) {
      const from = this.dragFrom;
      this.dragFrom = null;
      this.thread.clear();
      if (!from || !to || from === to || from.dead || to.dead) return;

      const ok = this.pairSatisfies(from.value, to.value);

      this.bus.emit({
        type: "attempt",
        prompt: {
          kind: config.kind,
          fam: this.targetPair[0],
          other: this.targetPair[1],
          target: this.targetValue,
        },
        response: { a: from.value, b: to.value, ok },
        elapsedMs: Math.max(0, Math.round(this.time.now - this.askedAt)),
      });
      this.seq++;

      if (!ok) {
        // Dissolve, silently. No penalty, no sound, no counter movement.
        this.dissolve(from);
        this.dissolve(to);
        return;
      }

      this.solved++;
      this.consume(from);
      this.consume(to);
      this.newTarget();
    }

    private pairSatisfies(a: number, b: number): boolean {
      if (config.kind === "mul") return a * b === this.targetValue;
      // Division: one tile is the dividend, the other the divisor.
      return (
        (b !== 0 && a / b === this.targetValue) || (a !== 0 && b / a === this.targetValue)
      );
    }

    private consume(tile: Tile) {
      tile.dead = true;
      this.tweens.add({
        targets: tile.container,
        x: W / 2,
        y: 96,
        scale: 0.2,
        alpha: 0,
        duration: 320,
        ease: "Cubic.easeIn",
        onComplete: () => tile.container.destroy(),
      });
    }

    private dissolve(tile: Tile) {
      this.tweens.add({
        targets: tile.container,
        alpha: 0.35,
        duration: 140,
        yoyo: true,
      });
    }

    update(_time: number, delta: number) {
      const dt = delta / 1000;
      // Lane speed is the only difficulty knob. It never accelerates within a round.
      const speed = 62;

      for (const tile of this.tiles) {
        if (tile.dead) continue;
        tile.container.x -= speed * dt;
        if (tile.container.x < -TILE_W) {
          tile.dead = true;
          tile.container.destroy();
        }
      }
      this.tiles = this.tiles.filter((t) => !t.dead || t.container.active);

      this.spawnAcc += dt;
      if (this.spawnAcc > 1.15) {
        this.spawnAcc = 0;
        this.spawnTile();
      }

      // Live thread while dragging.
      this.thread.clear();
      if (this.dragFrom) {
        const p = this.input.activePointer;
        this.thread.lineStyle(3, SAGE, 0.75);
        this.thread.lineBetween(
          this.dragFrom.container.x,
          this.dragFrom.container.y,
          p.worldX,
          p.worldY,
        );
      }
    }
  };
}

export const THREADING_COLORS = { INK, INK2, PAPER, LINE, CLAY, SAGE };
export const THREADING_SIZE = { W, H };
