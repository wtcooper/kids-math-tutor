import type Phaser from "phaser";
import { fams, type FactKind } from "@/lib/math/facts";
import { factorsOf } from "@/lib/math/number";
import type { GameBus, GameCommand } from "@/components/game/PhaserGame";

/**
 * Crossing — math facts as terrain.
 *
 * Stepping stones drift across a river. Only the ones that satisfy the rule hold your
 * weight; the rest sink. So *reading the board for multiples is the navigation* — strip
 * the maths out and there is no route to find, which is the intrinsic-integration test
 * from docs/research/01-pedagogy.md.
 *
 * This replaces Threading, whose drag-a-thread mechanic was unplayable: Phaser's
 * `pointerover` never fires on touch (there is no hover), and the tiles moved out from
 * under the pointer mid-drag. Tapping a stone is one unambiguous gesture that works
 * identically with a finger, a mouse and the arrow keys.
 *
 * Load-bearing design rules:
 * - **No countdown.** Urgency is the drift of the stones and nothing else. Waiting on the
 *   bank for a good stone costs nothing at all.
 * - **Sinking is free.** You go back to the near bank. No sound, no penalty, no counter.
 * - **The symbolic fade** runs on crossings completed this session, never on level, so it
 *   can never read as a difficulty label.
 */

const W = 1024;
const H = 576;

/** River rows, top to bottom. The frog crosses from the bottom bank to the top. */
const ROW_Y = [150, 232, 314, 396];
const BANK_TOP_Y = 74;
const BANK_BOTTOM_Y = 492;

const STONE_W = 96;
const STONE_H = 58;
/** Track length: one screen plus a stone, so wrapping is invisible. */
const TRACK = W + 180;
/** How far sideways she can reach when hopping. Generous — this is not a precision test. */
const REACH = 230;
/** The frog rides slightly high on a stone so it never covers the number it landed on. */
const FROG_LIFT = 15;

const PAPER = 0xfffcf7;
const LINE = 0xeadfce;
const WATER = 0xe8eef0;
const INK = "#3D352C";
const SAGE = 0x6d8e68;
const CLAY = 0xbe6e4e;

/** Crossings completed before each fade stage. Progress-based, not level-based. */
const FADE_LIST = 2;
const FADE_HINT = 4;
/** Crossings in a round. Small enough to always be finishable. */
export const CROSSINGS_PER_ROUND = 4;

interface Stone {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  bg: Phaser.GameObjects.Graphics;
  value: number;
  ok: boolean;
  x: number;
  row: number;
  sinking: boolean;
}

interface Rule {
  /** "Only step on multiples of 7" / "…on numbers that divide 56 exactly". */
  label: string;
  /** The short form the banner fades down to. */
  short: string;
  /** The scaffold list — the tutor's own skip-count row, or the factor list. */
  members: number[];
  ok(n: number): boolean;
  base: number;
  target?: number;
}

export interface CrossingConfig {
  kind: FactKind;
  level: number;
}

function makeRule(kind: FactKind, level: number, rnd: (a: number, b: number) => number): Rule {
  const pool = fams(level);
  const f = pool[rnd(0, pool.length - 1)];

  if (kind === "mul") {
    const members: number[] = [];
    for (let k = 2; k <= 12; k++) members.push(f * k);
    return {
      label: `Only step on multiples of ${f}`,
      short: `× ${f}`,
      members,
      base: f,
      ok: (n) => n % f === 0,
    };
  }

  // Division facts asked the way they are actually used: does this number go into it?
  const k = rnd(4, 12);
  const target = f * k;
  const members = factorsOf(target).filter((n) => n >= 2 && n <= 99);
  return {
    label: `Only step on numbers that divide ${target} exactly`,
    short: `→ ${target}`,
    members,
    base: f,
    target,
    ok: (n) => n >= 2 && target % n === 0,
  };
}

export function createCrossingScene(P: typeof Phaser, config: CrossingConfig) {
  return class CrossingScene extends P.Scene {
    private bus!: GameBus;
    private offCommand?: () => void;

    private level = config.level;
    private rule!: Rule;
    private rows: Stone[][] = [];
    /** -1 is the bottom bank; ROW_Y.length is the goal bank. */
    private frogRow = -1;
    private frogStone: Stone | null = null;
    private frogX = W / 2;
    private frog!: Phaser.GameObjects.Container;

    private banner!: Phaser.GameObjects.Text;
    private strip!: Phaser.GameObjects.Text;
    private crossings = 0;
    private hopping = false;
    private askedAt = 0;
    /**
     * True between reaching the far bank and the next crossing being dealt. Without it a
     * second tap on the bank in that window counts as another crossing, and the round
     * ends after two real ones.
     */
    private landed = false;

    constructor() {
      super("crossing");
    }

    private rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

    create() {
      this.bus = this.registry.get("bus") as GameBus;
      this.offCommand = this.bus.onCommand((cmd: GameCommand) => {
        if (cmd.type === "level:set") {
          this.level = cmd.level;
          this.crossings = 0;
          this.newCrossing(true);
        } else if (cmd.type === "pause") this.scene.pause();
        else if (cmd.type === "resume") this.scene.resume();
      });

      this.drawScenery();

      this.banner = this.add
        .text(W / 2, 26, "", {
          fontFamily: "Georgia, serif",
          fontSize: "27px",
          color: INK,
        })
        .setOrigin(0.5);
      this.strip = this.add
        .text(W / 2, 54, "", {
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: "16px",
          color: "#9A8B7C",
        })
        .setOrigin(0.5);

      this.frog = this.makeFrog();

      // One gesture: tap the stone you want. Works with finger, mouse and trackpad
      // identically, and never needs a hover event.
      this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.onTap(p.worldX, p.worldY));

      this.input.keyboard?.on("keydown", (e: KeyboardEvent) => {
        if (e.key === "ArrowUp" || e.key === "w") this.hopNearestUp();
        else if (e.key === "ArrowLeft" || e.key === "a") this.slide(-1);
        else if (e.key === "ArrowRight" || e.key === "d") this.slide(1);
      });

      this.newCrossing(true);
    }

    shutdown() {
      this.offCommand?.();
    }

    private drawScenery() {
      const g = this.add.graphics();
      g.fillStyle(WATER, 1);
      g.fillRect(0, BANK_TOP_Y + 26, W, BANK_BOTTOM_Y - BANK_TOP_Y - 52);
      // Banks.
      g.fillStyle(0xe6e9d8, 1);
      g.fillRoundedRect(0, BANK_TOP_Y - 22, W, 48, 10);
      g.fillRoundedRect(0, BANK_BOTTOM_Y - 24, W, 52, 10);
      g.lineStyle(1, LINE, 1);
      g.strokeRoundedRect(0, BANK_TOP_Y - 22, W, 48, 10);
      g.strokeRoundedRect(0, BANK_BOTTOM_Y - 24, W, 52, 10);

      this.add
        .text(W / 2, BANK_TOP_Y, "SAFE", {
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          fontSize: "15px",
          color: "#7E8C6A",
        })
        .setOrigin(0.5);
    }

    private makeFrog() {
      const c = this.add.container(this.frogX, BANK_BOTTOM_Y);
      const g = this.add.graphics();
      g.fillStyle(SAGE, 1);
      g.fillCircle(0, 0, 19);
      g.fillStyle(0xfffcf7, 1);
      g.fillCircle(-7, -7, 6);
      g.fillCircle(7, -7, 6);
      g.fillStyle(0x2f2a24, 1);
      g.fillCircle(-7, -7, 2.8);
      g.fillCircle(7, -7, 2.8);
      c.add(g);
      c.setDepth(10);
      return c;
    }

    /* ------------------------------------------------------------- board */

    private newCrossing(resetRule: boolean) {
      if (resetRule) this.rule = makeRule(config.kind, this.level, this.rnd);
      this.renderBanner();

      this.rows.flat().forEach((s) => s.container.destroy());
      this.rows = [];

      for (let r = 0; r < ROW_Y.length; r++) {
        this.rows.push(this.makeRow(r));
      }

      this.frogRow = -1;
      this.frogStone = null;
      this.frogX = W / 2;
      this.landed = false;
      this.frog.setPosition(this.frogX, BANK_BOTTOM_Y);
      this.askedAt = this.time.now;
    }

    /**
     * A row is a wrap-around conveyor with a fixed stone count, not a spawner. Wrapping
     * guarantees the row always has stones on screen, so there is never a wait with no
     * move available — the failure mode that makes drifting-tile games feel broken.
     */
    private makeRow(row: number): Stone[] {
      const count = 6;
      const gap = TRACK / count;
      const stones: Stone[] = [];
      // At least two safe stones per row, so a crossing always exists.
      const safeSlots = new Set<number>();
      while (safeSlots.size < 2) safeSlots.add(this.rnd(0, count - 1));

      for (let i = 0; i < count; i++) {
        const wantOk = safeSlots.has(i) || Math.random() < 0.25;
        stones.push(this.makeStone(row, i * gap - 90, wantOk));
      }
      return stones;
    }

    private pickValue(ok: boolean): number {
      if (ok) {
        const m = this.rule.members;
        return m[this.rnd(0, m.length - 1)];
      }
      // A near miss is the useful distractor — one away from a real multiple, so she has
      // to actually check rather than pattern-match on the shape of the number.
      for (let guard = 0; guard < 40; guard++) {
        const m = this.rule.members[this.rnd(0, this.rule.members.length - 1)];
        const n = m + (Math.random() < 0.5 ? -1 : 1) * this.rnd(1, 3);
        if (n >= 2 && n <= 99 && !this.rule.ok(n)) return n;
      }
      return 97;
    }

    private makeStone(row: number, x: number, ok: boolean): Stone {
      const value = this.pickValue(ok);
      const realOk = this.rule.ok(value);
      const container = this.add.container(x, ROW_Y[row]);
      const bg = this.add.graphics();
      bg.fillStyle(PAPER, 1);
      bg.lineStyle(1, LINE, 1);
      bg.fillRoundedRect(-STONE_W / 2, -STONE_H / 2, STONE_W, STONE_H, 16);
      bg.strokeRoundedRect(-STONE_W / 2, -STONE_H / 2, STONE_W, STONE_H, 16);
      const label = this.add
        .text(0, 0, String(value), {
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: "28px",
          color: INK,
        })
        .setOrigin(0.5);
      container.add([bg, label]);
      return { container, label, bg, value, ok: realOk, x, row, sinking: false };
    }

    private renderBanner() {
      this.banner.setText(
        this.crossings < FADE_HINT ? this.rule.label : this.rule.short,
      );
      if (this.crossings < FADE_LIST) {
        this.strip.setText(this.rule.members.slice(0, 12).join("   "));
        this.strip.setAlpha(1);
      } else if (this.crossings < FADE_HINT) {
        this.strip.setText(`${this.rule.members.slice(0, 4).join("   ")}   …`);
        this.strip.setAlpha(0.6);
      } else {
        this.strip.setText("");
      }
    }

    /* ----------------------------------------------------------- movement */

    private rowOf(y: number): number {
      let best = -1;
      let bestD = Infinity;
      ROW_Y.forEach((ry, i) => {
        const d = Math.abs(ry - y);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      return bestD < 52 ? best : -2;
    }

    private frogY(): number {
      if (this.frogRow < 0) return BANK_BOTTOM_Y;
      if (this.frogRow >= ROW_Y.length) return BANK_TOP_Y;
      return ROW_Y[this.frogRow];
    }

    /** The row she may hop into: one nearer the top bank. */
    private nextRow(): number {
      return this.frogRow + 1;
    }

    private onTap(x: number, y: number) {
      if (this.hopping) return;
      const target = this.nextRow();

      // Tapping the goal bank from the last river row finishes the crossing.
      if (target >= ROW_Y.length) {
        if (y < BANK_TOP_Y + 40) this.reachBank();
        return;
      }

      const row = this.rowOf(y);
      if (row !== target) return;

      const stone = this.rows[target]
        .filter((s) => !s.sinking && Math.abs(s.container.x - x) < STONE_W)
        .sort(
          (a, b) =>
            Math.abs(a.container.x - x) - Math.abs(b.container.x - x),
        )[0];
      if (!stone) return;
      if (Math.abs(stone.container.x - this.frogX) > REACH) {
        // Out of reach: nudge rather than sink. Punishing a tap she could not have made
        // would teach her to stop tapping.
        this.tweens.add({ targets: this.frog, x: this.frogX + 8, duration: 60, yoyo: true });
        return;
      }
      this.hopTo(stone);
    }

    private hopNearestUp() {
      if (this.hopping) return;
      const target = this.nextRow();
      if (target >= ROW_Y.length) {
        this.reachBank();
        return;
      }
      const stone = this.rows[target]
        .filter((s) => !s.sinking && Math.abs(s.container.x - this.frogX) <= REACH)
        .sort(
          (a, b) =>
            Math.abs(a.container.x - this.frogX) - Math.abs(b.container.x - this.frogX),
        )[0];
      if (stone) this.hopTo(stone);
    }

    /** Shuffle along the stone you are on — or along the bank. */
    private slide(dir: number) {
      if (this.hopping || this.frogStone) return;
      this.frogX = Math.max(40, Math.min(W - 40, this.frogX + dir * 70));
      this.frog.setPosition(this.frogX, this.frogY());
    }

    private hopTo(stone: Stone) {
      this.hopping = true;
      const fromRow = this.frogRow;
      this.tweens.add({
        targets: this.frog,
        x: stone.container.x,
        y: ROW_Y[stone.row] - FROG_LIFT,
        duration: 170,
        ease: "Quad.easeOut",
        onComplete: () => {
          this.hopping = false;
          this.land(stone, fromRow);
        },
      });
    }

    private land(stone: Stone, _fromRow: number) {
      this.bus.emit({
        type: "attempt",
        prompt: {
          kind: config.kind,
          rule: this.rule.short,
          base: this.rule.base,
          target: this.rule.target,
        },
        response: { value: stone.value, ok: stone.ok },
        elapsedMs: Math.max(0, Math.round(this.time.now - this.askedAt)),
      });
      this.askedAt = this.time.now;

      if (!stone.ok) {
        this.sink(stone);
        return;
      }

      this.frogRow = stone.row;
      this.frogStone = stone;
      this.frogX = stone.container.x;
      stone.bg.setAlpha(1);
      this.tweens.add({
        targets: stone.container,
        scaleX: 1.06,
        scaleY: 1.06,
        duration: 110,
        yoyo: true,
      });
    }

    /** Free and silent. Back to the near bank, board untouched. */
    private sink(stone: Stone) {
      stone.sinking = true;
      this.frogStone = null;
      this.tweens.add({
        targets: [stone.container, this.frog],
        alpha: 0.25,
        duration: 190,
        onComplete: () => {
          stone.sinking = false;
          stone.container.setAlpha(1);
          this.frog.setAlpha(1);
          this.frogRow = -1;
          this.frogX = W / 2;
          this.frog.setPosition(this.frogX, BANK_BOTTOM_Y);
        },
      });
    }

    private reachBank() {
      if (this.landed) return;
      // Only from the last river row — you cannot tap the far bank from the near one.
      if (this.frogRow !== ROW_Y.length - 1) return;
      this.landed = true;
      this.crossings++;
      this.frogRow = ROW_Y.length;
      this.frogStone = null;
      this.frog.setPosition(this.frogX, BANK_TOP_Y);

      this.bus.emit({
        type: "round:complete",
        payload: {
          crossings: this.crossings,
          rule: this.rule.label,
          done: this.crossings >= CROSSINGS_PER_ROUND,
        },
      });

      if (this.crossings < CROSSINGS_PER_ROUND) {
        this.time.delayedCall(420, () => this.newCrossing(true));
      }
    }

    update(_t: number, delta: number) {
      const dt = delta / 1000;
      // Speed is the only difficulty knob, and it never accelerates within a crossing.
      const base = 34 + this.level * 5;

      this.rows.forEach((stones, row) => {
        const dir = row % 2 === 0 ? 1 : -1;
        const speed = base * (1 + row * 0.08) * dir;
        for (const s of stones) {
          s.container.x += speed * dt;
          if (s.container.x > TRACK - 90) s.container.x -= TRACK;
          else if (s.container.x < -90) s.container.x += TRACK;
        }
      });

      // Ride the stone you are standing on.
      if (this.frogStone && !this.hopping) {
        this.frogX = this.frogStone.container.x;
        this.frog.setPosition(this.frogX, ROW_Y[this.frogStone.row] - FROG_LIFT);
        // Carried off the edge — same free reset as a sink.
        if (this.frogX < -20 || this.frogX > W + 20) {
          const s = this.frogStone;
          this.frogStone = null;
          this.sink(s);
        }
      }
    }
  };
}

export const CROSSING_SIZE = { W, H };
